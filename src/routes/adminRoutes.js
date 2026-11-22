import express from 'express';
import {
  getAdminOverview,
  getUsers,
  updateUserStatus,
  getAdminDeposits,
  handleDepositAction,
  getAdminWithdrawals,
  handleWithdrawalAction,
  getAdminPlans,
  createPlan,
  updatePlan,
  getAdminOrders,
  previewEarningsBatch,
  postEarningsBatch,
  getAuditLogs,
  getSettings,
  updateSettings,
} from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  adminDepositActionSchema,
  adminWithdrawalActionSchema,
} from '../validators/schemas.js';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin', 'super_admin'));

// Overview
router.get('/overview', getAdminOverview);

// Users
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);

// Deposits
router.get('/deposits', getAdminDeposits);
router.post('/deposits/:id/action', validateRequest(adminDepositActionSchema), handleDepositAction);

// Withdrawals
router.get('/withdrawals', getAdminWithdrawals);
router.post(
  '/withdrawals/:id/action',
  validateRequest(adminWithdrawalActionSchema),
  handleWithdrawalAction
);

// Plans
router.get('/plans', getAdminPlans);
router.post('/plans', createPlan);
router.patch('/plans/:id', updatePlan);

// Orders
router.get('/orders', getAdminOrders);

// Earnings Engine
router.get('/earnings/preview', previewEarningsBatch);
router.post('/earnings/preview', previewEarningsBatch);
router.post('/earnings/post', postEarningsBatch);

// Audit logs & Settings
router.get('/audit-logs', getAuditLogs);
router.get('/settings', getSettings);
router.patch('/settings', updateSettings);

export default router;
