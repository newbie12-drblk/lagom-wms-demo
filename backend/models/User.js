const db = require("../config/database");
// KHÔNG dùng bcrypt nữa

const User = {
  findByUsername: async (username) => {
    const [rows] = await db.execute("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    return rows[0];
  },

  findById: async (id) => {
    const [rows] = await db.execute(
      "SELECT id, username, fullName, email, roleId, isActive, customPermissions, createdAt, lastLoginAt FROM users WHERE id = ?",
      [id],
    );
    return rows[0];
  },

  updateLastLogin: async (id) => {
    await db.execute("UPDATE users SET lastLoginAt = NOW() WHERE id = ?", [id]);
  },

  getAll: async () => {
    const [rows] = await db.execute(
      "SELECT id, username, fullName, email, roleId, isActive, customPermissions, createdAt FROM users ORDER BY createdAt DESC",
    );
    return rows;
  },

  create: async (userData) => {
    // Lưu password plain text (KHÔNG HASH)
    const [result] = await db.execute(
      `INSERT INTO users (username, password, fullName, email, roleId, isActive, customPermissions) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userData.username,
        userData.password, // plain text
        userData.fullName,
        userData.email,
        userData.roleId,
        userData.isActive !== undefined ? userData.isActive : true,
        userData.customPermissions || null,
      ],
    );
    return result.insertId;
  },

  update: async (id, userData) => {
    const updates = [];
    const values = [];

    if (userData.fullName !== undefined) {
      updates.push("fullName = ?");
      values.push(userData.fullName);
    }
    if (userData.email !== undefined) {
      updates.push("email = ?");
      values.push(userData.email);
    }
    if (userData.roleId !== undefined) {
      updates.push("roleId = ?");
      values.push(userData.roleId);
    }
    if (userData.isActive !== undefined) {
      updates.push("isActive = ?");
      values.push(userData.isActive);
    }
    if (userData.customPermissions !== undefined) {
      updates.push("customPermissions = ?");
      values.push(JSON.stringify(userData.customPermissions));
    }
    if (userData.password) {
      // Lưu plain text (KHÔNG HASH)
      updates.push("password = ?");
      values.push(userData.password);
    }

    if (updates.length === 0) return false;

    values.push(id);
    await db.execute(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
    return true;
  },

  delete: async (id) => {
    const [result] = await db.execute("DELETE FROM users WHERE id = ?", [id]);
    return result.affectedRows > 0;
  },

  // SO SÁNH TRỰC TIẾP (KHÔNG BCRYPT)
  verifyPassword: async (plainPassword, hashedPassword) => {
    return plainPassword === hashedPassword;
  },
};

module.exports = User;
