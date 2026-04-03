import express from "express";
import {
  createOrder,
  deleteOrder,
  getOrder,
  getOrders,
  getSellerOrders,
  getUserOrders,
  sellerRespondToOrder,
  markOrderReceived,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { requireAdminAuth } from "../lib/adminAuth.js";

const router = express.Router();

router.get("/", getOrders);
router.get("/user/:userId", getUserOrders);
router.get("/seller/:sellerId", getSellerOrders);
router.get("/:id", getOrder);
router.post("/", createOrder);
router.put("/:id/status", requireAdminAuth, updateOrderStatus);
router.put("/:id/seller-response", sellerRespondToOrder);
router.put("/:id/received", markOrderReceived);
router.delete("/:id", deleteOrder);

export default router;
