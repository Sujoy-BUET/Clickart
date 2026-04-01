import { sql } from "../config/db.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isValidEmail = (value) => EMAIL_REGEX.test(String(value || "").trim());
const normalizeSellerName = (value) => String(value || "").trim();
const normalizeEmail = (value) => String(value || "").trim();
const normalizePhone = (value) => String(value || "").trim();

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
      SELECT seller_id, seller_name, store_name, store_description,
             seller_since, is_verified
      FROM Sellers
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
      SELECT seller_id, seller_name, store_name, store_description,
             seller_since, is_verified
      FROM Sellers WHERE seller_id = ${id}
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
  const { seller_name, seller_password, store_name, store_description, is_verified } = req.body;
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
          store_description = COALESCE(${store_description ?? null}, store_description),
          is_verified       = COALESCE(${is_verified ?? null}, is_verified)
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

    await sql`
      INSERT INTO Seller_Email (seller_id, email)
      VALUES (${id}, ${normalizedEmail})
    `;
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

    await sql`
      INSERT INTO Seller_Phone (seller_id, phone_number)
      VALUES (${id}, ${normalizedPhone})
    `;
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
