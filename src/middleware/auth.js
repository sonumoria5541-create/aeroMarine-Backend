import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config/env.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.aeromarine_token) {
      token = req.cookies.aeromarine_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    if (!token) {
      return res.status(401).json({ status: 'failed', message: 'Authentication required. Please log in.' });
    }

    const decoded = jwt.verify(token, config.jwtAccessSecret);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ status: 'failed', message: 'User not found. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ status: 'failed', message: 'Session expired or invalid token. Please log in.' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ status: 'failed', message: 'Access denied. Admin rights required.' });
  }
  next();
};
