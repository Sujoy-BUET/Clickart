import { sql } from "../config/db.js";

const ARCHIVED_SELLER_NAME = "__archived_seller__";

const ensureProductCouponSchema = async () => {
  await sql`
    ALTER TABLE Coupon ADD COLUMN IF NOT EXISTS seller_id INT
  `;
  await sql`
    ALTER TABLE Coupon ADD COLUMN IF NOT EXISTS coupon_name VARCHAR(120)
  `;
  await sql`
    ALTER TABLE Coupon ADD COLUMN IF NOT EXISTS applies_all_products BOOLEAN DEFAULT TRUE
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS Coupon_Product (
      coupon_id INT NOT NULL,
      product_id INT NOT NULL,
      PRIMARY KEY (coupon_id, product_id),
      FOREIGN KEY (coupon_id) REFERENCES Coupon(coupon_id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE
    )
  `;
};

const getVerifiedSeller = async (sellerId) => {
  const normalizedSellerId = Number(sellerId);
  if (Number.isNaN(normalizedSellerId) || normalizedSellerId <= 0) {
    return null;
  }

  const sellerRows = await sql`
    SELECT seller_id, is_verified
    FROM Sellers
    WHERE seller_id = ${normalizedSellerId}
    LIMIT 1
  `;

  return sellerRows[0] || null;
};

const resolveCategoryId = async ({ category_id, category_name }) => {
  if (category_id) {
    return Number(category_id);
  }

  if (!category_name || !String(category_name).trim()) {
    return null;
  }

  const normalizedCategoryName = String(category_name).trim();
  const existingCategory = await sql`
    SELECT category_id
    FROM Category
    WHERE LOWER(TRIM(category_name)) = LOWER(${normalizedCategoryName})
    LIMIT 1
  `;

  if (existingCategory.length > 0) {
    return existingCategory[0].category_id;
  }

  const createdCategory = await sql`
    INSERT INTO Category (category_name)
    VALUES (${normalizedCategoryName})
    RETURNING category_id
  `;

  return createdCategory[0].category_id;
};

const resolveBrandId = async ({ brand_id, brand_name }) => {
  if (brand_id) {
    return Number(brand_id);
  }

  if (!brand_name || !String(brand_name).trim()) {
    return null;
  }

  const normalizedBrandName = String(brand_name).trim();
  const existingBrand = await sql`
    SELECT brand_id
    FROM Brand
    WHERE LOWER(TRIM(brand_name)) = LOWER(${normalizedBrandName})
    LIMIT 1
  `;

  if (existingBrand.length > 0) {
    return existingBrand[0].brand_id;
  }

  const createdBrand = await sql`
    INSERT INTO Brand (brand_name)
    VALUES (${normalizedBrandName})
    RETURNING brand_id
  `;

  return createdBrand[0].brand_id;
};

const resolveVariationId = async ({ variation_id, variation_type, variation_value }) => {
  if (variation_id) {
    return Number(variation_id);
  }

  if (!variation_type || !variation_value) {
    return null;
  }

  const normalizedType = String(variation_type).trim();
  const normalizedValue = String(variation_value).trim();

  if (!normalizedType || !normalizedValue) {
    return null;
  }

  const existingType = await sql`
    SELECT variation_type_id
    FROM VariationType
    WHERE LOWER(TRIM(variation_type_name)) = LOWER(${normalizedType})
    LIMIT 1
  `;

  let variationTypeId;
  if (existingType.length > 0) {
    variationTypeId = existingType[0].variation_type_id;
  } else {
    const createdType = await sql`
      INSERT INTO VariationType (variation_type_name)
      VALUES (${normalizedType})
      RETURNING variation_type_id
    `;
    variationTypeId = createdType[0].variation_type_id;
  }

  const exactValue = await sql`
    SELECT variation_id
    FROM Variation
    WHERE variation_type_id = ${variationTypeId}
      AND TRIM(variation_value) = ${normalizedValue}
    LIMIT 1
  `;

  if (exactValue.length > 0) {
    return exactValue[0].variation_id;
  }

  const existingValue = await sql`
    SELECT variation_id
    FROM Variation
    WHERE variation_type_id = ${variationTypeId}
      AND LOWER(TRIM(variation_value)) = LOWER(${normalizedValue})
    LIMIT 1
  `;

  if (existingValue.length > 0) {
    const resolvedVariationId = existingValue[0].variation_id;

    // Keep the canonical stored value aligned with the latest seller-entered casing.
    await sql`
      UPDATE Variation
      SET variation_value = ${normalizedValue}
      WHERE variation_id = ${resolvedVariationId}
    `;

    return resolvedVariationId;
  }

  const createdValue = await sql`
    INSERT INTO Variation (variation_type_id, variation_value)
    VALUES (${variationTypeId}, ${normalizedValue})
    RETURNING variation_id
  `;

  return createdValue[0].variation_id;
};

