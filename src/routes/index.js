import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as planController from '../controllers/planController.js';
import * as orderController from '../controllers/orderController.js';
import * as walletController from '../controllers/walletController.js';
import * as teamController from '../controllers/teamController.js';
import * as taskController from '../controllers/taskController.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', name: 'AeroMarine API', time: new Date().toISOString() });
});

// Reference app compatibility: /system/login
router.post('/system/login', authController.login);

// Auth routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', authenticate, authController.getMe);
router.post('/auth/bank', authenticate, authController.updateBank);
router.post('/auth/change-password', authenticate, authController.changePassword);
router.post('/auth/avatar', authenticate, authController.updateAvatar);

// Plan routes
router.get('/plans', planController.getPlans);
router.post('/plans/buy', authenticate, planController.buyPlan);

// Order routes (My income & container leases)
router.get('/orders/my', authenticate, orderController.getMyOrders);
router.post('/orders/claim', authenticate, orderController.claimDailyYield);

// Wallet routes (recharge, withdraw, records)
router.post('/wallet/recharge', authenticate, walletController.submitRecharge);
router.post('/wallet/withdraw', authenticate, walletController.submitWithdrawal);
router.get('/wallet/records', authenticate, walletController.getRecords);

// Team & referral routes
router.get('/team', authenticate, teamController.getTeamData);

// Lucky wheel & tasks
router.post('/task/spin', authenticate, taskController.spinWheel);

// Admin routes
router.get('/admin/overview', authenticate, requireAdmin, adminController.getOverview);
router.get('/admin/recharges', authenticate, requireAdmin, adminController.getRecharges);
router.post('/admin/recharges/:id/approve', authenticate, requireAdmin, adminController.approveRecharge);
router.post('/admin/recharges/:id/reject', authenticate, requireAdmin, adminController.rejectRecharge);
router.get('/admin/withdrawals', authenticate, requireAdmin, adminController.getWithdrawals);
router.post('/admin/withdrawals/:id/approve', authenticate, requireAdmin, adminController.approveWithdrawal);
router.post('/admin/withdrawals/:id/reject', authenticate, requireAdmin, adminController.rejectWithdrawal);
router.get('/admin/users', authenticate, requireAdmin, adminController.getUsers);
router.post('/admin/users/:userId/balance', authenticate, requireAdmin, adminController.adjustUserBalance);

export default router;
