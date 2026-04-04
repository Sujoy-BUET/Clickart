import express from "express";
import {
  getSellers,
  getSeller,
  createSeller,
  updateSeller,
  deleteSeller,
  addSellerEmail,
  addSellerPhone,
  addSellerAddress,
  authenticateSeller,
  getSellerProfile,
  getSellerSalesSummary,
  getSellerCoupons,
  createSellerCoupon,
  deleteSellerCoupon,
  updateSellerProfile,
} from "../controllers/sellerController.js";
import { requireAdminAuth } from "../lib/adminAuth.js";

const router = express.Router();

router.post("/login", authenticateSeller);
router.get("/", getSellers);
router.get("/:id", getSeller);
router.get("/:id/profile", getSellerProfile);
router.get("/:id/sales-summary", getSellerSalesSummary);
router.get("/:id/coupons", getSellerCoupons);
router.post("/", createSeller);
router.post("/:id/coupons", createSellerCoupon);
router.delete("/:id/coupons/:couponId", deleteSellerCoupon);
router.put("/:id", updateSeller);
router.put("/:id/profile", updateSellerProfile);
router.delete("/:id", requireAdminAuth, deleteSeller);
router.post("/:id/email", addSellerEmail);
router.post("/:id/phone", addSellerPhone);
router.post("/:id/address", addSellerAddress);

export default router;
