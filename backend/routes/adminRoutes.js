import express from "express";
import {
  adminLogin,
  getAdminProfile,
  verifySellerByAdmin,
  removeSellerByAdmin,
  updateAdminCredentials,
} from "../controllers/adminController.js";
import { requireAdminAuth } from "../lib/adminAuth.js";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/profile", requireAdminAuth, getAdminProfile);
router.put("/credentials", requireAdminAuth, updateAdminCredentials);
router.patch("/sellers/:id/verify", requireAdminAuth, verifySellerByAdmin);
router.delete("/sellers/:id/remove", requireAdminAuth, removeSellerByAdmin);

export default router;
