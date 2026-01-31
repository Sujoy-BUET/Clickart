import { sql } from "../config/db.js";

// Get all payments
export const getPayments = async (req, res) => {
  try {
    const payments = await sql`
      SELECT * FROM payment
      ORDER BY payment_id DESC
    `;
    console.log("fetched payments", payments);
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    console.log("Error in getPayments function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get payment by ID
export const getPayment = async (req, res) => {
  const { id } = req.params;

  try {
    const payment = await sql`
      SELECT * FROM payment WHERE payment_id = ${id}
    `;

    if (payment.length === 0) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.status(200).json({ success: true, data: payment[0] });
  } catch (error) {
    console.log("Error in getPayment function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get payments by order ID
export const getPaymentsByOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const payments = await sql`
      SELECT * FROM payment WHERE order_id = ${orderId}
      ORDER BY payment_id DESC
    `;

    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    console.log("Error in getPaymentsByOrder function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create new payment
export const createPayment = async (req, res) => {
  const { order_id, payment_method } = req.body;

  if (!order_id || !payment_method) {
    return res.status(400).json({ success: false, message: "Order ID and Payment Method are required" });
  }

  const validMethods = ['COD', 'CARD', 'MOBILE_BANKING'];
  if (!validMethods.includes(payment_method)) {
    return res.status(400).json({ success: false, message: "Invalid payment method" });
  }

  try {
    const newPayment = await sql`
      INSERT INTO payment (order_id, payment_method, payment_status)
      VALUES (${order_id}, ${payment_method}, 'PENDING')
      RETURNING *
    `;

    res.status(201).json({ success: true, data: newPayment[0] });
  } catch (error) {
    console.log("Error in createPayment function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Update payment status
export const updatePaymentStatus = async (req, res) => {
  const { id } = req.params;
  const { payment_status } = req.body;

  if (!payment_status) {
    return res.status(400).json({ success: false, message: "Payment status is required" });
  }

  const validStatuses = ['PENDING', 'PAID', 'FAILED'];
  if (!validStatuses.includes(payment_status)) {
    return res.status(400).json({ success: false, message: "Invalid payment status" });
  }

  try {
    const updatedPayment = await sql`
      UPDATE payment
      SET payment_status = ${payment_status}
      WHERE payment_id = ${id}
      RETURNING *
    `;

    if (updatedPayment.length === 0) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.status(200).json({ success: true, data: updatedPayment[0] });
  } catch (error) {
    console.log("Error in updatePaymentStatus function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete payment
export const deletePayment = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPayment = await sql`
      DELETE FROM payment
      WHERE payment_id = ${id}
      RETURNING *
    `;

    if (deletedPayment.length === 0) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.status(200).json({ success: true, message: "Payment deleted successfully" });
  } catch (error) {
    console.log("Error in deletePayment function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
