const mongoose = require("mongoose");
const Booking = require("../models/Booking");

function response(res, status, success, message, data) {
  return res.status(status).json({ success, message, data });
}

exports.getBookingRequests = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ providerId: req.user.id })
      .populate("customerId", "name")
      .populate("serviceId", "name price category")
      .sort({ requestedDate: 1 });
    return response(res, 200, true, "Booking requests fetched successfully", bookings);
  } catch (error) {
    return next(error);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return response(res, 400, false, "Invalid booking id", null);
    }
    const allowedStatuses = ["pending", "accepted", "declined", "completed", "cancelled"];
    const { status } = req.body;
    if (!allowedStatuses.includes(status)) {
      return response(res, 400, false, "Invalid booking status", null);
    }

    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, providerId: req.user.id },
      { status },
      { new: true, runValidators: true }
    )
      .populate("customerId", "name")
      .populate("serviceId", "name price category");
    if (!booking) return response(res, 404, false, "Booking not found", null);
    return response(res, 200, true, "Booking status updated successfully", booking);
  } catch (error) {
    return next(error);
  }
};