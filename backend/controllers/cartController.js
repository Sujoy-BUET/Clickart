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
             pv.price   AS price,
             pv.stock_quantity,
             p.product_id, p.product_name, p.product_image,
             vt.variation_type_name AS variation_type, v.variation_value
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

// Get an existing cart by user or create one if missing
export const getOrCreateCartByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const existing = await sql`
      SELECT cart_id, user_id
      FROM Cart
      WHERE user_id = ${userId}
      ORDER BY cart_id ASC
      LIMIT 1
    `;

    if (existing.length > 0) {
      return res.status(200).json({ success: true, data: existing[0] });
    }

    const created = await sql`
      INSERT INTO Cart (user_id)
      VALUES (${userId})
      RETURNING cart_id, user_id
    `;

    return res.status(201).json({ success: true, data: created[0] });
  } catch (error) {
    console.error("Error in getOrCreateCartByUser:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
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

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ success: false, message: "quantity must be a positive integer" });
  }

  try {
    const variation = await sql`
      SELECT stock_quantity
      FROM Product_Variation
      WHERE product_variation_id = ${product_variation_id}
    `;

    if (variation.length === 0) {
      return res.status(404).json({ success: false, message: "Product variation not found" });
    }

    const existing = await sql`
      SELECT quantity
      FROM Contains
      WHERE cart_id = ${cart_id} AND product_variation_id = ${product_variation_id}
    `;

    const currentQty = Number(existing[0]?.quantity || 0);
    const nextQty = currentQty + qty;
    const stockQty = Number(variation[0].stock_quantity ?? 0);

    if (nextQty > stockQty) {
      return res.status(400).json({
        success: false,
        message: `Only ${stockQty} item(s) available in stock for this variation`,
      });
    }

    const cartItem = await sql`
      INSERT INTO Contains (cart_id, product_variation_id, quantity)
      VALUES (${cart_id}, ${product_variation_id}, ${qty})
      ON CONFLICT (cart_id, product_variation_id)
      DO UPDATE SET quantity = Contains.quantity + ${qty}
      RETURNING *
    `;

    res.status(201).json({ success: true, data: cartItem[0] });
  } catch (error) {
    console.error("Error in addToCart:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Set an exact quantity for a cart item (or remove if quantity <= 0)
export const setCartItemQuantity = async (req, res) => {
  const { cart_id, product_variation_id, quantity } = req.body;

  if (!cart_id || !product_variation_id || quantity === undefined) {
    return res.status(400).json({ success: false, message: "cart_id, product_variation_id, and quantity are required" });
  }

  const qty = Number(quantity);
  if (!Number.isInteger(qty)) {
    return res.status(400).json({ success: false, message: "quantity must be an integer" });
  }

  try {
    if (qty <= 0) {
      await sql`
        DELETE FROM Contains
        WHERE cart_id = ${cart_id} AND product_variation_id = ${product_variation_id}
      `;

      return res.status(200).json({ success: true, message: "Item removed from cart" });
    }

    const variation = await sql`
      SELECT stock_quantity
      FROM Product_Variation
      WHERE product_variation_id = ${product_variation_id}
    `;

    if (variation.length === 0) {
      return res.status(404).json({ success: false, message: "Product variation not found" });
    }

    const stockQty = Number(variation[0].stock_quantity ?? 0);
    if (qty > stockQty) {
      return res.status(400).json({
        success: false,
        message: `Only ${stockQty} item(s) available in stock for this variation`,
      });
    }

    const updated = await sql`
      UPDATE Contains
      SET quantity = ${qty}
      WHERE cart_id = ${cart_id} AND product_variation_id = ${product_variation_id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    return res.status(200).json({ success: true, data: updated[0] });
  } catch (error) {
    console.error("Error in setCartItemQuantity:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
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
