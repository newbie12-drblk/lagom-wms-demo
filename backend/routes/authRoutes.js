const express = require("express");
const {
  login,
  getCurrentUser,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

router.post("/login", login);
router.get("/me", verifyToken, getCurrentUser);
router.get("/users", verifyToken, checkRole("admin"), getAllUsers);
router.post("/users", verifyToken, checkRole("admin"), createUser);
router.put("/users/:id", verifyToken, checkRole("admin"), updateUser);
router.delete("/users/:id", verifyToken, checkRole("admin"), deleteUser);

module.exports = router;
