const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    console.log(`🔍 Checking role: ${req.user.roleId} against ${allowedRoles}`);

    if (allowedRoles.includes(req.user.roleId)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: "Forbidden: Insufficient permissions",
      });
    }
  };
};

module.exports = { checkRole };
