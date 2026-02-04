import { sql } from "../config/db.js";

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await sql`
      SELECT user_id, user_name, role FROM users
      ORDER BY user_id DESC
    `;
    console.log("fetched users", users);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.log("Error in getUsers function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get user by ID [parameterized query]
export const getUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await sql`
      SELECT user_id, user_name, role FROM users WHERE user_id = ${id}
    `;

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user[0] });
  } catch (error) {
    console.log("Error in getUser function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create new user
export const createUser = async (req, res) => {
  const { user_id, user_name, password, role } = req.body;

  if (!user_id || !user_name || !password || !role) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  if (!['CUSTOMER', 'SELLER'].includes(role)) {
    return res.status(400).json({ success: false, message: "Role must be CUSTOMER or SELLER" });
  }

  try {
    const newUser = await sql`
      INSERT INTO users (user_id, user_name, password, role)
      VALUES (${user_id}, ${user_name}, ${password}, ${role})
      RETURNING user_id, user_name, role
    `;

    res.status(201).json({ success: true, data: newUser[0] });
  } catch (error) {
    console.log("Error in createUser function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Update user
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { user_name, password, role } = req.body;

  try {
    const updatedUser = await sql`
      UPDATE users
      SET user_name = COALESCE(${user_name}, user_name),
          password = COALESCE(${password}, password),
          role = COALESCE(${role}, role)
      WHERE user_id = ${id}
      RETURNING user_id, user_name, role
    `;

    if (updatedUser.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: updatedUser[0] });
  } catch (error) {
    console.log("Error in updateUser function", error);
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
    console.log("Error in deleteUser function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
