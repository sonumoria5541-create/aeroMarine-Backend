import express from 'express';
import {
  createWithdrawal,
  getMyWithdrawals,
  getWithdrawalById,
} from '../controllers/withdrawalController.js';
import { authenticate } from '../middleware/auth.js';
import { financialLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validation.js';
import { withdrawalSchema } from '../validators/schemas.js';

const router = express.Router();

router.use(authenticate);

router.post('/', financialLimiter, validateRequest(withdrawalSchema), createWithdrawal);
router.get('/', getMyWithdrawals);
router.get('/:id', getWithdrawalById);

export default router;
