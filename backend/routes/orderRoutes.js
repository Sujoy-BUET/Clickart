import express from "express";
import {
  createOrder,
  deleteOrder,
  getOrder,
  getOrders,
  getUserOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = express.Router();

router.get("/", getOrders);
router.get("/:id", getOrder);
router.get("/user/:userId", getUserOrders);
router.post("/", createOrder);
router.put("/:id/status", updateOrderStatus);
router.delete("/:id", deleteOrder);

export default router;
