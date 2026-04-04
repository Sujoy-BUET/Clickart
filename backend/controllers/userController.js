import { sql } from "../config/db.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isValidEmail = (value) => EMAIL_REGEX.test(String(value || "").trim());
const normalizeUsername = (value) => String(value || "").trim();
const normalizeEmail = (value) => String(value || "").trim();
const normalizePhone = (value) => String(value || "").trim();

// User Authentication
export const authenticateUser = async (req, res) => {
  const { user_name, password } = req.body;
  const normalizedUserName = normalizeUsername(user_name);

  if (!normalizedUserName || !password) {
    return res.status(400).json({ success: false, message: "user_name and password are required" });
  }

  try {
    const user = await sql`
      SELECT user_id, user_name, password
      FROM Users
      WHERE LOWER(TRIM(user_name)) = LOWER(${normalizedUserName})
      ORDER BY user_id DESC
      LIMIT 1
    `;

    if (user.length === 0 || user[0].password !== password) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Get user's emails and phones
    const emails = await sql`
      SELECT email FROM User_Email WHERE user_id = ${user[0].user_id}
    `;
    
    const phones = await sql`
      SELECT phone_number FROM User_Phone WHERE user_id = ${user[0].user_id}
    `;

    const userData = {
      user_id: user[0].user_id,
      user_name: user[0].user_name,
      emails: emails.map(e => e.email),
      phones: phones.map(p => p.phone_number)
    };

    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await sql`
      SELECT user_id, user_name,password FROM Users
      ORDER BY user_id DESC
    `;
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get user by ID (with addresses)
export const getUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await sql`
      SELECT user_id, user_name FROM Users WHERE user_id = ${id}
    `;

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const addresses = await sql`
      SELECT a.address_id, a.house_no, a.road_no, a.postal_code,
             a.area, a.district, a.division, a.country
      FROM User_Address ua
      JOIN Address a ON ua.address_id = a.address_id
      WHERE ua.user_id = ${id}
    `;

    res.status(200).json({ success: true, data: { ...user[0], addresses } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Create new user
export const createUser = async (req, res) => {
  const { user_name, password, email, phone_number } = req.body;
  const normalizedUserName = normalizeUsername(user_name);
  const normalizedEmail = email ? normalizeEmail(email) : null;
  const normalizedPhone = phone_number ? normalizePhone(phone_number) : null;

  if (!normalizedUserName || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  try {
    const existingUser = await sql`
      SELECT user_id
      FROM Users
      WHERE LOWER(TRIM(user_name)) = LOWER(${normalizedUserName})
      LIMIT 1
    `;

    if (existingUser.length > 0) {
      return res.status(409).json({ success: false, message: "Username already exists" });
    }

    if (normalizedEmail) {
      const existingEmail = await sql`
        SELECT user_id
        FROM User_Email
        WHERE LOWER(TRIM(email)) = LOWER(${normalizedEmail})
        LIMIT 1
      `;

      if (existingEmail.length > 0) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }
    }

    if (normalizedPhone) {
      const existingPhone = await sql`
        SELECT user_id
        FROM User_Phone
        WHERE TRIM(phone_number) = ${normalizedPhone}
        LIMIT 1
      `;

      if (existingPhone.length > 0) {
        return res.status(409).json({ success: false, message: "Phone number already registered" });
      }
    }

    const newUser = await sql`
      INSERT INTO Users (user_name, password)
      VALUES (${normalizedUserName}, ${password})
      RETURNING user_id, user_name
    `;
    const user_id = newUser[0]?.user_id;
    // Add optional email/phone through a single DB procedure call.
    if (user_id) {
      try {
        await sql`CALL proc_upsert_user_contacts(${user_id}, ${normalizedEmail || null}, ${normalizedPhone || null})`;
      } catch (callError) {
        if (String(callError?.code || '') !== '42883') {
          throw callError;
        }

        if (normalizedEmail) {
          await sql`
            INSERT INTO User_Email (user_id, email)
            VALUES (${user_id}, ${normalizedEmail})
            ON CONFLICT DO NOTHING
          `;
        }

        if (normalizedPhone) {
          await sql`
            INSERT INTO User_Phone (user_id, phone_number)
            VALUES (${user_id}, ${normalizedPhone})
            ON CONFLICT DO NOTHING
          `;
        }
      }
    }
    res.status(201).json({ success: true, data: newUser[0] });
  } catch (error) {
    const constraint = String(error?.constraint || error?.constraint_name || "");
    const errorMessage = String(error?.message || "");

    if (error?.code === "23505") {
      if (constraint.includes("user_email") || constraint.includes("email") || errorMessage.includes("User_Email")) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      if (constraint.includes("user_phone") || constraint.includes("phone") || errorMessage.includes("User_Phone")) {
        return res.status(409).json({ success: false, message: "Phone number already registered" });
      }
    }

    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Update user
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { user_name, password } = req.body;
  const hasUsername = user_name !== undefined;
  const hasPassword = password !== undefined;
  const normalizedUserName = hasUsername ? normalizeUsername(user_name) : null;
  const normalizedPassword = hasPassword ? String(password) : null;

  if (hasUsername && !normalizedUserName) {
    return res.status(400).json({ success: false, message: "user_name cannot be empty" });
  }

  if (hasPassword && normalizedPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  try {
    if (hasUsername) {
      const existingUser = await sql`
        SELECT user_id
        FROM Users
        WHERE LOWER(TRIM(user_name)) = LOWER(${normalizedUserName})
          AND user_id <> ${id}
        LIMIT 1
      `;

      if (existingUser.length > 0) {
        return res.status(409).json({ success: false, message: "Username already exists" });
      }
    }

    const updatedUser = await sql`
      UPDATE Users
      SET user_name = COALESCE(${hasUsername ? normalizedUserName : null}, user_name),
          password  = COALESCE(${hasPassword ? normalizedPassword : null}, password)
      WHERE user_id = ${id}
      RETURNING user_id, user_name
    `;

    if (updatedUser.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: updatedUser[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await sql`
      DELETE FROM Users
      WHERE user_id = ${id}
      RETURNING user_id, user_name
    `;

    if (deletedUser.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Add address to user
export const addUserAddress = async (req, res) => {
  const { id } = req.params;
  const { house_no, road_no, postal_code, area, district, division, country } = req.body;

  try {
    const addr = await sql`
      INSERT INTO Address (house_no, road_no, postal_code, area, district, division, country)
      VALUES (${house_no ?? null}, ${road_no ?? null}, ${postal_code}, ${area}, ${district}, ${division}, ${country})
      RETURNING address_id
    `;

    await sql`
      INSERT INTO User_Address (user_id, address_id)
      VALUES (${id}, ${addr[0].address_id})
    `;

    res.status(201).json({ success: true, data: { address_id: addr[0].address_id } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get user profile with all details
export const getUserProfile = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await sql`
      SELECT user_id, user_name FROM Users WHERE user_id = ${id}
    `;

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Get user's emails
    const emails = await sql`
      SELECT email FROM User_Email WHERE user_id = ${id}
    `;
    
    // Get user's phones
    const phones = await sql`
      SELECT phone_number FROM User_Phone WHERE user_id = ${id}
    `;

    // Get user's addresses
    const addresses = await sql`
      SELECT a.address_id, a.house_no, a.road_no, a.postal_code,
             a.area, a.district, a.division, a.country
      FROM User_Address ua
      JOIN Address a ON ua.address_id = a.address_id
      WHERE ua.user_id = ${id}
    `;

    const userProfile = {
      ...user[0],
      emails: emails.map(e => e.email),
      phones: phones.map(p => p.phone_number),
      addresses
    };

    res.status(200).json({ success: true, data: userProfile });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const { user_name, password, emails, phones, addresses } = req.body;
  const hasUsername = user_name !== undefined;
  const hasPassword = password !== undefined;
  const normalizedUserName = hasUsername ? normalizeUsername(user_name) : null;
  const normalizedPassword = hasPassword ? String(password) : null;
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

  if (hasUsername && !normalizedUserName) {
    return res.status(400).json({ success: false, message: "user_name cannot be empty" });
  }

  if (hasPassword && normalizedPassword.length < 6) {
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
    if (hasUsername) {
      const existingUser = await sql`
        SELECT user_id
        FROM Users
        WHERE LOWER(TRIM(user_name)) = LOWER(${normalizedUserName})
          AND user_id <> ${id}
        LIMIT 1
      `;

      if (existingUser.length > 0) {
        return res.status(409).json({ success: false, message: "Username already exists" });
      }
    }

    if (normalizedEmails && normalizedEmails.length > 0) {
      const existingEmailOwner = await sql`
        SELECT user_id, email
        FROM User_Email
        WHERE LOWER(TRIM(email)) = ANY(${normalizedEmails.map((email) => email.toLowerCase())})
          AND user_id <> ${id}
        LIMIT 1
      `;

      if (existingEmailOwner.length > 0) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }
    }

    if (normalizedPhones && normalizedPhones.length > 0) {
      const existingPhoneOwner = await sql`
        SELECT user_id, phone_number
        FROM User_Phone
        WHERE TRIM(phone_number) = ANY(${normalizedPhones})
          AND user_id <> ${id}
        LIMIT 1
      `;

      if (existingPhoneOwner.length > 0) {
        return res.status(409).json({ success: false, message: "Phone number already registered" });
      }
    }

    // Update basic user info
    const updatedUser = await sql`
      UPDATE Users
      SET user_name = COALESCE(${hasUsername ? normalizedUserName : null}, user_name),
          password  = COALESCE(${hasPassword ? normalizedPassword : null}, password)
      WHERE user_id = ${id}
      RETURNING user_id, user_name
    `;

    if (updatedUser.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update emails if provided
    if (normalizedEmails) {
      // Remove existing emails
      await sql`DELETE FROM User_Email WHERE user_id = ${id}`;
      
      // Add new emails
      for (const email of normalizedEmails) {
        await sql`
          INSERT INTO User_Email (user_id, email)
          VALUES (${id}, ${email})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // Update phones if provided
    if (normalizedPhones) {
      // Remove existing phones
      await sql`DELETE FROM User_Phone WHERE user_id = ${id}`;
      
      // Add new phones
      for (const phone of normalizedPhones) {
        await sql`
          INSERT INTO User_Phone (user_id, phone_number)
          VALUES (${id}, ${phone})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // Update addresses if provided
    if (addresses && Array.isArray(addresses)) {
      // Get current user addresses
      const currentAddresses = await sql`
        SELECT ua.address_id
        FROM User_Address ua
        WHERE ua.user_id = ${id}
      `;

      // Remove old address associations
      await sql`DELETE FROM User_Address WHERE user_id = ${id}`;

      // Delete addresses that were only associated with this user
      for (const addr of currentAddresses) {
        const otherUsers = await sql`
          SELECT COUNT(*)::INT as count
          FROM User_Address
          WHERE address_id = ${addr.address_id}
        `;
        
        if (otherUsers[0].count === 0) {
          await sql`DELETE FROM Address WHERE address_id = ${addr.address_id}`;
        }
      }

      // Add new addresses
      for (const addr of addresses) {
        if (addr.postal_code && addr.postal_code.trim()) {
          const newAddr = await sql`
            INSERT INTO Address (house_no, road_no, postal_code, area, district, division, country)
            VALUES (${addr.house_no ?? null}, ${addr.road_no ?? null}, ${addr.postal_code}, ${addr.area ?? null}, ${addr.district ?? null}, ${addr.division ?? null}, ${addr.country ?? 'Bangladesh'})
            RETURNING address_id
          `;

          await sql`
            INSERT INTO User_Address (user_id, address_id)
            VALUES (${id}, ${newAddr[0].address_id})
          `;
        }
      }
    }

    res.status(200).json({ success: true, data: updatedUser[0] });
  } catch (error) {
    const constraint = String(error?.constraint || error?.constraint_name || "");
    const errorMessage = String(error?.message || "");

    if (error?.code === "23505") {
      if (constraint.includes("user_email") || constraint.includes("email") || errorMessage.includes("User_Email")) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      if (constraint.includes("user_phone") || constraint.includes("phone") || errorMessage.includes("User_Phone")) {
        return res.status(409).json({ success: false, message: "Phone number already registered" });
      }
    }

    console.error('Error in updateUserProfile:', error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
