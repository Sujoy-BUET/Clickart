import express from "express";
import {
  createCart,
  deleteCart,
  getCart,
  getCarts,
  addToCart,
  removeFromCart,
} from "../controllers/cartController.js";

const router = express.Router();

router.get("/", getCarts);
router.get("/:id", getCart);
router.post("/", createCart);
router.post("/add", addToCart);
router.delete("/remove", removeFromCart);
router.delete("/:id", deleteCart);

export default router;
