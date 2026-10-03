const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

// Public routes
router.get("/", getServices);
router.get("/:id", getServiceById);

// Provider and admin routes
router.post(
  "/",
  requireAuth,
  requireRole("provider", "admin"),
  createService
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("provider", "admin"),
  updateService
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("provider", "admin"),
  deleteService
);

module.exports = router;