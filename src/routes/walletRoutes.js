import express from 'express';
import {
  getWallet,
  getTransactions,
  getTransactionById,
  getPayoutDestinations,
  addPayoutDestination,
  deletePayoutDestination,
  reconcileUserWallet,
} from '../controllers/walletController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getWallet);
router.get('/reconcile', reconcileUserWallet);
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);

router.get('/payout-destinations', getPayoutDestinations);
router.post('/payout-destinations', addPayoutDestination);
router.delete('/payout-destinations/:id', deletePayoutDestination);

export default router;
