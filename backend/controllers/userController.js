import { sql } from "../config/db.js";

// User Authentication
export const authenticateUser = async (req, res) => {
  const { user_name, password } = req.body;

  try {
    const user = await sql`
      SELECT user_id, user_name, password FROM Users WHERE user_name = ${user_name}
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

  try {
    const newUser = await sql`
      INSERT INTO Users (user_name, password)
      VALUES (${user_name}, ${password})
      RETURNING user_id, user_name
    `;
    const user_id = newUser[0]?.user_id;
    // Add email and phone if provided
    if (user_id && email) {
      await sql`
        INSERT INTO User_Email (user_id, email)
        VALUES (${user_id}, ${email})
        ON CONFLICT DO NOTHING
      `;
    }
    if (user_id && phone_number) {
      await sql`
        INSERT INTO User_Phone (user_id, phone_number)
        VALUES (${user_id}, ${phone_number})
        ON CONFLICT DO NOTHING
      `;
    }
    res.status(201).json({ success: true, data: newUser[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Update user
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { user_name, password } = req.body;

  try {
    const updatedUser = await sql`
      UPDATE Users
      SET user_name = COALESCE(${user_name ?? null}, user_name),
          password  = COALESCE(${password ?? null}, password)
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

  try {
    // Update basic user info
    const updatedUser = await sql`
      UPDATE Users
      SET user_name = COALESCE(${user_name ?? null}, user_name),
          password  = COALESCE(${password ?? null}, password)
      WHERE user_id = ${id}
      RETURNING user_id, user_name
    `;

    if (updatedUser.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update emails if provided
    if (emails && Array.isArray(emails)) {
      // Remove existing emails
      await sql`DELETE FROM User_Email WHERE user_id = ${id}`;
      
      // Add new emails
      for (const email of emails) {
        if (email.trim()) {
          await sql`
            INSERT INTO User_Email (user_id, email)
            VALUES (${id}, ${email})
            ON CONFLICT DO NOTHING
          `;
        }
      }
    }

    // Update phones if provided
    if (phones && Array.isArray(phones)) {
      // Remove existing phones
      await sql`DELETE FROM User_Phone WHERE user_id = ${id}`;
      
      // Add new phones
      for (const phone of phones) {
        if (phone.trim()) {
          await sql`
            INSERT INTO User_Phone (user_id, phone_number)
            VALUES (${id}, ${phone})
            ON CONFLICT DO NOTHING
          `;
        }
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
    console.error('Error in updateUserProfile:', error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
