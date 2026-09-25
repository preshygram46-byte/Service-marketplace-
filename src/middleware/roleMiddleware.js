// Usage: requireRole("provider") or requireRole("provider", "admin")
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Insufficient permission", data: null });
    }
    next();
  };
}

module.exports = requireRole;
