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
} from "../controllers/sellerController.js";

const router = express.Router();

router.get("/", getSellers);
router.get("/:id", getSeller);
router.post("/", createSeller);
router.put("/:id", updateSeller);
router.delete("/:id", deleteSeller);
router.post("/:id/email", addSellerEmail);
router.post("/:id/phone", addSellerPhone);
router.post("/:id/address", addSellerAddress);

export default router;
