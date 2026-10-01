const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  getUsers,
  updateUserRole,
  deleteUser,
  getStats,
} = require("../controllers/adminController");

router.use(requireAuth, requireRole("admin"));

router.get("/users", getUsers);
router.patch("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);
router.get("/stats", getStats);

module.exports = router;
