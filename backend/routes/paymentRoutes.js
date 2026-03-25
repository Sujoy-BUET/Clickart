import express from "express";
import {
  createPayment,
  deletePayment,
  getPayment,
  getPayments,
  getPaymentsByOrder,
  updatePaymentStatus,
} from "../controllers/paymentController.js";

const router = express.Router();

router.get("/", getPayments);
router.get("/order/:orderId", getPaymentsByOrder);
router.get("/:id", getPayment);
router.post("/", createPayment);
router.put("/:id/status", updatePaymentStatus);
router.delete("/:id", deletePayment);

export default router;
