const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Service Marketplace API is running",
    data: null,
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/categories", categoryRoutes);

// Add more routes here as they're built by teammates:
// app.use("/api/services", serviceRoutes);

// 404 handler for unmatched routes
app.use((req, res) => {
  res
    .status(404)
    .json({ success: false, message: "Route not found", data: null });
});

// Global error handler (keep this last)
app.use(errorHandler);

module.exports = app;
