import { sql } from "../config/db.js";

// Get all carts
export const getCarts = async (req, res) => {
  try {
    const carts = await sql`
      SELECT * FROM cart
      ORDER BY cart_id DESC
    `;
    console.log("fetched carts", carts);
    res.status(200).json({ success: true, data: carts });
  } catch (error) {
    console.log("Error in getCarts function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get cart by ID
export const getCart = async (req, res) => {
  const { id } = req.params;

  try {
    const cart = await sql`
      SELECT c.cart_id, c.user_id, p.product_id, p.product_name, ct.quantity, p.price
      FROM cart c
      LEFT JOIN contains ct ON c.cart_id = ct.cart_id
      LEFT JOIN product p ON ct.product_id = p.product_id
      WHERE c.cart_id = ${id}
    `;

    if (cart.length === 0) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.log("Error in getCart function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create new cart
export const createCart = async (req, res) => {
  const { cart_id, user_id } = req.body;

  if (!cart_id || !user_id) {
    return res.status(400).json({ success: false, message: "Cart ID and User ID are required" });
  }

  try {
    const newCart = await sql`
      INSERT INTO cart (cart_id, user_id)
      VALUES (${cart_id}, ${user_id})
      RETURNING *
    `;

    res.status(201).json({ success: true, data: newCart[0] });
  } catch (error) {
    console.log("Error in createCart function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Add product to cart
export const addToCart = async (req, res) => {
  const { cart_id, product_id, quantity } = req.body;

  if (!cart_id || !product_id || !quantity) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    const cartItem = await sql`
      INSERT INTO contains (cart_id, product_id, quantity)
      VALUES (${cart_id}, ${product_id}, ${quantity})
      ON CONFLICT (cart_id, product_id) 
      DO UPDATE SET quantity = contains.quantity + ${quantity}
      RETURNING *
    `;

    res.status(201).json({ success: true, data: cartItem[0] });
  } catch (error) {
    console.log("Error in addToCart function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Remove product from cart
export const removeFromCart = async (req, res) => {
  const { cart_id, product_id } = req.body;

  if (!cart_id || !product_id) {
    return res.status(400).json({ success: false, message: "Cart ID and Product ID are required" });
  }

  try {
    const deletedItem = await sql`
      DELETE FROM contains
      WHERE cart_id = ${cart_id} AND product_id = ${product_id}
      RETURNING *
    `;

    if (deletedItem.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    res.status(200).json({ success: true, message: "Item removed from cart" });
  } catch (error) {
    console.log("Error in removeFromCart function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete cart
export const deleteCart = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedCart = await sql`
      DELETE FROM cart
      WHERE cart_id = ${id}
      RETURNING *
    `;

    if (deletedCart.length === 0) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    res.status(200).json({ success: true, message: "Cart deleted successfully" });
  } catch (error) {
    console.log("Error in deleteCart function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
