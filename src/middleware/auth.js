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

    // Check if account has been blocked or suspended by administrator
    if (user.status === 'blocked' || user.status === 'suspended') {
      return res.status(403).json({
        status: 'failed',
        message: `Your account has been ${user.status} by administration. Reason: ${user.statusReason || 'Policy compliance verification'}.`,
        accountStatus: user.status,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ status: 'failed', message: 'Session expired or invalid token. Please log in.' });
  }
};

export const optionalAuthenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.aeromarine_token) {
      token = req.cookies.aeromarine_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwtAccessSecret);
      const user = await User.findById(decoded.userId);
      if (user && user.status !== 'blocked' && user.status !== 'suspended') {
        req.user = user;
      }
    }
  } catch (error) {
    // Non-blocking: continue as guest if unauthenticated or token is expired
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  const adminRoles = ['admin', 'owner', 'finance', 'support', 'operations'];
  if (!req.user || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({ status: 'failed', message: 'Access denied. Administrator rights required.' });
  }
  next();
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'failed', message: 'Authentication required' });
    }

    // Super Admin / Owner has all permissions implicitly
    if (req.user.role === 'owner' || req.user.role === 'admin') {
      return next();
    }

    // Check role or granular permission array
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }

    // Role-based defaults
    const rolePermissions = {
      finance: ['deposits.view', 'deposits.review', 'withdrawals.view', 'withdrawals.process', 'transactions.view', 'reports.export'],
      support: ['users.view', 'users.notes', 'transactions.view', 'dashboard.view'],
      operations: ['plans.view', 'plans.update', 'orders.view', 'dashboard.view'],
    };

    if (rolePermissions[req.user.role]?.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      status: 'failed',
      message: `Access denied. Permission '${permission}' is required for this operational action.`,
    });
  };
};
