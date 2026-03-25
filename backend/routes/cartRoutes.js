import express from "express";
import {
  createCart,
  deleteCart,
  getCart,
  getCarts,
  getOrCreateCartByUser,
  addToCart,
  setCartItemQuantity,
  removeFromCart,
} from "../controllers/cartController.js";

const router = express.Router();

router.get("/", getCarts);
router.get("/user/:userId", getOrCreateCartByUser);
router.get("/:id", getCart);
router.post("/", createCart);
router.post("/add", addToCart);
router.put("/quantity", setCartItemQuantity);
router.delete("/remove", removeFromCart);
router.delete("/:id", deleteCart);

export default router;