const resolveVariationRows = async ({ variations, basePrice, baseStock }) => {
  if (!Array.isArray(variations)) {
    return { resolved: [] };
  }

  const resolved = [];
  const seenVariationIds = new Set();

  for (let index = 0; index < variations.length; index += 1) {
    const item = variations[index] || {};
    const type = String(item.variation_type || "").trim();
    const value = String(item.variation_value || "").trim();

    if (!type || !value) {
      return { error: `Variation row ${index + 1}: both variation_type and variation_value are required` };
    }

    const variationId = await resolveVariationId({
      variation_id: item.variation_id,
      variation_type: type,
      variation_value: value,
    });

    if (!variationId) {
      return { error: `Variation row ${index + 1}: invalid variation input` };
    }

    if (seenVariationIds.has(variationId)) {
      return { error: `Variation row ${index + 1}: duplicate variation combination` };
    }

    const variationPrice = item?.price === undefined || item?.price === null || item?.price === ""
      ? Number(basePrice)
      : Number(item.price);
    const variationStock = item?.stock_quantity === undefined || item?.stock_quantity === null || item?.stock_quantity === ""
      ? Number(baseStock)
      : Number(item.stock_quantity);

    if (Number.isNaN(variationPrice) || Number.isNaN(variationStock) || variationStock < 0) {
      return { error: `Variation row ${index + 1}: invalid price or stock_quantity` };
    }

    seenVariationIds.add(variationId);
    resolved.push({ variationId, variationPrice, variationStock });
  }

  return { resolved };
};

