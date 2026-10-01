const mongoose = require("mongoose");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const { ok, fail } = require("../utils/respond");

const isId = (id) => mongoose.isValidObjectId(id);

// POST /api/reviews  (customer)  body: { bookingId, rating, comment }
exports.createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || rating === undefined) {
      return fail(res, 400, "bookingId and rating are required");
    }
    if (!isId(bookingId)) return fail(res, 400, "Invalid bookingId");

    const score = Number(rating);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return fail(res, 400, "rating must be a whole number from 1 to 5");
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return fail(res, 404, "Booking not found");
    if (String(booking.customerId) !== req.user.id) {
      return fail(res, 403, "You can only review your own bookings");
    }
    if (booking.status !== "completed") {
      return fail(res, 400, "You can only review a completed booking");
    }

    const existing = await Review.findOne({ bookingId });
    if (existing)
      return fail(res, 409, "This booking has already been reviewed");

    const review = await Review.create({
      bookingId: booking._id,
      customerId: booking.customerId,
      providerId: booking.providerId,
      serviceId: booking.serviceId,
      rating: score,
      comment,
    });

    return ok(res, 201, "Review submitted successfully", review);
  } catch (error) {
    if (error.code === 11000)
      return fail(res, 409, "This booking has already been reviewed");
    return fail(res, 500, "Something went wrong");
  }
};

// GET /api/reviews?serviceId=...  or  ?providerId=...  (public)
// data: { reviews, averageRating, count }
exports.getReviews = async (req, res) => {
  try {
    const { serviceId, providerId } = req.query;
    if (!serviceId && !providerId) {
      return fail(
        res,
        400,
        "Provide serviceId or providerId as a query parameter",
      );
    }

    const filter = {};
    if (serviceId) {
      if (!isId(serviceId)) return fail(res, 400, "Invalid serviceId");
      filter.serviceId = serviceId;
    }
    if (providerId) {
      if (!isId(providerId)) return fail(res, 400, "Invalid providerId");
      filter.providerId = providerId;
    }

    const reviews = await Review.find(filter)
      .populate("customerId", "name")
      .sort({ createdAt: -1 });

    const count = reviews.length;
    const averageRating = count
      ? Math.round(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10,
        ) / 10
      : 0;

    return ok(res, 200, "Reviews retrieved successfully", {
      reviews,
      averageRating,
      count,
    });
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// DELETE /api/reviews/:id  (admin — moderation)
exports.deleteReview = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid review id");
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return fail(res, 404, "Review not found");
    return ok(res, 200, "Review deleted successfully", null);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};
