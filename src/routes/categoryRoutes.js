const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

// Public routes
router.get("/", getCategories);
router.get("/:id", getCategoryById);

// Admin routes
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  createCategory
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  updateCategory
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  deleteCategory
);

module.exports = router;