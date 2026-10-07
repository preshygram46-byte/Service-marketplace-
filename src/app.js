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
app.disable("x-powered-by");

const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error("Not allowed by CORS");
    error.status = 403;
    return callback(error);
  },
  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    data: null,
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
