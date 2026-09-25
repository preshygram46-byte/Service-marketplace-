const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isValidEmail, isStrongPassword } = require("../utils/validators");

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required", data: null });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email address", data: null });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters", data: null });
    }
    if (role && !["customer", "provider"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role", data: null });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already in use", data: null });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      phone,
      role: role || "customer",
    });

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong", data: null });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required", data: null });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password", data: null });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid email or password", data: null });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong", data: null });
  }
};
