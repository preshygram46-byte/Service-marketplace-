const mongoose = require("mongoose");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const Service = require("../models/Service");
const { BOOKING_STATUSES } = require("../models/Booking");
const { ok, fail } = require("../utils/respond");

const ROLES = ["customer", "provider", "admin"];
const isId = (id) => mongoose.isValidObjectId(id);

// GET /api/admin/users  optional ?role=provider
exports.getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) {
      if (!ROLES.includes(req.query.role)) return fail(res, 400, "Invalid role filter");
      filter.role = req.query.role;
    }
    const users = await User.find(filter).select("-passwordHash").sort({ createdAt: -1 });
    return ok(res, 200, "Users retrieved successfully", users);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// PATCH /api/admin/users/:id/role  body: { role }
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!isId(req.params.id)) return fail(res, 400, "Invalid user id");
    if (!ROLES.includes(role)) return fail(res, 400, `role must be one of: ${ROLES.join(", ")}`);
    if (req.params.id === req.user.id) return fail(res, 400, "You cannot change your own role");

    const user = await User.findById(req.params.id);
    if (!user) return fail(res, 404, "User not found");

    user.role = role;
    await user.save();

    const { passwordHash, ...safeUser } = user.toObject();
    return ok(res, 200, "User role updated successfully", safeUser);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid user id");
    if (req.params.id === req.user.id) return fail(res, 400, "You cannot delete your own account");

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return fail(res, 404, "User not found");

    return ok(res, 200, "User deleted successfully", null);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// GET /api/admin/stats — counts for the admin dashboard
exports.getStats = async (req, res) => {
  try {
    const [users, services, reviews, bookingsByStatus] = await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Service.countDocuments(),
      Review.countDocuments(),
      Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const usersByRole = Object.fromEntries(ROLES.map((r) => [r, 0]));
    users.forEach((u) => { usersByRole[u._id] = u.count; });

    const bookings = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0]));
    bookingsByStatus.forEach((b) => { bookings[b._id] = b.count; });

    return ok(res, 200, "Stats retrieved successfully", {
      users: usersByRole,
      totalUsers: Object.values(usersByRole).reduce((a, b) => a + b, 0),
      totalServices: services,
      totalReviews: reviews,
      bookings,
      totalBookings: Object.values(bookings).reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};
