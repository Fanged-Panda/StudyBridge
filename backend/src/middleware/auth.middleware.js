import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = header.split(' ')[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Reads the token when it is present but never rejects the request: used to
// personalise public pages ("did I already vote?") without requiring a login.
export const optionalAuth = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  return next();
};

export const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  try {
    const user = await prisma.student.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (user?.role === 'admin') {
      req.user.role = 'admin';
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden: Administrator privileges required.',
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Authorization check failed.' });
  }
};

export default authMiddleware;
