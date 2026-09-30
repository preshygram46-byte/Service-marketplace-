const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getBookingRequests, updateBookingStatus } = require("../controllers/bookingController");

const router = express.Router();

router.use(requireAuth, requireRole("provider"));
router.get("/", getBookingRequests);
router.patch("/:id/status", updateBookingStatus);

module.exports = router;