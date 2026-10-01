const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
} = require("../controllers/bookingController");

router.use(requireAuth);

router.post("/", requireRole("customer"), createBooking);
router.get("/", getBookings);
router.get("/:id", getBookingById);
router.patch("/:id/status", updateBookingStatus);

module.exports = router;
