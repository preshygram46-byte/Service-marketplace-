const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const { BOOKING_STATUSES } = require("../models/Booking");
const { ok, fail } = require("../utils/respond");

const isId = (id) => mongoose.isValidObjectId(id);

// Who may move a booking from one status to another
const TRANSITIONS = {
  provider: {
    pending: ["accepted", "declined"],
    accepted: ["completed"],
  },
  customer: {
    pending: ["cancelled"],
    accepted: ["cancelled"],
  },
};

const populateBooking = (query) =>
  query
    .populate("serviceId", "title price")
    .populate("customerId", "name email phone")
    .populate("providerId", "name email phone");

// Can this user see / act on this booking?
function canAccess(user, booking) {
  if (user.role === "admin") return true;
  const customerId = String(booking.customerId._id || booking.customerId);
  const providerId = String(booking.providerId._id || booking.providerId);
  return user.id === customerId || user.id === providerId;
}

// POST /api/bookings  (customer)
exports.createBooking = async (req, res) => {
  try {
    const { serviceId, requestedDate, notes } = req.body;

    if (!serviceId || !requestedDate) {
      return fail(res, 400, "serviceId and requestedDate are required");
    }
    if (!isId(serviceId)) {
      return fail(res, 400, "Invalid serviceId");
    }

    const date = new Date(requestedDate);
    if (Number.isNaN(date.getTime())) {
      return fail(res, 400, "Invalid requestedDate");
    }
    if (date < new Date()) {
      return fail(res, 400, "requestedDate must be in the future");
    }

    if (notes !== undefined && (typeof notes !== "string" || notes.length > 1000)) {
      return fail(res, 400, "notes must be text with at most 1000 characters");
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return fail(res, 404, "Service not found");
    }
    if (String(service.providerId) === req.user.id) {
      return fail(res, 400, "You cannot book your own service");
    }

    const booking = await Booking.create({
      customerId: req.user.id,
      providerId: service.providerId, // taken from the service, never from the request
      serviceId: service._id,
      requestedDate: date,
      notes,
    });

    const populated = await populateBooking(Booking.findById(booking._id));
    return ok(res, 201, "Booking created successfully", populated);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// GET /api/bookings  (customer: own, provider: received, admin: all)

exports.getBookings = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "customer") filter.customerId = req.user.id;
    if (req.user.role === "provider") filter.providerId = req.user.id;

    if (req.query.status) {
      if (!BOOKING_STATUSES.includes(req.query.status)) {
        return fail(res, 400, "Invalid status filter");
      }
      filter.status = req.query.status;
    }

    const bookings = await populateBooking(
      Booking.find(filter).sort({ createdAt: -1 }),
    );
    return ok(res, 200, "Bookings retrieved successfully", bookings);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// GET /api/bookings/:id  (owner customer, owner provider, admin)
exports.getBookingById = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, "Invalid booking id");

    const booking = await populateBooking(Booking.findById(req.params.id));
    if (!booking) return fail(res, 404, "Booking not found");
    if (!canAccess(req.user, booking))
      return fail(res, 403, "Insufficient permission");

    return ok(res, 200, "Booking retrieved successfully", booking);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// PATCH /api/bookings/:id/status  body: { status }
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!isId(req.params.id)) return fail(res, 400, "Invalid booking id");
    if (!BOOKING_STATUSES.includes(status)) {
      return fail(
        res,
        400,
        `status must be one of: ${BOOKING_STATUSES.join(", ")}`,
      );
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return fail(res, 404, "Booking not found");
    if (!canAccess(req.user, booking))
      return fail(res, 403, "Insufficient permission");

    const { role, id } = req.user;

    if (role !== "admin") {
      // A user acts in the role they hold on THIS booking
      const actingAs =
        String(booking.providerId) === id
          ? "provider"
          : String(booking.customerId) === id
            ? "customer"
            : null;

      const allowed = (TRANSITIONS[actingAs] || {})[booking.status] || [];
      if (!allowed.includes(status)) {
        return fail(
          res,
          400,
          `Cannot change booking from '${booking.status}' to '${status}'`,
        );
      }
    }

    booking.status = status;
    await booking.save();

    const populated = await populateBooking(Booking.findById(booking._id));
    return ok(res, 200, "Booking status updated successfully", populated);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};
