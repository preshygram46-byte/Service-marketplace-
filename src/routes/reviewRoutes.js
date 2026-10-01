const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  createReview,
  getReviews,
  deleteReview,
} = require("../controllers/reviewController");

router.get("/", getReviews); // public
router.post("/", requireAuth, requireRole("customer"), createReview);
router.delete("/:id", requireAuth, requireRole("admin"), deleteReview);

module.exports = router;
