import { sql } from "../config/db.js";

// Get all orders
export const getOrders = async (req, res) => {
  try {
    const orders = await sql`
      SELECT * FROM orders
      ORDER BY order_id DESC
    `;
    console.log("fetched orders", orders);
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.log("Error in getOrders function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get order by ID
export const getOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await sql`
      SELECT * FROM orders WHERE order_id = ${id}
    `;

    if (order.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, data: order[0] });
  } catch (error) {
    console.log("Error in getOrder function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get orders by user ID
export const getUserOrders = async (req, res) => {
  const { userId } = req.params;

  try {
    const orders = await sql`
      SELECT * FROM orders WHERE user_id = ${userId}
      ORDER BY order_id DESC
    `;

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.log("Error in getUserOrders function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create new order
export const createOrder = async (req, res) => {
  const { user_id, cart_id, delivery_address_id, total_amount } = req.body;

  if (!user_id || !cart_id || !delivery_address_id || !total_amount) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    const newOrder = await sql`
      INSERT INTO orders (user_id, cart_id, delivery_address_id, order_status, total_amount)
      VALUES (${user_id}, ${cart_id}, ${delivery_address_id}, 'PENDING', ${total_amount})
      RETURNING *
    `;

    res.status(201).json({ success: true, data: newOrder[0] });
  } catch (error) {
    console.log("Error in createOrder function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { order_status } = req.body;

  if (!order_status) {
    return res.status(400).json({ success: false, message: "Order status is required" });
  }

  const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(order_status)) {
    return res.status(400).json({ success: false, message: "Invalid order status" });
  }

  try {
    const updatedOrder = await sql`
      UPDATE orders
      SET order_status = ${order_status}
      WHERE order_id = ${id}
      RETURNING *
    `;

    if (updatedOrder.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, data: updatedOrder[0] });
  } catch (error) {
    console.log("Error in updateOrderStatus function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete order
export const deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedOrder = await sql`
      DELETE FROM orders
      WHERE order_id = ${id}
      RETURNING *
    `;

    if (deletedOrder.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.log("Error in deleteOrder function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
