import express from "express";
import {
  adminLogin,
  verifySellerByAdmin,
  removeSellerByAdmin,
} from "../controllers/adminController.js";
import { requireAdminAuth } from "../lib/adminAuth.js";

const router = express.Router();

router.post("/login", adminLogin);
router.patch("/sellers/:id/verify", requireAdminAuth, verifySellerByAdmin);
router.delete("/sellers/:id/remove", requireAdminAuth, removeSellerByAdmin);

export default router;
