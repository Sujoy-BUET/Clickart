import { sql } from "../config/db.js";

export const getProducts = async (req, res) => {
  try {
    const products = await sql`
      SELECT * FROM product
      ORDER BY product_id DESC
    `;
    console.log("fetched products", products);
    
    if (!products) {
      return res.status(200).json({ success: true, data: [] });
    }
    
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.log("Error in getProducts function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const createProduct = async (req, res) => {
  const { product_id, product_name, description, price, stock_quantity ,product_image,seller_id,category_id,brand_id} = req.body;

  if (!product_id || !product_name || !price || !stock_quantity || !seller_id || !category_id || !brand_id) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    const newProduct = await sql`
      INSERT INTO product(product_id,product_name,description,price,stock_quantity,product_image,seller_id,category_id,brand_id)
      VALUES (${product_id},${product_name},${description},${price},${stock_quantity},${product_image},${seller_id},${category_id},${brand_id})
      RETURNING *
    `;

    res.status(201).json({ success: true, data: newProduct[0] });
  } catch (error) {
    console.log("Error in createProduct function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await sql`
     SELECT * FROM product WHERE product_id=${id}
    `;

    if (!product || product.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, data: product[0] });
  } catch (error) {
    console.log("Error in getProduct function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {product_id, product_name, description, price, stock_quantity ,product_image,seller_id,category_id,brand_id } = req.body;

  try {
    const updateProduct = await sql`
      UPDATE product
      SET product_id=${product_id}, product_name=${product_name}, price=${price},
      description=${description}, product_image=${product_image}, stock_quantity=${stock_quantity}, 
      seller_id=${seller_id}, category_id=${category_id}, brand_id=${brand_id}
      WHERE product_id=${id}
      RETURNING *
    `;

    if (updateProduct.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    res.status(200).json({ success: true, data: updateProduct[0] });
  } catch (error) {
    console.log("Error in updateProduct function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedProduct = await sql`
      DELETE FROM product WHERE product_id=${id} RETURNING *
    `;

    if (deletedProduct.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    res.status(200).json({ success: true, data: deletedProduct[0] });
  } catch (error) {
    console.log("Error in deleteProduct function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};