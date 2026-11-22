import express from 'express';
import {
  getDashboardSummary,
  getEarnings,
  getReferrals,
} from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/summary', getDashboardSummary);
router.get('/earnings', getEarnings);
router.get('/referrals', getReferrals);

export default router;
