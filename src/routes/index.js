import express from 'express';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth.js';
import { authLimiter, financialLimiter } from '../middleware/rateLimiter.js';
import * as authController from '../controllers/authController.js';
import * as planController from '../controllers/planController.js';
import * as orderController from '../controllers/orderController.js';
import * as walletController from '../controllers/walletController.js';
import * as teamController from '../controllers/teamController.js';
import * as taskController from '../controllers/taskController.js';
import * as adminController from '../controllers/adminController.js';
import * as uploadController from '../controllers/uploadController.js';
import * as cmsPageController from '../controllers/cmsPageController.js';
import * as mediaController from '../controllers/mediaController.js';
import * as inquiryController from '../controllers/inquiryController.js';
import * as navigationController from '../controllers/navigationController.js';
import * as appearanceController from '../controllers/appearanceController.js';
import * as seoController from '../controllers/seoController.js';
import { uploadPaymentProof, uploadMediaFile } from '../middleware/upload.js';

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
router.get('/plans', optionalAuthenticate, planController.getPlans);
router.post('/plans/buy', authenticate, financialLimiter, planController.buyPlan);

// Active Container Leases & Daily Yields
router.get('/orders/my', authenticate, orderController.getMyOrders);
router.post('/orders/claim', authenticate, financialLimiter, orderController.claimDailyYield);

// Wallet & Financial Transactions (Rate-limited to prevent race conditions)
router.post(
  '/upload/payment-screenshot',
  authenticate,
  uploadPaymentProof.single('screenshot'),
  uploadController.uploadPaymentScreenshot
);
router.post('/wallet/recharge', authenticate, financialLimiter, walletController.submitRecharge);
router.post('/wallet/withdraw', authenticate, financialLimiter, walletController.submitWithdrawal);
router.get('/wallet/records', authenticate, walletController.getRecords);

// Team & Referral Network
router.get('/team', authenticate, teamController.getTeamData);

// Lucky Cargo Wheel (Rate-limited to prevent spin duplication)
router.post('/task/spin', authenticate, financialLimiter, taskController.spinWheel);

// ==========================================
// PUBLIC CMS, INQUIRY & APPEARANCE APIS
// ==========================================
router.get('/pages', cmsPageController.getPublicPages);
router.get('/pages/:slug', cmsPageController.getPublicPageBySlug);
router.post('/contact', inquiryController.submitInquiry);
router.get('/navigation', navigationController.getPublicNavigation);
router.get('/appearance', appearanceController.getPublicAppearance);

// ==========================================
// ADVANCED ADMINISTRATIVE CONTROL CENTER APIS
// ==========================================

// 1. Operations Overview & Real-Time Stats
router.get('/admin/overview', authenticate, requireAdmin, adminController.getOverview);

// 2. Member User Management & Audit Actions
router.get('/admin/users', authenticate, requireAdmin, adminController.getUsers);
router.get('/admin/users/:id', authenticate, requireAdmin, adminController.getUserDetails);
router.patch('/admin/users/:id/status', authenticate, requireAdmin, adminController.updateUserStatus);
router.post('/admin/users/:id/notes', authenticate, requireAdmin, adminController.addUserNote);
router.post('/admin/users/:userId/balance', authenticate, requireAdmin, adminController.adjustUserBalance);

// 3. Deposit Request Management
router.get('/admin/deposits', authenticate, requireAdmin, adminController.getDeposits);
router.get('/admin/recharges', authenticate, requireAdmin, adminController.getDeposits);
router.post('/admin/deposits/:id/action', authenticate, requireAdmin, adminController.handleDepositAction);
router.post('/admin/recharges/:id/approve', authenticate, requireAdmin, adminController.approveRecharge);
router.post('/admin/recharges/:id/reject', authenticate, requireAdmin, adminController.rejectRecharge);

