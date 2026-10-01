const mongoose = require("mongoose");

const BOOKING_STATUSES = ["pending", "accepted", "declined", "completed", "cancelled"];

const bookingSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    requestedDate: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: BOOKING_STATUSES, default: "pending" },
  },
  { timestamps: true }
);

bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