// Get all products (with brand, category, seller info)
export const getProducts = async (req, res) => {
  const { category } = req.query;

  try {
    let products;

    if (category) {
      products = await sql`
        SELECT p.*, b.brand_name, c.category_name, s.store_name,
               COALESCE(rs.review_count, 0) AS review_count,
               COALESCE(rs.average_rating, 0) AS average_rating,
               COALESCE(vs.min_variation_price, p.price) AS display_price,
               CASE 
                 WHEN COALESCE(vs.has_variation, false) THEN COALESCE(vs.has_stock, false)
                 ELSE p.stock_quantity > 0
               END AS in_stock
        FROM product p
        JOIN brand b    ON p.brand_id    = b.brand_id
        JOIN category c ON p.category_id = c.category_id
        JOIN sellers s  ON p.seller_id   = s.seller_id
        LEFT JOIN (
          SELECT rp.product_id,
                 COUNT(*)::INT AS review_count,
                 ROUND(AVG(r.rating)::numeric, 1) AS average_rating
          FROM review r
          JOIN review_product rp ON rp.review_id = r.review_id
          GROUP BY rp.product_id
        ) rs ON rs.product_id = p.product_id
        LEFT JOIN (
          SELECT pv.product_id,
                 true as has_variation,
                 BOOL_OR(pv.stock_quantity > 0) AS has_stock,
                 MIN(pv.price) AS min_variation_price
          FROM Product_Variation pv
          GROUP BY pv.product_id
        ) vs ON vs.product_id = p.product_id
        WHERE (c.category_name ILIKE ${category} OR c.category_id::text = ${category})
          AND s.seller_name <> ${ARCHIVED_SELLER_NAME}
        ORDER BY p.product_id DESC
      `;
    } else {
      products = await sql`
        SELECT p.*, b.brand_name, c.category_name, s.store_name,
               COALESCE(rs.review_count, 0) AS review_count,
               COALESCE(rs.average_rating, 0) AS average_rating,
               COALESCE(vs.min_variation_price, p.price) AS display_price,
               CASE 
                 WHEN COALESCE(vs.has_variation, false) THEN COALESCE(vs.has_stock, false)
                 ELSE p.stock_quantity > 0
               END AS in_stock
        FROM product p
        JOIN brand b    ON p.brand_id    = b.brand_id
        JOIN category c ON p.category_id = c.category_id
        JOIN sellers s  ON p.seller_id   = s.seller_id
        LEFT JOIN (
          SELECT rp.product_id,
                 COUNT(*)::INT AS review_count,
                 ROUND(AVG(r.rating)::numeric, 1) AS average_rating
          FROM review r
          JOIN review_product rp ON rp.review_id = r.review_id
          GROUP BY rp.product_id
        ) rs ON rs.product_id = p.product_id
        LEFT JOIN (
          SELECT pv.product_id,
                 true as has_variation,
                 BOOL_OR(pv.stock_quantity > 0) AS has_stock,
                 MIN(pv.price) AS min_variation_price
          FROM Product_Variation pv
          GROUP BY pv.product_id
        ) vs ON vs.product_id = p.product_id
        WHERE s.seller_name <> ${ARCHIVED_SELLER_NAME}
        ORDER BY p.product_id DESC
      `;
    }

    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get all categories
export const getCategories = async (_req, res) => {
  try {
    const categories = await sql`
      SELECT category_id, category_name
      FROM Category
      ORDER BY category_name ASC
    `;

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get single product (with variations)
export const getProduct = async (req, res) => {
  const { id } = req.params;

  try {
    await ensureProductCouponSchema();

    const product = await sql`
      SELECT p.*, b.brand_name, c.category_name, s.store_name,
             CASE 
               WHEN COALESCE(vs.has_variation, false) THEN COALESCE(vs.has_stock, false)
               ELSE p.stock_quantity > 0
             END AS in_stock
      FROM product p
      JOIN brand b    ON p.brand_id    = b.brand_id
      JOIN category c ON p.category_id = c.category_id
      JOIN sellers s  ON p.seller_id   = s.seller_id
      LEFT JOIN (
        SELECT pv.product_id,
               true as has_variation,
               BOOL_OR(pv.stock_quantity > 0) AS has_stock
        FROM Product_Variation pv
        GROUP BY pv.product_id
      ) vs ON vs.product_id = p.product_id
      WHERE p.product_id = ${id}
    `;

    if (product.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const variations = await sql`
      SELECT pv.product_variation_id, pv.price, pv.stock_quantity,
             vt.variation_type_name AS variation_type, v.variation_value
      FROM Product_Variation pv
      JOIN Variation v      ON pv.variation_id      = v.variation_id
      JOIN VariationType vt ON v.variation_type_id   = vt.variation_type_id
      WHERE pv.product_id = ${id}
      ORDER BY pv.product_variation_id ASC
    `;

    const coupons = await sql`
      SELECT c.coupon_id, c.coupon_name, c.code, c.description,
             c.discount_type, c.discount_value, c.max_discount_amount,
             c.min_order_amount, c.start_date, c.end_date, c.applies_all_products
      FROM Coupon c
      LEFT JOIN Coupon_Product cp ON cp.coupon_id = c.coupon_id
      WHERE c.seller_id = ${product[0].seller_id}
        AND c.is_active = TRUE
        AND CURRENT_DATE BETWEEN c.start_date AND c.end_date
        AND (
          c.applies_all_products = TRUE
          OR cp.product_id = ${id}
        )
      GROUP BY c.coupon_id
      ORDER BY c.coupon_id DESC
    `;

    res.status(200).json({ success: true, data: { ...product[0], variations, coupons } });
  } catch (error) {
    console.error("Error in getProduct:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create product (supports custom category and random variations)
export const createProduct = async (req, res) => {
  const {
    product_name,
    description,
    price,
    stock_quantity,
    product_image,
    seller_id,
    category_id,
    category_name,
    brand_id,
    brand_name,
    variations,
  } = req.body;

  if (!product_name || !seller_id || (!brand_id && !brand_name)) {
    return res.status(400).json({
      success: false,
      message: "product_name, seller_id and either brand_id or brand_name are required",
    });
  }

  try {
    const seller = await getVerifiedSeller(seller_id);
    if (!seller) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    if (!seller.is_verified) {
      return res.status(403).json({ success: false, message: "Seller is not verified. Product listing is blocked." });
    }

    const resolvedCategoryId = await resolveCategoryId({ category_id, category_name });
    const resolvedBrandId = await resolveBrandId({ brand_id, brand_name });
    if (!resolvedCategoryId) {
      return res.status(400).json({
        success: false,
        message: "Either category_id or category_name is required",
      });
    }

    if (!resolvedBrandId) {
      return res.status(400).json({
        success: false,
        message: "Either brand_id or brand_name is required",
      });
    }

    const basePrice = Number(price);
    const baseStock = stock_quantity === undefined || stock_quantity === null || stock_quantity === ""
      ? 0
      : Number(stock_quantity);

    if (Number.isNaN(basePrice)) {
      return res.status(400).json({ success: false, message: "Valid price is required" });
    }

    if (Number.isNaN(baseStock) || baseStock < 0) {
      return res.status(400).json({ success: false, message: "Invalid stock_quantity" });
    }

    const newProduct = await sql`
      INSERT INTO Product (product_name, description, price, stock_quantity, product_image, seller_id, category_id, brand_id)
      VALUES (${String(product_name).trim()}, ${description ?? null}, ${basePrice}, ${baseStock}, ${product_image ?? null}, ${seller_id}, ${resolvedCategoryId}, ${resolvedBrandId})
      RETURNING *
    `;

    const createdProduct = newProduct[0];

    if (Array.isArray(variations) && variations.length > 0) {
      const variationResolution = await resolveVariationRows({ variations, basePrice, baseStock });
      if (variationResolution.error) {
        return res.status(400).json({ success: false, message: variationResolution.error });
      }

      for (const item of variationResolution.resolved) {
        await sql`
          INSERT INTO Product_Variation (product_id, variation_id, price, stock_quantity)
          VALUES (${createdProduct.product_id}, ${item.variationId}, ${item.variationPrice}, ${item.variationStock})
          ON CONFLICT (product_id, variation_id)
          DO UPDATE SET
            price = EXCLUDED.price,
            stock_quantity = EXCLUDED.stock_quantity
        `;
      }
    }

    res.status(201).json({ success: true, data: createdProduct });
  } catch (error) {
    console.error("Error in createProduct:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error?.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { product_name, description, price, stock_quantity, product_image, seller_id, category_id, category_name, brand_id, brand_name, variations } = req.body;

  try {
    const hasProductName = product_name !== undefined;
    const hasDescription = description !== undefined;
    const hasPrice = price !== undefined;
    const hasStockQuantity = stock_quantity !== undefined;
    const hasProductImage = product_image !== undefined;
    const hasSellerId = seller_id !== undefined;

    const normalizedProductName = hasProductName ? String(product_name ?? "").trim() : null;
    const normalizedDescription = hasDescription ? (String(description ?? "").trim() || null) : null;
    const normalizedProductImage = hasProductImage ? (String(product_image ?? "").trim() || null) : null;
    const normalizedPrice = hasPrice ? Number(price) : null;
    const normalizedStockQuantity = hasStockQuantity ? Number(stock_quantity) : null;
    const normalizedSellerId = hasSellerId ? Number(seller_id) : null;

    if (hasProductName && !normalizedProductName) {
      return res.status(400).json({ success: false, message: "product_name cannot be empty" });
    }

    if (hasPrice && (Number.isNaN(normalizedPrice) || normalizedPrice < 0)) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }

    if (hasStockQuantity && (Number.isNaN(normalizedStockQuantity) || normalizedStockQuantity < 0 || !Number.isInteger(normalizedStockQuantity))) {
      return res.status(400).json({ success: false, message: "Invalid stock_quantity" });
    }

    if (hasSellerId && (Number.isNaN(normalizedSellerId) || normalizedSellerId <= 0)) {
      return res.status(400).json({ success: false, message: "Invalid seller_id" });
    }

    const targetSellerRows = await sql`
      SELECT seller_id
      FROM Product
      WHERE product_id = ${id}
      LIMIT 1
    `;

    if (targetSellerRows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const targetSellerId = hasSellerId ? normalizedSellerId : Number(targetSellerRows[0].seller_id);
    const seller = await getVerifiedSeller(targetSellerId);

    if (!seller) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    if (!seller.is_verified) {
      return res.status(403).json({ success: false, message: "Seller is not verified. Product update is blocked." });
    }

    let resolvedCategoryId = null;
    let resolvedBrandId = null;

    if (category_id || category_name) {
      resolvedCategoryId = await resolveCategoryId({ category_id, category_name });
      if (!resolvedCategoryId) {
        return res.status(400).json({ success: false, message: "Invalid category input" });
      }
    }

    if (brand_id || brand_name) {
      resolvedBrandId = await resolveBrandId({ brand_id, brand_name });
      if (!resolvedBrandId) {
        return res.status(400).json({ success: false, message: "Invalid brand input" });
      }
    }

    const updated = await sql`
      UPDATE Product
      SET product_name   = CASE WHEN ${hasProductName} THEN ${normalizedProductName} ELSE product_name END,
          description    = CASE WHEN ${hasDescription} THEN ${normalizedDescription} ELSE description END,
          price          = CASE WHEN ${hasPrice} THEN ${normalizedPrice} ELSE price END,
          stock_quantity = CASE WHEN ${hasStockQuantity} THEN ${normalizedStockQuantity} ELSE stock_quantity END,
          product_image  = CASE WHEN ${hasProductImage} THEN ${normalizedProductImage} ELSE product_image END,
          seller_id      = CASE WHEN ${hasSellerId} THEN ${normalizedSellerId} ELSE seller_id END,
          category_id    = COALESCE(${resolvedCategoryId ?? null}, category_id),
          brand_id       = COALESCE(${resolvedBrandId ?? null}, brand_id)
      WHERE product_id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // If variations are provided in update payload, sync them with Product_Variation.
    if (Array.isArray(variations)) {
      const basePrice = Number(updated[0].price);
      const baseStock = Number(updated[0].stock_quantity);
      const variationResolution = await resolveVariationRows({ variations, basePrice, baseStock });

      if (variationResolution.error) {
        return res.status(400).json({ success: false, message: variationResolution.error });
      }

      const syncedVariationIds = [];

      for (const item of variationResolution.resolved) {
        await sql`
          INSERT INTO Product_Variation (product_id, variation_id, price, stock_quantity)
          VALUES (${id}, ${item.variationId}, ${item.variationPrice}, ${item.variationStock})
          ON CONFLICT (product_id, variation_id)
          DO UPDATE SET
            price = EXCLUDED.price,
            stock_quantity = EXCLUDED.stock_quantity
        `;

        syncedVariationIds.push(item.variationId);
      }

      if (syncedVariationIds.length > 0) {
        const existingRows = await sql`
          SELECT variation_id
          FROM Product_Variation
          WHERE product_id = ${id}
        `;

        const toDeleteIds = existingRows
          .map((row) => Number(row.variation_id))
          .filter((variationId) => !syncedVariationIds.includes(variationId));

        for (const variationId of toDeleteIds) {
          await sql`
            DELETE FROM Product_Variation
            WHERE product_id = ${id}
              AND variation_id = ${variationId}
          `;
        }
      } else {
        await sql`
          DELETE FROM Product_Variation
          WHERE product_id = ${id}
        `;
      }
    }

    res.status(200).json({ success: true, data: updated[0] });
  } catch (error) {
    console.error("Error in updateProduct:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await sql`
      DELETE FROM Product WHERE product_id = ${id} RETURNING *
    `;

    if (deleted.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, data: deleted[0] });
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Add variation to product (supports random variation type/value)
export const addProductVariation = async (req, res) => {
  const { id } = req.params;
  const { variation_id, variation_type, variation_value, price, stock_quantity } = req.body;

  try {
    const sellerLookup = await sql`
      SELECT p.seller_id
      FROM Product p
      WHERE p.product_id = ${id}
      LIMIT 1
    `;

    if (sellerLookup.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const seller = await getVerifiedSeller(sellerLookup[0].seller_id);
    if (!seller) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    if (!seller.is_verified) {
      return res.status(403).json({ success: false, message: "Seller is not verified. Product variation update is blocked." });
    }

    const resolvedVariationId = await resolveVariationId({ variation_id, variation_type, variation_value });

    if (!resolvedVariationId) {
      return res.status(400).json({
        success: false,
        message: "Provide variation_id or both variation_type and variation_value",
      });
    }

    const baseProduct = await sql`
      SELECT price, stock_quantity
      FROM Product
      WHERE product_id = ${id}
      LIMIT 1
    `;

    if (baseProduct.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const finalPrice = price ?? baseProduct[0].price;
    const finalStock = stock_quantity ?? baseProduct[0].stock_quantity;

    const pv = await sql`
      INSERT INTO product_variation (product_id, variation_id, price, stock_quantity)
      VALUES (${id}, ${resolvedVariationId}, ${finalPrice}, ${finalStock})
      ON CONFLICT (product_id, variation_id)
      DO UPDATE SET
        price = EXCLUDED.price,
        stock_quantity = EXCLUDED.stock_quantity
      RETURNING *
    `;

    res.status(201).json({ success: true, data: pv[0] });
  } catch (error) {
    console.error("Error in addProductVariation:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};