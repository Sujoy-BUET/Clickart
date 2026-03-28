import { sql } from "../config/db.js";

// Get all payments
export const getPayments = async (req, res) => {
  try {
    const payments = await sql`
      SELECT * FROM Payment ORDER BY payment_id DESC
    `;
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    console.error("Error in getPayments:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get payment by ID
export const getPayment = async (req, res) => {
  const { id } = req.params;

  try {
    const payment = await sql`
      SELECT * FROM Payment WHERE payment_id = ${id}
    `;

    if (payment.length === 0) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.status(200).json({ success: true, data: payment[0] });
  } catch (error) {
    console.error("Error in getPayment:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get payments by order ID
export const getPaymentsByOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const payments = await sql`
      SELECT * FROM Payment WHERE order_id = ${orderId}
      ORDER BY payment_id DESC
    `;

    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    console.error("Error in getPaymentsByOrder:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create new payment
export const createPayment = async (req, res) => {
  const { order_id, payment_method } = req.body;

  if (!order_id || !payment_method) {
    return res.status(400).json({ success: false, message: "order_id and payment_method are required" });
  }

  const validMethods = ['COD', 'CARD', 'MOBILE_BANKING'];
  if (!validMethods.includes(payment_method)) {
    return res.status(400).json({ success: false, message: "Invalid payment method" });
  }

  try {
    const order = await sql`
      SELECT order_id
      FROM Orders
      WHERE order_id = ${order_id}
      LIMIT 1
    `;

    if (order.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const existing = await sql`
      SELECT *
      FROM Payment
      WHERE order_id = ${order_id}
      ORDER BY payment_id DESC
      LIMIT 1
    `;

    if (existing.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Payment already initialized for this order",
        data: existing[0],
      });
    }

    const newPayment = await sql`
      INSERT INTO payment (order_id, payment_method, payment_status)
      VALUES (${order_id}, ${payment_method}, 'PENDING')
      RETURNING *
    `;

    res.status(201).json({ success: true, data: newPayment[0] });
  } catch (error) {
    console.error("Error in createPayment:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Update payment status
export const updatePaymentStatus = async (req, res) => {
  const { id } = req.params;
  const { payment_status } = req.body;

  if (!payment_status) {
    return res.status(400).json({ success: false, message: "payment_status is required" });
  }

  const validStatuses = ['PENDING', 'PAID', 'FAILED'];
  if (!validStatuses.includes(payment_status)) {
    return res.status(400).json({ success: false, message: "Invalid payment status" });
  }

  try {
    const updated = await sql`
      UPDATE Payment
      SET payment_status = ${payment_status}
      WHERE payment_id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.status(200).json({ success: true, data: updated[0] });
  } catch (error) {
    console.error("Error in updatePaymentStatus:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete payment
export const deletePayment = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await sql`
      DELETE FROM Payment WHERE payment_id = ${id} RETURNING *
    `;

    if (deleted.length === 0) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.status(200).json({ success: true, message: "Payment deleted successfully" });
  } catch (error) {
    console.error("Error in deletePayment:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
