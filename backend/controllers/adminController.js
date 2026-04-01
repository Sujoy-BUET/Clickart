import { sql } from "../config/db.js";
import {
  generateAdminToken,
  isAdminCredentialValid,
  isAdminEnvConfigured,
} from "../lib/adminAuth.js";

export const adminLogin = async (req, res) => {
  const { admin_name, email, password } = req.body;
  const identity = admin_name || email;

  if (!isAdminEnvConfigured()) {
    return res.status(500).json({ success: false, message: "Admin auth is not configured" });
  }

  if (!identity || !password) {
    return res.status(400).json({ success: false, message: "admin_name and password are required" });
  }

  if (!isAdminCredentialValid(identity, password)) {
    return res.status(401).json({ success: false, message: "Invalid admin credentials" });
  }

  const token = generateAdminToken();

  return res.status(200).json({
    success: true,
    data: {
      token,
      admin_name: String(identity).trim().toLowerCase(),
      role: "central-admin",
    },
  });
};

export const verifySellerByAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await sql`
      UPDATE Sellers
      SET is_verified = TRUE
      WHERE seller_id = ${id}
      RETURNING seller_id, seller_name, store_name, is_verified
    `;

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Seller verified successfully",
      data: updated[0],
    });
  } catch (error) {
    console.error("Error in verifySellerByAdmin:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const removeSellerByAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const removed = await sql`
      DELETE FROM Sellers
      WHERE seller_id = ${id}
      RETURNING seller_id, seller_name, store_name
    `;

    if (removed.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Seller removed successfully",
      data: removed[0],
    });
  } catch (error) {
    console.error("Error in removeSellerByAdmin:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
