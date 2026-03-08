import express from "express";
import {
  createUser,
  deleteUser,
  getUser,
  getUsers,
  updateUser,
  addUserAddress,
  authenticateUser,
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/login", authenticateUser);
router.get("/", getUsers);
router.get("/:id", getUser);
router.get("/:id/profile", getUserProfile);
router.post("/", createUser);
router.put("/:id", updateUser);
router.put("/:id/profile", updateUserProfile);
router.delete("/:id", deleteUser);
router.post("/:id/address", addUserAddress);

export default router;
