import express from "express";
import {
  createReview,
  deleteReview,
  getReview,
  getReviews,
  getProductReviews,
  getUserReviews,
  updateReview,
} from "../controllers/reviewController.js";

const router = express.Router();

router.get("/", getReviews);
router.get("/:id", getReview);
router.get("/product/:productId", getProductReviews);
router.get("/user/:userId", getUserReviews);
router.post("/", createReview);
router.put("/:id", updateReview);
router.delete("/:id", deleteReview);

export default router;
