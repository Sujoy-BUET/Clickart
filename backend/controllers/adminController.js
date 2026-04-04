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
  const sellerId = Number(id);
  const ARCHIVED_SELLER_NAME = "__archived_seller__";

  if (Number.isNaN(sellerId) || sellerId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid seller id" });
  }

  try {
    const sellerExists = await sql`
      SELECT seller_id, seller_name, store_name
      FROM Sellers
      WHERE seller_id = ${sellerId}
      LIMIT 1
    `;

    if (sellerExists.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    if (String(sellerExists[0].seller_name || "").trim() === ARCHIVED_SELLER_NAME) {
      return res.status(400).json({ success: false, message: "Archived seller cannot be deleted" });
    }

    const orderHistoryLinks = await sql`
      SELECT fn_seller_order_history_count(${sellerId}) AS linked_count
    `;

    const linkedCount = Number(orderHistoryLinks?.[0]?.linked_count || 0);

    const activeOrders = await sql`
      SELECT fn_seller_active_order_count(${sellerId}) AS active_order_count
    `;

    const activeOrderCount = Number(activeOrders?.[0]?.active_order_count || 0);
    if (activeOrderCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete seller with active/pending orders. Resolve those orders first.",
      });
    }

    await sql`BEGIN`;

    if (linkedCount > 0) {
      let archivedSellerId;

      const existingArchivedSeller = await sql`
        SELECT seller_id
        FROM Sellers
        WHERE seller_name = ${ARCHIVED_SELLER_NAME}
        ORDER BY seller_id ASC
        LIMIT 1
      `;

      if (existingArchivedSeller.length > 0) {
        archivedSellerId = existingArchivedSeller[0].seller_id;
        await sql`
          UPDATE Sellers
          SET is_verified = TRUE
          WHERE seller_id = ${archivedSellerId}
        `;
      } else {
        const createdArchivedSeller = await sql`
          INSERT INTO Sellers (seller_name, seller_password, store_name, store_description, is_verified)
          VALUES (${ARCHIVED_SELLER_NAME}, ${"archived_seller_password"}, ${"Archived Seller"}, ${"Automatically created to preserve order history"}, TRUE)
          RETURNING seller_id
        `;
        archivedSellerId = createdArchivedSeller[0].seller_id;
      }

      await sql`
        UPDATE Product
        SET seller_id = ${archivedSellerId}
        WHERE seller_id = ${sellerId}
      `;

      await sql`
        DELETE FROM Review_Seller
        WHERE seller_id = ${sellerId}
      `;

      await sql`
        DELETE FROM Seller_Email
        WHERE seller_id = ${sellerId}
      `;

      await sql`
        DELETE FROM Seller_Phone
        WHERE seller_id = ${sellerId}
      `;

      await sql`
        DELETE FROM Seller_Address
        WHERE seller_id = ${sellerId}
      `;

      const removedWithHistory = await sql`
        DELETE FROM Sellers
        WHERE seller_id = ${sellerId}
        RETURNING seller_id, seller_name, store_name
      `;

      await sql`COMMIT`;

      return res.status(200).json({
        success: true,
        message: "Seller removed successfully. Historical products were moved to archived seller.",
        data: removedWithHistory[0],
      });
    }

    await sql`
      DELETE FROM Contains
      WHERE product_variation_id IN (
        SELECT pv.product_variation_id
        FROM Product_Variation pv
        JOIN Product p ON p.product_id = pv.product_id
        WHERE p.seller_id = ${sellerId}
      )
    `;

    await sql`
      DELETE FROM Review_Product
      WHERE product_id IN (
        SELECT product_id
        FROM Product
        WHERE seller_id = ${sellerId}
      )
    `;

    await sql`
      DELETE FROM Product_Variation
      WHERE product_id IN (
        SELECT product_id
        FROM Product
        WHERE seller_id = ${sellerId}
      )
    `;

    await sql`
      DELETE FROM Product
      WHERE seller_id = ${sellerId}
    `;

    await sql`
      DELETE FROM Review_Seller
      WHERE seller_id = ${sellerId}
    `;

    await sql`
      DELETE FROM Seller_Email
      WHERE seller_id = ${sellerId}
    `;

    await sql`
      DELETE FROM Seller_Phone
      WHERE seller_id = ${sellerId}
    `;

    await sql`
      DELETE FROM Seller_Address
      WHERE seller_id = ${sellerId}
    `;

    const removed = await sql`
      DELETE FROM Sellers
      WHERE seller_id = ${sellerId}
      RETURNING seller_id, seller_name, store_name
    `;

    await sql`COMMIT`;

    return res.status(200).json({
      success: true,
      message: "Seller removed successfully",
      data: removed[0],
    });
  } catch (error) {
    try {
      await sql`ROLLBACK`;
    } catch {
      // no-op: rollback may fail if transaction never started
    }
    console.error("Error in removeSellerByAdmin:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
