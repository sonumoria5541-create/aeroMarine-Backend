import { WithdrawalRequest } from '../models/WithdrawalRequest.js';
import { PayoutDestination } from '../models/PayoutDestination.js';
import { reserveWithdrawal } from '../services/ledgerService.js';
import { queueAndSendEmail } from '../services/emailService.js';
import { logAudit } from '../services/auditService.js';
import { toPaise } from '../utils/currency.js';
import { config } from '../config/env.js';

export const createWithdrawal = async (req, res, next) => {
  try {
    const { amount, payoutMethod, destination, idempotencyKey } = req.body;
    const userId = req.user._id;

    if (idempotencyKey) {
      const existing = await WithdrawalRequest.findOne({ idempotencyKey, user: userId });
      if (existing) {
        return res.json({
          success: true,
          message: 'Withdrawal request already processed.',
          data: existing,
        });
      }
    }

    const feePercent = 0; // Configurable fee
    const fee = Math.round(amount * (feePercent / 100));
    const netAmount = amount - fee;

    const amountPaise = toPaise(amount);
    const feePaise = toPaise(fee);
    const netAmountPaise = toPaise(netAmount);

    const requestId = `WTH-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Prepare masked snapshot
    let snapshot = {};
    if (payoutMethod === 'bank_transfer') {
      const rawAcc = destination.accountNumber || '';
      snapshot = {
        accountHolderName: destination.accountHolderName,
        bankName: destination.bankName,
        accountNumberMasked: rawAcc.length > 4 ? `••••••••${rawAcc.slice(-4)}` : '••••',
        ifscCode: destination.ifscCode,
      };
    } else {
      const rawUpi = destination.upiId || '';
      const [u, d] = rawUpi.split('@');
      snapshot = {
        upiIdMasked: u ? `${u.slice(0, 2)}••••@${d || 'bank'}` : '••••@upi',
      };
    }

    // Atomically reserve funds in the ledger
    const ledgerTxn = await reserveWithdrawal({
      userId,
      amount,
      fee,
      netAmount,
      currency: 'INR',
      referenceId: null,
      idempotencyKey,
      actorId: userId,
      isDemo: config.appMode === 'DEMO',
    });

    // Create withdrawal record
    const withdrawal = await WithdrawalRequest.create({
      requestId,
      user: userId,
      amount,
      amountPaise,
      fee,
      feePaise,
      netAmount,
      netAmountPaise,
      currency: 'INR',
      payoutMethod,
      payoutDestinationSnapshot: snapshot,
      status: 'pending',
      reservedLedgerTransaction: ledgerTxn._id,
      idempotencyKey,
      isDemo: config.appMode === 'DEMO',
    });

    // Update referenceId on the reservation transaction
    ledgerTxn.referenceId = withdrawal._id;
    await ledgerTxn.save();

    // Optionally save payout destination for reuse
    if (destination.saveDestination) {
      await PayoutDestination.create({
        user: userId,
        type: payoutMethod === 'bank_transfer' ? 'bank_account' : 'upi',
        label: destination.label || 'Saved Payout',
        accountHolderName: destination.accountHolderName,
        bankName: destination.bankName,
        accountNumber: destination.accountNumber,
        ifscCode: destination.ifscCode,
        upiId: destination.upiId,
      });
    }

    // Queue email if user has email
    if (req.user.email) {
      await queueAndSendEmail({
        recipient: req.user.email,
        recipientName: req.user.name,
        template: 'withdrawal_submitted',
        data: {
          requestId,
          userName: req.user.name,
          amount,
          fee,
          netAmount,
        },
        eventKey: `withdrawal_created_${requestId}`,
      });
    }

    await logAudit({
      actor: req.user,
      action: 'WITHDRAWAL_REQUESTED',
      targetType: 'WithdrawalRequest',
      targetId: withdrawal._id,
      reason: `User requested withdrawal of ₹${amount}. Funds reserved in ledger.`,
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal requested successfully. Funds are now reserved pending review.',
      data: withdrawal,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyWithdrawals = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    if (req.query.status) {
      query.status = req.query.status;
    }

    const [withdrawals, total] = await Promise.all([
      WithdrawalRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      WithdrawalRequest.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getWithdrawalById = async (req, res, next) => {
  try {
    const withdrawal = await WithdrawalRequest.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found.',
        code: 'NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: withdrawal,
    });
  } catch (err) {
    next(err);
  }
};
