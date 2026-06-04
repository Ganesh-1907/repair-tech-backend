import jwt from 'jsonwebtoken';
import { normalizeRole } from '../utils/roles.js';

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Authentication required' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'repairboy_dev_secret');
    req.user = { ...user, role: normalizeRole(user.role) };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
