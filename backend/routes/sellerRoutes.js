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
  updateSellerProfile,
} from "../controllers/sellerController.js";

const router = express.Router();

router.post("/login", authenticateSeller);
router.get("/", getSellers);
router.get("/:id", getSeller);
router.get("/:id/profile", getSellerProfile);
router.post("/", createSeller);
router.put("/:id", updateSeller);
router.put("/:id/profile", updateSellerProfile);
router.delete("/:id", deleteSeller);
router.post("/:id/email", addSellerEmail);
router.post("/:id/phone", addSellerPhone);
router.post("/:id/address", addSellerAddress);

export default router;
