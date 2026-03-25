import { sql } from "../config/db.js";

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

// Create product
export const createProduct = async (req, res) => {
  const { product_name, description, price, stock_quantity, product_image, seller_id, category_id, brand_id } = req.body;

  try {
    const newProduct = await sql`
      INSERT INTO Product (product_name, description, price, stock_quantity, product_image, seller_id, category_id, brand_id)
      VALUES (${product_name}, ${description ?? null}, ${price}, ${stock_quantity}, ${product_image ?? null}, ${seller_id}, ${category_id}, ${brand_id})
      RETURNING *
    `;

    res.status(201).json({ success: true, data: newProduct[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { product_name, description, price, stock_quantity, product_image, seller_id, category_id, brand_id } = req.body;

  try {
    const updated = await sql`
      UPDATE Product
      SET product_name   = COALESCE(${product_name ?? null}, product_name),
          description    = COALESCE(${description ?? null}, description),
          price          = COALESCE(${price ?? null}, price),
          stock_quantity = COALESCE(${stock_quantity ?? null}, stock_quantity),
          product_image  = COALESCE(${product_image ?? null}, product_image),
          seller_id      = COALESCE(${seller_id ?? null}, seller_id),
          category_id    = COALESCE(${category_id ?? null}, category_id),
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

// Add variation to product
export const addProductVariation = async (req, res) => {
  const { id } = req.params;
  const { variation_id, price, stock_quantity } = req.body;

  if (!variation_id) {
    return res.status(400).json({ success: false, message: "variation_id is required" });
  }

  try {
    const pv = await sql`
      INSERT INTO product_variation (product_id, variation_id, price, stock_quantity)
      VALUES (${id}, ${variation_id}, ${price ?? null}, ${stock_quantity ?? null})
      RETURNING *
    `;

    res.status(201).json({ success: true, data: pv[0] });
  } catch (error) {
    console.error("Error in addProductVariation:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};