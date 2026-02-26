import { sql } from "../config/db.js";

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await sql`
      SELECT user_id, user_name FROM users
      ORDER BY user_id DESC
    `;
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("Error in getUsers:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get user by ID (with addresses)
export const getUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await sql`
      SELECT user_id, user_name FROM users WHERE user_id = ${id}
    `;

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const addresses = await sql`
      SELECT a.address_id, a.house_no, a.road_no, a.postal_code,
             pa.area, pa.district, pa.division, pa.country
      FROM user_address ua
      JOIN address a ON ua.address_id = a.address_id
      LEFT JOIN postalarea pa ON a.postal_code = pa.postal_code
      WHERE ua.user_id = ${id}
    `;

    res.status(200).json({ success: true, data: { ...user[0], addresses } });
  } catch (error) {
    console.error("Error in getUser:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create new user
export const createUser = async (req, res) => {
  const { user_name, password } = req.body;

  if (!user_name || !password) {
    return res.status(400).json({ success: false, message: "user_name and password are required" });
  }

  try {
    const newUser = await sql`
      INSERT INTO users (user_name, password)
      VALUES (${user_name}, ${password})
      RETURNING user_id, user_name
    `;

    res.status(201).json({ success: true, data: newUser[0] });
  } catch (error) {
    console.error("Error in createUser:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Update user
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { user_name, password } = req.body;

  try {
    const updatedUser = await sql`
      UPDATE users
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
    console.error("Error in updateUser:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await sql`
      DELETE FROM users
      WHERE user_id = ${id}
      RETURNING user_id, user_name
    `;

    if (deletedUser.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Add address to user
export const addUserAddress = async (req, res) => {
  const { id } = req.params;
  const { house_no, road_no, postal_code } = req.body;

  if (!postal_code) {
    return res.status(400).json({ success: false, message: "postal_code is required" });
  }

  try {
    const addr = await sql`
      INSERT INTO address (house_no, road_no, postal_code)
      VALUES (${house_no ?? null}, ${road_no ?? null}, ${postal_code})
      RETURNING address_id
    `;

    await sql`
      INSERT INTO user_address (user_id, address_id)
      VALUES (${id}, ${addr[0].address_id})
    `;

    res.status(201).json({ success: true, data: { address_id: addr[0].address_id } });
  } catch (error) {
    console.error("Error in addUserAddress:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
