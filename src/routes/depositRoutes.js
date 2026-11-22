import express from 'express';
import {
  createDeposit,
  getMyDeposits,
  getDepositById,
} from '../controllers/depositController.js';
import { authenticate } from '../middleware/auth.js';
import { financialLimiter } from '../middleware/rateLimiter.js';
import { uploadPaymentProof } from '../middleware/upload.js';
import { validateRequest } from '../middleware/validation.js';
import { depositSchema } from '../validators/schemas.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  financialLimiter,
  uploadPaymentProof.single('proofFile'),
  validateRequest(depositSchema),
  createDeposit
);
router.get('/', getMyDeposits);
router.get('/:id', getDepositById);

export default router;