// 4. Withdrawal Request & Payout Management
router.get('/admin/withdrawals', authenticate, requireAdmin, adminController.getWithdrawals);
router.post('/admin/withdrawals/:id/action', authenticate, requireAdmin, adminController.handleWithdrawalAction);
router.post('/admin/withdrawals/:id/approve', authenticate, requireAdmin, adminController.approveWithdrawal);
router.post('/admin/withdrawals/:id/reject', authenticate, requireAdmin, adminController.rejectWithdrawal);

// 5. Container Fleet Plan Management
router.get('/admin/plans', authenticate, requireAdmin, adminController.getPlans);
router.post('/admin/plans', authenticate, requireAdmin, adminController.createPlan);
router.patch('/admin/plans/:id', authenticate, requireAdmin, adminController.updatePlan);
router.delete('/admin/plans/:id', authenticate, requireAdmin, adminController.archivePlan);

// 6. Fleet Orders
router.get('/admin/orders', authenticate, requireAdmin, adminController.getOrders);

// 7. Ledger & Financial Reconciliation
router.get('/admin/transactions', authenticate, requireAdmin, adminController.getTransactions);
router.get('/admin/reconcile/:userId', authenticate, requireAdmin, adminController.reconcileUserLedger);

// 8. Security Audit Logs & Settings
router.get('/admin/audit-logs', authenticate, requireAdmin, adminController.getAuditLogs);
router.get('/admin/settings', authenticate, requireAdmin, adminController.getSettings);
router.patch('/admin/settings', authenticate, requireAdmin, adminController.updateSettings);

// 9. Staff & Permissions
router.get('/admin/staff', authenticate, requireAdmin, adminController.getStaff);
router.post('/admin/staff', authenticate, requireAdmin, adminController.createStaff);
router.patch('/admin/staff/:id', authenticate, requireAdmin, adminController.updateStaff);
router.delete('/admin/staff/:id', authenticate, requireAdmin, adminController.deleteStaff);

// 10. CMS Page & Section Builder Management
router.get('/admin/pages', authenticate, requireAdmin, cmsPageController.getAdminPages);
router.get('/admin/pages/:id', authenticate, requireAdmin, cmsPageController.getAdminPageById);
router.post('/admin/pages', authenticate, requireAdmin, cmsPageController.createPage);
router.patch('/admin/pages/:id', authenticate, requireAdmin, cmsPageController.updatePage);
router.delete('/admin/pages/:id', authenticate, requireAdmin, cmsPageController.deletePage);
router.post('/admin/pages/:id/duplicate', authenticate, requireAdmin, cmsPageController.duplicatePage);

// 11. Media Library & File Asset Manager
router.post(
  '/admin/media/upload',
  authenticate,
  requireAdmin,
  uploadMediaFile.single('file'),
  mediaController.uploadMedia
);
router.get('/admin/media', authenticate, requireAdmin, mediaController.getMediaList);
router.patch('/admin/media/:id', authenticate, requireAdmin, mediaController.updateMediaItem);
router.delete('/admin/media/:id', authenticate, requireAdmin, mediaController.deleteMediaItem);

// 12. Inquiries & Customer Leads Desk
router.get('/admin/inquiries', authenticate, requireAdmin, inquiryController.getInquiries);
router.get('/admin/inquiries/:id', authenticate, requireAdmin, inquiryController.getInquiryById);
router.patch('/admin/inquiries/:id', authenticate, requireAdmin, inquiryController.updateInquiry);
router.delete('/admin/inquiries/:id', authenticate, requireAdmin, inquiryController.deleteInquiry);

// 13. Navigation & Menu Architecture
router.get('/admin/navigation', authenticate, requireAdmin, navigationController.getAdminNavigations);
router.patch('/admin/navigation/:location', authenticate, requireAdmin, navigationController.updateNavigationMenu);

// 14. Website Appearance, Branding & Design Engine
router.get('/admin/appearance', authenticate, requireAdmin, appearanceController.getAdminAppearance);
router.patch('/admin/appearance', authenticate, requireAdmin, appearanceController.updateAppearance);

// 15. SEO Auditing & Verification
router.get('/admin/seo/audit', authenticate, requireAdmin, seoController.getSeoAuditReport);

export default router;
