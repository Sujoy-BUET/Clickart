import express from "express";
import {
  deleteReview,
  getReview,
  getReviews,
  getProductReviews,
  getSellerReviews,
  getUserReviews,
  createProductReview,
  createSellerReview,
  updateReview,
} from "../controllers/reviewController.js";

const router = express.Router();

router.get("/", getReviews);
router.get("/product/:productId", getProductReviews);
router.get("/seller/:sellerId", getSellerReviews);
router.get("/user/:userId", getUserReviews);
router.get("/:id", getReview);
router.post("/product", createProductReview);
router.post("/seller", createSellerReview);
router.put("/:id", updateReview);
router.delete("/:id", deleteReview);

export default router;
