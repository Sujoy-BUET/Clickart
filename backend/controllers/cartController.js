import { sql } from "../config/db.js";

// Get all carts
export const getCarts = async (req, res) => {
  try {
    const carts = await sql`
      SELECT * FROM Cart ORDER BY cart_id DESC
    `;
    res.status(200).json({ success: true, data: carts });
  } catch (error) {
    console.error("Error in getCarts:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get cart by ID (with product-variation details)
export const getCart = async (req, res) => {
  const { id } = req.params;

  try {
    const cart = await sql`
      SELECT c.cart_id, c.user_id,
             ct.product_variation_id, ct.quantity,
             pv.price   AS variation_price,
             pv.stock_quantity AS variation_stock,
             p.product_id, p.product_name, p.product_image,
             vt.variation_type_name, v.variation_value
      FROM Cart c
      LEFT JOIN Contains ct        ON c.cart_id                = ct.cart_id
      LEFT JOIN Product_Variation pv ON ct.product_variation_id = pv.product_variation_id
      LEFT JOIN Product p          ON pv.product_id            = p.product_id
      LEFT JOIN Variation v        ON pv.variation_id           = v.variation_id
      LEFT JOIN VariationType vt   ON v.variation_type_id       = vt.variation_type_id
      WHERE c.cart_id = ${id}
    `;

    if (cart.length === 0) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.error("Error in getCart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create new cart
export const createCart = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id is required" });
  }

  try {
    const newCart = await sql`
      INSERT INTO Cart (user_id)
      VALUES (${user_id})
      RETURNING *
    `;

    res.status(201).json({ success: true, data: newCart[0] });
  } catch (error) {
    console.error("Error in createCart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Add product variation to cart
export const addToCart = async (req, res) => {
  const { cart_id, product_variation_id, quantity } = req.body;

  if (!cart_id || !product_variation_id || !quantity) {
    return res.status(400).json({ success: false, message: "cart_id, product_variation_id, and quantity are required" });
  }

  try {
    const cartItem = await sql`
      INSERT INTO Contains (cart_id, product_variation_id, quantity)
      VALUES (${cart_id}, ${product_variation_id}, ${quantity})
      ON CONFLICT (cart_id, product_variation_id)
      DO UPDATE SET quantity = Contains.quantity + ${quantity}
      RETURNING *
    `;

    res.status(201).json({ success: true, data: cartItem[0] });
  } catch (error) {
    console.error("Error in addToCart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Remove product variation from cart
export const removeFromCart = async (req, res) => {
  const { cart_id, product_variation_id } = req.body;

  if (!cart_id || !product_variation_id) {
    return res.status(400).json({ success: false, message: "cart_id and product_variation_id are required" });
  }

  try {
    const deleted = await sql`
      DELETE FROM Contains
      WHERE cart_id = ${cart_id} AND product_variation_id = ${product_variation_id}
      RETURNING *
    `;

    if (deleted.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    res.status(200).json({ success: true, message: "Item removed from cart" });
  } catch (error) {
    console.error("Error in removeFromCart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete cart
export const deleteCart = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await sql`
      DELETE FROM Cart WHERE cart_id = ${id} RETURNING *
    `;

    if (deleted.length === 0) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    res.status(200).json({ success: true, message: "Cart deleted successfully" });
  } catch (error) {
    console.error("Error in deleteCart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
