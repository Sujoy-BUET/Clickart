import { sql } from "../config/db.js";

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

  const existingValue = await sql`
    SELECT variation_id
    FROM Variation
    WHERE variation_type_id = ${variationTypeId}
      AND LOWER(TRIM(variation_value)) = LOWER(${normalizedValue})
    LIMIT 1
  `;

  if (existingValue.length > 0) {
    return existingValue[0].variation_id;
  }

  const createdValue = await sql`
    INSERT INTO Variation (variation_type_id, variation_value)
    VALUES (${variationTypeId}, ${normalizedValue})
    RETURNING variation_id
  `;

  return createdValue[0].variation_id;
};

// Get all products (with brand, category, seller info)
export const getProducts = async (req, res) => {
  const { category } = req.query;

  try {
    let products;

    if (category) {
      products = await sql`
        SELECT p.*, b.brand_name, c.category_name, s.store_name
        FROM product p
        JOIN brand b    ON p.brand_id    = b.brand_id
        JOIN category c ON p.category_id = c.category_id
        JOIN sellers s  ON p.seller_id   = s.seller_id
        WHERE c.category_name ILIKE ${category} OR c.category_id::text = ${category}
        ORDER BY p.product_id DESC
      `;
    } else {
      products = await sql`
        SELECT p.*, b.brand_name, c.category_name, s.store_name
        FROM product p
        JOIN brand b    ON p.brand_id    = b.brand_id
        JOIN category c ON p.category_id = c.category_id
        JOIN sellers s  ON p.seller_id   = s.seller_id
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
    const product = await sql`
      SELECT p.*, b.brand_name, c.category_name, s.store_name
      FROM product p
      JOIN brand b    ON p.brand_id    = b.brand_id
      JOIN category c ON p.category_id = c.category_id
      JOIN sellers s  ON p.seller_id   = s.seller_id
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
    `;

    res.status(200).json({ success: true, data: { ...product[0], variations } });
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
    variations,
  } = req.body;

  if (!product_name || !seller_id || !brand_id) {
    return res.status(400).json({
      success: false,
      message: "product_name, seller_id and brand_id are required",
    });
  }

  try {
    const resolvedCategoryId = await resolveCategoryId({ category_id, category_name });
    if (!resolvedCategoryId) {
      return res.status(400).json({
        success: false,
        message: "Either category_id or category_name is required",
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
      VALUES (${String(product_name).trim()}, ${description ?? null}, ${basePrice}, ${baseStock}, ${product_image ?? null}, ${seller_id}, ${resolvedCategoryId}, ${brand_id})
      RETURNING *
    `;

    const createdProduct = newProduct[0];

    if (Array.isArray(variations) && variations.length > 0) {
      for (const item of variations) {
        const variationId = await resolveVariationId(item);

        if (!variationId) {
          continue;
        }

        const variationPrice = item?.price === undefined || item?.price === null || item?.price === ""
          ? basePrice
          : Number(item.price);
        const variationStock = item?.stock_quantity === undefined || item?.stock_quantity === null || item?.stock_quantity === ""
          ? baseStock
          : Number(item.stock_quantity);

        if (Number.isNaN(variationPrice) || (variationStock !== null && Number.isNaN(variationStock))) {
          continue;
        }

        await sql`
          INSERT INTO Product_Variation (product_id, variation_id, price, stock_quantity)
          VALUES (${createdProduct.product_id}, ${variationId}, ${variationPrice}, ${variationStock})
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
  const { product_name, description, price, stock_quantity, product_image, seller_id, category_id, category_name, brand_id } = req.body;

  try {
    let resolvedCategoryId = null;
    if (category_id || category_name) {
      resolvedCategoryId = await resolveCategoryId({ category_id, category_name });
      if (!resolvedCategoryId) {
        return res.status(400).json({ success: false, message: "Invalid category input" });
      }
    }

    const updated = await sql`
      UPDATE Product
      SET product_name   = COALESCE(${product_name ?? null}, product_name),
          description    = COALESCE(${description ?? null}, description),
          price          = COALESCE(${price ?? null}, price),
          stock_quantity = COALESCE(${stock_quantity ?? null}, stock_quantity),
          product_image  = COALESCE(${product_image ?? null}, product_image),
          seller_id      = COALESCE(${seller_id ?? null}, seller_id),
          category_id    = COALESCE(${resolvedCategoryId ?? null}, category_id),
          brand_id       = COALESCE(${brand_id ?? null}, brand_id)
      WHERE product_id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
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