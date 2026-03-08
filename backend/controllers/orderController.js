import { sql } from "../config/db.js";

// Get all orders
export const getOrders = async (req, res) => {
  try {
    const orders = await sql`
      SELECT o.*, da.address_id AS delivery_address_id
      FROM Orders o
      LEFT JOIN Delivery_Address da ON o.order_id = da.order_id
      ORDER BY o.order_id DESC
    `;
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Error in getOrders:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get order by ID (with delivery address details)
export const getOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await sql`
      SELECT o.*,
             a.address_id, a.house_no, a.road_no, a.postal_code,
             a.area, a.district, a.division, a.country,
             cp.code AS coupon_code, cp.discount_type, cp.discount_value
      FROM Orders o
      LEFT JOIN Delivery_Address da ON o.order_id  = da.order_id
      LEFT JOIN Address a           ON da.address_id = a.address_id
      LEFT JOIN Coupon cp           ON o.coupon_id   = cp.coupon_id
      WHERE o.order_id = ${id}
    `;

    if (order.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, data: order[0] });
  } catch (error) {
    console.error("Error in getOrder:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get orders by user ID
export const getUserOrders = async (req, res) => {
  const { userId } = req.params;

  try {
    const orders = await sql`
      SELECT o.*, da.address_id AS delivery_address_id
      FROM Orders o
      LEFT JOIN Delivery_Address da ON o.order_id = da.order_id
      WHERE o.user_id = ${userId}
      ORDER BY o.order_id DESC
    `;

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Error in getUserOrders:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create new order (with delivery address)
export const createOrder = async (req, res) => {
  const { user_id, cart_id, coupon_id, total_amount, address_id } = req.body;

  if (!user_id || !cart_id || !total_amount || !address_id) {
    return res.status(400).json({ success: false, message: "user_id, cart_id, total_amount, and address_id are required" });
  }

  try {
    const newOrder = await sql`
      INSERT INTO Orders (user_id, cart_id, coupon_id, order_status, total_amount)
      VALUES (${user_id}, ${cart_id}, ${coupon_id ?? null}, 'PENDING', ${total_amount})
      RETURNING *
    `;

    await sql`
      INSERT INTO Delivery_Address (order_id, address_id)
      VALUES (${newOrder[0].order_id}, ${address_id})
    `;

    res.status(201).json({ success: true, data: { ...newOrder[0], delivery_address_id: address_id } });
  } catch (error) {
    console.error("Error in createOrder:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { order_status } = req.body;

  if (!order_status) {
    return res.status(400).json({ success: false, message: "order_status is required" });
  }

  const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(order_status)) {
    return res.status(400).json({ success: false, message: "Invalid order status" });
  }

  try {
    const updated = await sql`
      UPDATE Orders
      SET order_status = ${order_status}
      WHERE order_id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, data: updated[0] });
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete order
export const deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    // Remove dependent delivery_address row first
    await sql`DELETE FROM Delivery_Address WHERE order_id = ${id}`;

    const deleted = await sql`
      DELETE FROM Orders WHERE order_id = ${id} RETURNING *
    `;

    if (deleted.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error in deleteOrder:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
