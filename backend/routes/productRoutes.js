import express from "express";
import {
  getCategories,
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
  addProductVariation,
} from "../controllers/productController.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/categories", getCategories);
router.get("/:id", getProduct);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.post("/:id/variations", addProductVariation);

export default router;