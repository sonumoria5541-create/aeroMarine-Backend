import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { authLimiter, financialLimiter } from '../middleware/rateLimiter.js';
import * as authController from '../controllers/authController.js';
import * as planController from '../controllers/planController.js';
import * as orderController from '../controllers/orderController.js';
import * as walletController from '../controllers/walletController.js';
import * as teamController from '../controllers/teamController.js';
import * as taskController from '../controllers/taskController.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// Reference app compatibility: /system/login
router.post('/system/login', authLimiter, authController.login);

// Authentication routes (Rate-limited to prevent brute-force attacks)
router.post('/auth/register', authLimiter, authController.register);
router.post('/auth/login', authLimiter, authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', authenticate, authController.getMe);
router.post('/auth/bank', authenticate, authController.updateBank);
router.post('/auth/change-password', authenticate, authLimiter, authController.changePassword);
router.post('/auth/avatar', authenticate, authController.updateAvatar);

// Container Fleet Plan routes
router.get('/plans', planController.getPlans);
router.post('/plans/buy', authenticate, financialLimiter, planController.buyPlan);

// Active Container Leases & Daily Yields
router.get('/orders/my', authenticate, orderController.getMyOrders);
router.post('/orders/claim', authenticate, financialLimiter, orderController.claimDailyYield);

// Wallet & Financial Transactions (Rate-limited to prevent race conditions)
router.post('/wallet/recharge', authenticate, financialLimiter, walletController.submitRecharge);
router.post('/wallet/withdraw', authenticate, financialLimiter, walletController.submitWithdrawal);
router.get('/wallet/records', authenticate, walletController.getRecords);

// Team & Referral Network
router.get('/team', authenticate, teamController.getTeamData);

// Lucky Cargo Wheel (Rate-limited to prevent spin duplication)
router.post('/task/spin', authenticate, financialLimiter, taskController.spinWheel);

// Administrative Routes (Protected by both authentication and role-based access control)
router.get('/admin/overview', authenticate, requireAdmin, adminController.getOverview);
router.get('/admin/recharges', authenticate, requireAdmin, adminController.getRecharges);
router.post('/admin/recharges/:id/approve', authenticate, requireAdmin, adminController.approveRecharge);
router.post('/admin/recharges/:id/reject', authenticate, requireAdmin, adminController.rejectRecharge);
router.get('/admin/withdrawals', authenticate, requireAdmin, adminController.getWithdrawals);
router.post('/admin/withdrawals/:id/approve', authenticate, requireAdmin, adminController.approveWithdrawal);
router.post('/admin/withdrawals/:id/reject', authenticate, requireAdmin, adminController.rejectWithdrawal);
router.get('/admin/users', authenticate, requireAdmin, adminController.getUsers);
router.post('/admin/users/:userId/balance', authenticate, requireAdmin, adminController.adjustUserBalance);
router.get('/admin/reconcile/:userId', authenticate, requireAdmin, adminController.reconcileUserLedger);
router.get('/admin/audit-logs', authenticate, requireAdmin, adminController.getAuditLogs);

export default router;
