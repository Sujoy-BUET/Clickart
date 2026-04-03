import { sql } from "../config/db.js";
import {
  generateAdminToken,
  getAdminCredentialConfig,
  isAdminCredentialValid,
  isAdminEnvConfigured,
  updateAdminCredentialConfig,
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

  if (!(await isAdminCredentialValid(identity, password))) {
    return res.status(401).json({ success: false, message: "Invalid admin credentials" });
  }

  const current = await getAdminCredentialConfig();
  const token = generateAdminToken();

  return res.status(200).json({
    success: true,
    data: {
      token,
      admin_name: current.admin_name,
      admin_email: current.admin_email,
      admin_phone: current.admin_phone,
      role: "central-admin",
    },
  });
};

export const getAdminProfile = async (req, res) => {
  try {
    const current = await getAdminCredentialConfig();

    return res.status(200).json({
      success: true,
      data: {
        admin_name: current.admin_name,
        admin_email: current.admin_email,
        admin_phone: current.admin_phone,
      },
    });
  } catch (error) {
    console.error("Error in getAdminProfile:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const updateAdminCredentials = async (req, res) => {
  const { current_password, new_admin_name, new_admin_email, new_admin_phone, new_password } = req.body;

  if (!current_password) {
    return res.status(400).json({ success: false, message: "current_password is required" });
  }

  if (!new_admin_name && !new_admin_email && !new_admin_phone && !new_password) {
    return res.status(400).json({ success: false, message: "Provide profile fields and/or new_password" });
  }

  const normalizedName = String(new_admin_name || "").trim().toLowerCase();
  const normalizedEmail = String(new_admin_email || "").trim().toLowerCase();
  const normalizedPhone = String(new_admin_phone || "").trim();

  if (new_admin_name !== undefined && !normalizedName) {
    return res.status(400).json({ success: false, message: "new_admin_name cannot be empty" });
  }

  if (new_admin_email !== undefined) {
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: "new_admin_email cannot be empty" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "new_admin_email is invalid" });
    }
  }

  if (new_admin_phone !== undefined) {
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, message: "new_admin_phone cannot be empty" });
    }

    if (normalizedPhone.length < 7 || normalizedPhone.length > 20) {
      return res.status(400).json({ success: false, message: "new_admin_phone must be 7-20 characters" });
    }
  }

  if (new_password !== undefined && String(new_password).length < 4) {
    return res.status(400).json({ success: false, message: "new_password must be at least 4 characters" });
  }

  try {
    const current = await getAdminCredentialConfig();
    const isCurrentPasswordValid = String(current_password) === String(current.admin_password || "");

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const updated = await updateAdminCredentialConfig({
      admin_name: new_admin_name !== undefined ? normalizedName : undefined,
      admin_email: new_admin_email !== undefined ? normalizedEmail : undefined,
      admin_phone: new_admin_phone !== undefined ? normalizedPhone : undefined,
      admin_password: new_password !== undefined ? String(new_password) : undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Admin credentials updated successfully",
      data: {
        admin_name: updated.admin_name,
        admin_email: updated.admin_email,
        admin_phone: updated.admin_phone,
      },
    });
  } catch (error) {
    console.error("Error in updateAdminCredentials:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
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
