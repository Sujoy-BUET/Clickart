import { sql } from "../config/db.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isValidEmail = (value) => EMAIL_REGEX.test(String(value || "").trim());
const normalizeSellerName = (value) => String(value || "").trim();
const normalizeEmail = (value) => String(value || "").trim();
const normalizePhone = (value) => String(value || "").trim();

const ensureSellerCouponSchema = async () => {
  await sql`
    ALTER TABLE Coupon ADD COLUMN IF NOT EXISTS seller_id INT
  `;
  await sql`
    ALTER TABLE Coupon ADD COLUMN IF NOT EXISTS coupon_name VARCHAR(120)
  `;
  await sql`
    ALTER TABLE Coupon ADD COLUMN IF NOT EXISTS applies_all_products BOOLEAN DEFAULT TRUE
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS Coupon_Product (
      coupon_id INT NOT NULL,
      product_id INT NOT NULL,
      PRIMARY KEY (coupon_id, product_id),
      FOREIGN KEY (coupon_id) REFERENCES Coupon(coupon_id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE
    )
  `;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const toNumericArray = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))];
};

export const getSellerCoupons = async (req, res) => {
  const { id } = req.params;
  const activeOnly = toBoolean(req.query.active, false);

  try {
    await ensureSellerCouponSchema();

    const sellerRows = await sql`
      SELECT seller_id
      FROM Sellers
      WHERE seller_id = ${id}
      LIMIT 1
    `;

    if (sellerRows.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    const coupons = activeOnly
      ? await sql`
          SELECT c.coupon_id, c.seller_id, c.coupon_name, c.code, c.description,
                 c.discount_type, c.discount_value, c.max_discount_amount, c.min_order_amount,
                 c.applies_all_products, c.start_date, c.end_date, c.is_active,
                 COALESCE(
                   json_agg(
                     json_build_object('product_id', p.product_id, 'product_name', p.product_name)
                     ORDER BY p.product_name
                   ) FILTER (WHERE p.product_id IS NOT NULL),
                   '[]'::json
                 ) AS products
          FROM Coupon c
          LEFT JOIN Coupon_Product cp ON cp.coupon_id = c.coupon_id
          LEFT JOIN Product p ON p.product_id = cp.product_id
          WHERE c.seller_id = ${id}
            AND c.is_active = TRUE
            AND CURRENT_DATE BETWEEN c.start_date AND c.end_date
          GROUP BY c.coupon_id
          ORDER BY c.coupon_id DESC
        `
      : await sql`
          SELECT c.coupon_id, c.seller_id, c.coupon_name, c.code, c.description,
                 c.discount_type, c.discount_value, c.max_discount_amount, c.min_order_amount,
                 c.applies_all_products, c.start_date, c.end_date, c.is_active,
                 COALESCE(
                   json_agg(
                     json_build_object('product_id', p.product_id, 'product_name', p.product_name)
                     ORDER BY p.product_name
                   ) FILTER (WHERE p.product_id IS NOT NULL),
                   '[]'::json
                 ) AS products
          FROM Coupon c
          LEFT JOIN Coupon_Product cp ON cp.coupon_id = c.coupon_id
          LEFT JOIN Product p ON p.product_id = cp.product_id
          WHERE c.seller_id = ${id}
          GROUP BY c.coupon_id
          ORDER BY c.coupon_id DESC
        `;

    return res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    console.error("Error in getSellerCoupons:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const createSellerCoupon = async (req, res) => {
  const { id } = req.params;
  const {
    coupon_name,
    code,
    description,
    discount_type,
    discount_value,
    max_discount_amount,
    min_order_amount,
    start_date,
    end_date,
    is_active,
    applies_all_products,
    product_ids,
  } = req.body;

  const normalizedName = String(coupon_name || "").trim();
  const normalizedCode = String(code || "").trim().toUpperCase();
  const normalizedType = String(discount_type || "").trim().toUpperCase();
  const normalizedProductIds = toNumericArray(product_ids);
  const appliesAllProducts = toBoolean(applies_all_products, true);

  if (!normalizedName || !normalizedCode || !normalizedType || discount_value === undefined || !start_date || !end_date) {
    return res.status(400).json({
      success: false,
      message: "coupon_name, code, discount_type, discount_value, start_date and end_date are required",
    });
  }

  if (!["PERCENT", "FIXED"].includes(normalizedType)) {
    return res.status(400).json({ success: false, message: "discount_type must be PERCENT or FIXED" });
  }

  if (new Date(start_date).getTime() > new Date(end_date).getTime()) {
    return res.status(400).json({ success: false, message: "start_date must be before end_date" });
  }

  const discountNumber = Number(discount_value);
  if (!Number.isFinite(discountNumber) || discountNumber <= 0) {
    return res.status(400).json({ success: false, message: "discount_value must be a positive number" });
  }

  if (!appliesAllProducts && normalizedProductIds.length === 0) {
    return res.status(400).json({ success: false, message: "Select at least one product or enable apply to all products" });
  }

  try {
    await ensureSellerCouponSchema();

    const sellerRows = await sql`
      SELECT seller_id
      FROM Sellers
      WHERE seller_id = ${id}
      LIMIT 1
    `;

    if (sellerRows.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    if (normalizedProductIds.length > 0) {
      const ownedProducts = await sql`
        SELECT product_id
        FROM Product
        WHERE seller_id = ${id}
          AND product_id = ANY(${normalizedProductIds})
      `;

      if (ownedProducts.length !== normalizedProductIds.length) {
        return res.status(400).json({ success: false, message: "Some selected products do not belong to this seller" });
      }
    }

    const created = await sql`
      INSERT INTO Coupon (
        seller_id,
        coupon_name,
        code,
        description,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        applies_all_products,
        start_date,
        end_date,
        is_active
      )
      VALUES (
        ${id},
        ${normalizedName},
        ${normalizedCode},
        ${description ?? null},
        ${normalizedType},
        ${discountNumber},
        ${max_discount_amount ?? null},
        ${min_order_amount ?? null},
        ${appliesAllProducts},
        ${start_date},
        ${end_date},
        ${is_active ?? true}
      )
      RETURNING *
    `;

    const newCoupon = created[0];

    if (!appliesAllProducts && normalizedProductIds.length > 0) {
      for (const productId of normalizedProductIds) {
        await sql`
          INSERT INTO Coupon_Product (coupon_id, product_id)
          VALUES (${newCoupon.coupon_id}, ${productId})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    const selectedProducts = !appliesAllProducts && normalizedProductIds.length > 0
      ? await sql`
          SELECT product_id, product_name
          FROM Product
          WHERE product_id = ANY(${normalizedProductIds})
          ORDER BY product_name
        `
      : [];

    return res.status(201).json({
      success: true,
      data: {
        ...newCoupon,
        products: selectedProducts,
      },
    });
  } catch (error) {
    if (String(error?.code || "") === "23505") {
      return res.status(409).json({ success: false, message: "Coupon code already exists" });
    }

    console.error("Error in createSellerCoupon:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Seller Authentication  
export const authenticateSeller = async (req, res) => {
  const { seller_name, seller_password } = req.body;

  if (!seller_name || !seller_password) {
    return res.status(400).json({ success: false, message: "seller_name and seller_password are required" });
  }

  const normalizedSellerName = normalizeSellerName(seller_name);
  const normalizedPassword = String(seller_password);

  if (!normalizedSellerName) {
    return res.status(400).json({ success: false, message: "seller_name and seller_password are required" });
  }

  try {
    const seller = await sql`
      SELECT seller_id, seller_name, seller_password, store_name, store_description, is_verified 
      FROM Sellers
      WHERE LOWER(TRIM(seller_name)) = LOWER(${normalizedSellerName})
      ORDER BY seller_id DESC
      LIMIT 1
    `;

    if (seller.length === 0 || String(seller[0].seller_password) !== normalizedPassword) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Get seller's emails and phones
    const emails = await sql`
      SELECT email FROM Seller_Email WHERE seller_id = ${seller[0].seller_id}
    `;
    
    const phones = await sql`
      SELECT phone_number FROM Seller_Phone WHERE seller_id = ${seller[0].seller_id}
    `;

    const sellerData = {
      seller_id: seller[0].seller_id,
      seller_name: seller[0].seller_name,
      store_name: seller[0].store_name,
      store_description: seller[0].store_description,
      is_verified: seller[0].is_verified,
      emails: emails.map(e => e.email),
      phones: phones.map(p => p.phone_number)
    };

    res.status(200).json({ success: true, data: sellerData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get all sellers
export const getSellers = async (req, res) => {
  try {
    const sellers = await sql`
      SELECT s.seller_id, s.seller_name, s.store_name, s.store_description,
             s.seller_since, s.is_verified,
             COALESCE(rs.review_count, 0)::INT AS review_count,
             COALESCE(rs.average_rating, 0)::NUMERIC(10,2) AS average_rating
      FROM Sellers s
      LEFT JOIN (
        SELECT rsv.seller_id,
               COUNT(r.review_id) AS review_count,
               AVG(r.rating) AS average_rating
        FROM Review_Seller rsv
        JOIN Review r ON rsv.review_id = r.review_id
        GROUP BY rsv.seller_id
      ) rs ON rs.seller_id = s.seller_id
      WHERE s.seller_name <> ${"__archived_seller__"}
      ORDER BY seller_id DESC
    `;
    res.status(200).json({ success: true, data: sellers });
  } catch (error) {
    console.error("Error in getSellers:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get seller by ID (with emails, phones, addresses)
export const getSeller = async (req, res) => {
  const { id } = req.params;

  try {
    const seller = await sql`
      SELECT s.seller_id, s.seller_name, s.store_name, s.store_description,
             s.seller_since, s.is_verified,
             COALESCE(rs.review_count, 0)::INT AS review_count,
             COALESCE(rs.average_rating, 0)::NUMERIC(10,2) AS average_rating
      FROM Sellers s
      LEFT JOIN (
        SELECT rsv.seller_id,
               COUNT(r.review_id) AS review_count,
               AVG(r.rating) AS average_rating
        FROM Review_Seller rsv
        JOIN Review r ON rsv.review_id = r.review_id
        GROUP BY rsv.seller_id
      ) rs ON rs.seller_id = s.seller_id
      WHERE s.seller_id = ${id}
    `;

    if (seller.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    const emails = await sql`
      SELECT email FROM Seller_Email WHERE seller_id = ${id}
    `;

    const phones = await sql`
      SELECT phone_number FROM Seller_Phone WHERE seller_id = ${id}
    `;

    const addresses = await sql`
      SELECT a.address_id, a.house_no, a.road_no, a.postal_code,
             a.area, a.district, a.division, a.country
      FROM Seller_Address sa
      JOIN Address a ON sa.address_id = a.address_id
      WHERE sa.seller_id = ${id}
    `;

    res.status(200).json({
      success: true,
      data: {
        ...seller[0],
        emails: emails.map((e) => e.email),
        phones: phones.map((p) => p.phone_number),
        addresses,
      },
    });
  } catch (error) {
    console.error("Error in getSeller:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create new seller
export const createSeller = async (req, res) => {
  const { seller_name, seller_password, store_name, store_description } = req.body;
  const normalizedSellerName = normalizeSellerName(seller_name);

  if (!normalizedSellerName || !seller_password || !store_name) {
    return res.status(400).json({ success: false, message: "seller_name, seller_password and store_name are required" });
  }

  try {
    const existingSeller = await sql`
      SELECT seller_id
      FROM Sellers
      WHERE LOWER(TRIM(seller_name)) = LOWER(${normalizedSellerName})
      LIMIT 1
    `;

    if (existingSeller.length > 0) {
      return res.status(409).json({ success: false, message: "Seller username already exists" });
    }

    const newSeller = await sql`
      INSERT INTO Sellers (seller_name, seller_password, store_name, store_description)
      VALUES (${normalizedSellerName}, ${seller_password}, ${store_name}, ${store_description ?? null})
      RETURNING seller_id, seller_name, store_name, seller_since, is_verified
    `;

    res.status(201).json({ success: true, data: newSeller[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Update seller
export const updateSeller = async (req, res) => {
  const { id } = req.params;
  const { seller_name, seller_password, store_name, store_description } = req.body;
  const hasSellerName = seller_name !== undefined;
  const hasSellerPassword = seller_password !== undefined;
  const normalizedSellerName = hasSellerName ? normalizeSellerName(seller_name) : null;
  const normalizedSellerPassword = hasSellerPassword ? String(seller_password) : null;

  if (hasSellerName && !normalizedSellerName) {
    return res.status(400).json({ success: false, message: "seller_name cannot be empty" });
  }

  if (hasSellerPassword && normalizedSellerPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  try {
    if (hasSellerName) {
      const existingSeller = await sql`
        SELECT seller_id
        FROM Sellers
        WHERE LOWER(TRIM(seller_name)) = LOWER(${normalizedSellerName})
          AND seller_id <> ${id}
        LIMIT 1
      `;

      if (existingSeller.length > 0) {
        return res.status(409).json({ success: false, message: "Seller username already exists" });
      }
    }

    const updated = await sql`
      UPDATE Sellers
      SET seller_name      = COALESCE(${hasSellerName ? normalizedSellerName : null}, seller_name),
          seller_password   = COALESCE(${hasSellerPassword ? normalizedSellerPassword : null}, seller_password),
          store_name        = COALESCE(${store_name ?? null}, store_name),
          store_description = COALESCE(${store_description ?? null}, store_description)
      WHERE seller_id = ${id}
      RETURNING seller_id, seller_name, store_name, store_description, is_verified
    `;

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    res.status(200).json({ success: true, data: updated[0] });
  } catch (error) {
    console.error("Error in updateSeller:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete seller
export const deleteSeller = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await sql`
      DELETE FROM Sellers WHERE seller_id = ${id}
      RETURNING seller_id, seller_name
    `;

    if (deleted.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    res.status(200).json({ success: true, message: "Seller deleted successfully" });
  } catch (error) {
    console.error("Error in deleteSeller:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Add email to seller
export const addSellerEmail = async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: "email is required" });
  }

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  try {
    const existingEmailOwner = await sql`
      SELECT seller_id
      FROM Seller_Email
      WHERE LOWER(TRIM(email)) = LOWER(${normalizedEmail})
        AND seller_id <> ${id}
      LIMIT 1
    `;

    if (existingEmailOwner.length > 0) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    try {
      await sql`CALL proc_upsert_seller_contacts(${id}, ${normalizedEmail}, ${null})`;
    } catch (callError) {
      if (String(callError?.code || '') !== '42883') {
        throw callError;
      }

      await sql`
        INSERT INTO Seller_Email (seller_id, email)
        VALUES (${id}, ${normalizedEmail})
        ON CONFLICT DO NOTHING
      `;
    }
    res.status(201).json({ success: true, data: { seller_id: Number(id), email: normalizedEmail } });
  } catch (error) {
    const constraint = String(error?.constraint || error?.constraint_name || "");
    const errorMessage = String(error?.message || "");

    if (error?.code === "23505" && (constraint.includes("seller_email") || constraint.includes("email") || errorMessage.includes("Seller_Email"))) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    console.error("Error in addSellerEmail:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Add phone to seller
export const addSellerPhone = async (req, res) => {
  const { id } = req.params;
  const { phone_number } = req.body;
  const normalizedPhone = normalizePhone(phone_number);

  if (!normalizedPhone) {
    return res.status(400).json({ success: false, message: "phone_number is required" });
  }

  try {
    const existingPhoneOwner = await sql`
      SELECT seller_id
      FROM Seller_Phone
      WHERE TRIM(phone_number) = ${normalizedPhone}
        AND seller_id <> ${id}
      LIMIT 1
    `;

    if (existingPhoneOwner.length > 0) {
      return res.status(409).json({ success: false, message: "Phone number already registered" });
    }

    try {
      await sql`CALL proc_upsert_seller_contacts(${id}, ${null}, ${normalizedPhone})`;
    } catch (callError) {
      if (String(callError?.code || '') !== '42883') {
        throw callError;
      }

      await sql`
        INSERT INTO Seller_Phone (seller_id, phone_number)
        VALUES (${id}, ${normalizedPhone})
        ON CONFLICT DO NOTHING
      `;
    }
    res.status(201).json({ success: true, data: { seller_id: Number(id), phone_number: normalizedPhone } });
  } catch (error) {
    const constraint = String(error?.constraint || error?.constraint_name || "");
    const errorMessage = String(error?.message || "");

    if (error?.code === "23505" && (constraint.includes("seller_phone") || constraint.includes("phone") || errorMessage.includes("Seller_Phone"))) {
      return res.status(409).json({ success: false, message: "Phone number already registered" });
    }

    console.error("Error in addSellerPhone:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Add address to seller
export const addSellerAddress = async (req, res) => {
  const { id } = req.params;
  const { house_no, road_no, postal_code, area, district, division, country } = req.body;

  if (!postal_code || !area || !district || !division || !country) {
    return res.status(400).json({ success: false, message: "postal_code, area, district, division, and country are required" });
  }

  try {
    const addr = await sql`
      INSERT INTO Address (house_no, road_no, postal_code, area, district, division, country)
      VALUES (${house_no ?? null}, ${road_no ?? null}, ${postal_code}, ${area}, ${district}, ${division}, ${country})
      RETURNING address_id
    `;

    await sql`
      INSERT INTO Seller_Address (seller_id, address_id)
      VALUES (${id}, ${addr[0].address_id})
    `;

    res.status(201).json({ success: true, data: { address_id: addr[0].address_id } });
  } catch (error) {
    console.error("Error in addSellerAddress:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get seller profile with all details
export const getSellerProfile = async (req, res) => {
  const { id } = req.params;

  try {
    const seller = await sql`
      SELECT seller_id, seller_name, store_name, store_description,
             seller_since, is_verified
      FROM Sellers WHERE seller_id = ${id}
    `;

    if (seller.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    // Get seller's emails
    const emails = await sql`
      SELECT email FROM Seller_Email WHERE seller_id = ${id}
    `;

    // Get seller's phones
    const phones = await sql`
      SELECT phone_number FROM Seller_Phone WHERE seller_id = ${id}
    `;

    // Get seller's addresses
    const addresses = await sql`
      SELECT a.address_id, a.house_no, a.road_no, a.postal_code,
             a.area, a.district, a.division, a.country
      FROM Seller_Address sa
      JOIN Address a ON sa.address_id = a.address_id
      WHERE sa.seller_id = ${id}
    `;

    const sellerProfile = {
      ...seller[0],
      emails: emails.map(e => e.email),
      phones: phones.map(p => p.phone_number),
      addresses
    };

    res.status(200).json({ success: true, data: sellerProfile });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get seller sales analytics (overall, recent sales, and month/year breakdown)
export const getSellerSalesSummary = async (req, res) => {
  const { id } = req.params;

  try {
    const sellerExists = await sql`
      SELECT seller_id
      FROM Sellers
      WHERE seller_id = ${id}
      LIMIT 1
    `;

    if (sellerExists.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    const totals = await sql`
      SELECT
        COALESCE(SUM(oi.quantity), 0)::INT AS total_units_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0)::NUMERIC(12,2) AS total_sales_amount,
        COALESCE(COUNT(DISTINCT o.order_id), 0)::INT AS total_orders
      FROM Order_Item oi
      JOIN Product_Variation pv ON oi.product_variation_id = pv.product_variation_id
      JOIN Product p ON pv.product_id = p.product_id
      JOIN Orders o ON oi.order_id = o.order_id
      WHERE p.seller_id = ${id}
        AND o.order_status IN ('DELIVERED', 'SUCCESSFUL')
    `;

    const salesHistory = await sql`
      SELECT
        oi.order_item_id,
        oi.order_id,
        o.order_date,
        o.order_status,
        pv.product_id,
        oi.product_name,
        oi.quantity,
        oi.unit_price,
        (oi.quantity * oi.unit_price)::NUMERIC(12,2) AS line_total,
        oi.variation_type,
        oi.variation_value
      FROM Order_Item oi
      JOIN Product_Variation pv ON oi.product_variation_id = pv.product_variation_id
      JOIN Product p ON pv.product_id = p.product_id
      JOIN Orders o ON oi.order_id = o.order_id
      WHERE p.seller_id = ${id}
        AND o.order_status IN ('DELIVERED', 'SUCCESSFUL')
      ORDER BY o.order_date DESC, oi.order_item_id DESC
      LIMIT 200
    `;

    const monthlyBreakdown = await sql`
      SELECT
        EXTRACT(YEAR FROM o.order_date)::INT AS year,
        EXTRACT(MONTH FROM o.order_date)::INT AS month,
        TO_CHAR(o.order_date, 'Mon YYYY') AS month_year,
        pv.product_id,
        oi.product_name,
        COALESCE(SUM(oi.quantity), 0)::INT AS units_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0)::NUMERIC(12,2) AS total_amount
      FROM Order_Item oi
      JOIN Product_Variation pv ON oi.product_variation_id = pv.product_variation_id
      JOIN Product p ON pv.product_id = p.product_id
      JOIN Orders o ON oi.order_id = o.order_id
      WHERE p.seller_id = ${id}
        AND o.order_status IN ('DELIVERED', 'SUCCESSFUL')
      GROUP BY
        EXTRACT(YEAR FROM o.order_date),
        EXTRACT(MONTH FROM o.order_date),
        TO_CHAR(o.order_date, 'Mon YYYY'),
        pv.product_id,
        oi.product_name
      ORDER BY year DESC, month DESC, units_sold DESC
    `;

    return res.status(200).json({
      success: true,
      data: {
        seller_id: Number(id),
        total_units_sold: totals[0]?.total_units_sold ?? 0,
        total_sales_amount: totals[0]?.total_sales_amount ?? 0,
        total_orders: totals[0]?.total_orders ?? 0,
        sales_history: salesHistory,
        monthly_breakdown: monthlyBreakdown,
      },
    });
  } catch (error) {
    console.error("Error in getSellerSalesSummary:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Update seller profile
export const updateSellerProfile = async (req, res) => {
  const { id } = req.params;
  const { seller_name, seller_password, store_name, store_description, emails, phones } = req.body;
  const hasSellerName = seller_name !== undefined;
  const hasSellerPassword = seller_password !== undefined;
  const normalizedSellerName = hasSellerName ? normalizeSellerName(seller_name) : null;
  const normalizedSellerPassword = hasSellerPassword ? String(seller_password) : null;
  const normalizedEmails = Array.isArray(emails)
    ? emails
        .map((email) => normalizeEmail(email))
        .filter((email) => email.length > 0)
    : null;
  const normalizedPhones = Array.isArray(phones)
    ? phones
        .map((phone) => normalizePhone(phone))
        .filter((phone) => phone.length > 0)
    : null;

  if (hasSellerName && !normalizedSellerName) {
    return res.status(400).json({ success: false, message: "seller_name cannot be empty" });
  }

  if (hasSellerPassword && normalizedSellerPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  if (normalizedEmails) {
    const invalidEmail = normalizedEmails.find((email) => !isValidEmail(email));

    if (invalidEmail) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    const uniqueEmails = new Set(normalizedEmails.map((email) => email.toLowerCase()));
    if (uniqueEmails.size !== normalizedEmails.length) {
      return res.status(409).json({ success: false, message: "Duplicate emails are not allowed" });
    }
  }

  if (normalizedPhones) {
    const uniquePhones = new Set(normalizedPhones);
    if (uniquePhones.size !== normalizedPhones.length) {
      return res.status(409).json({ success: false, message: "Duplicate phone numbers are not allowed" });
    }
  }

  try {
    if (hasSellerName) {
      const existingSeller = await sql`
        SELECT seller_id
        FROM Sellers
        WHERE LOWER(TRIM(seller_name)) = LOWER(${normalizedSellerName})
          AND seller_id <> ${id}
        LIMIT 1
      `;

      if (existingSeller.length > 0) {
        return res.status(409).json({ success: false, message: "Seller username already exists" });
      }
    }

    if (normalizedEmails && normalizedEmails.length > 0) {
      const existingEmailOwner = await sql`
        SELECT seller_id, email
        FROM Seller_Email
        WHERE LOWER(TRIM(email)) = ANY(${normalizedEmails.map((email) => email.toLowerCase())})
          AND seller_id <> ${id}
        LIMIT 1
      `;

      if (existingEmailOwner.length > 0) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }
    }

    if (normalizedPhones && normalizedPhones.length > 0) {
      const existingPhoneOwner = await sql`
        SELECT seller_id, phone_number
        FROM Seller_Phone
        WHERE TRIM(phone_number) = ANY(${normalizedPhones})
          AND seller_id <> ${id}
        LIMIT 1
      `;

      if (existingPhoneOwner.length > 0) {
        return res.status(409).json({ success: false, message: "Phone number already registered" });
      }
    }

    // Update basic seller info
    const updated = await sql`
      UPDATE Sellers
      SET seller_name      = COALESCE(${hasSellerName ? normalizedSellerName : null}, seller_name),
          seller_password   = COALESCE(${hasSellerPassword ? normalizedSellerPassword : null}, seller_password),
          store_name        = COALESCE(${store_name ?? null}, store_name),
          store_description = COALESCE(${store_description ?? null}, store_description)
      WHERE seller_id = ${id}
      RETURNING seller_id, seller_name, store_name, store_description, is_verified
    `;

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    // Update emails if provided
    if (normalizedEmails) {
      // Remove existing emails
      await sql`DELETE FROM Seller_Email WHERE seller_id = ${id}`;
      
      // Add new emails
      for (const email of normalizedEmails) {
        await sql`
          INSERT INTO Seller_Email (seller_id, email)
          VALUES (${id}, ${email})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // Update phones if provided
    if (normalizedPhones) {
      // Remove existing phones
      await sql`DELETE FROM Seller_Phone WHERE seller_id = ${id}`;
      
      // Add new phones
      for (const phone of normalizedPhones) {
        await sql`
          INSERT INTO Seller_Phone (seller_id, phone_number)
          VALUES (${id}, ${phone})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    res.status(200).json({ success: true, data: updated[0] });
  } catch (error) {
    const constraint = String(error?.constraint || error?.constraint_name || "");
    const errorMessage = String(error?.message || "");

    if (error?.code === "23505") {
      if (constraint.includes("seller_email") || constraint.includes("email") || errorMessage.includes("Seller_Email")) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      if (constraint.includes("seller_phone") || constraint.includes("phone") || errorMessage.includes("Seller_Phone")) {
        return res.status(409).json({ success: false, message: "Phone number already registered" });
      }
    }

    res.status(500).json({ success: false, message: "Server Error" });
  }
};
