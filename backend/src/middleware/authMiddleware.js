const jwt = require('jsonwebtoken');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables. Exiting...");
  process.exit(1);
}

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(403).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(403).json({ message: 'Malformed token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized, invalid token' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase()?.trim();
    const allowedRoles = roles.map(r => r.toLowerCase().trim());
    if (!req.user || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  authorizeRoles
};
