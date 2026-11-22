import { DepositRequest } from '../models/DepositRequest.js';
import { WalletAccount } from '../models/WalletAccount.js';
import { toPaise } from '../utils/currency.js';
import { queueAndSendEmail } from '../services/emailService.js';
import { logAudit } from '../services/auditService.js';
import { config } from '../config/env.js';
import { getOrCreateWallet } from '../services/ledgerService.js';

export const createDeposit = async (req, res, next) => {
  try {
    const { amount, paymentMethod = 'upi', paymentReference, idempotencyKey } = req.body;
    const userId = req.user._id;

    // Check duplicate reference or idempotencyKey
    if (idempotencyKey) {
      const existing = await DepositRequest.findOne({ idempotencyKey, user: userId });
      if (existing) {
        return res.json({
          success: true,
          message: 'Deposit request already recorded.',
          data: existing,
        });
      }
    }

    const amountPaise = toPaise(amount);
    const requestId = `DEP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    let proofFile = null;
    if (req.file) {
      proofFile = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };
    }

    const deposit = await DepositRequest.create({
      requestId,
      user: userId,
      amount,
      amountPaise,
      currency: 'INR',
      paymentMethod,
      paymentReference: paymentReference.trim(),
      proofFile,
      status: 'pending',
      idempotencyKey,
      isDemo: config.appMode === 'DEMO',
    });

    // Atomically increment pendingDepositsPaise in wallet (available balance is NOT touched!)
    await getOrCreateWallet(userId);
    await WalletAccount.findOneAndUpdate(
      { user: userId },
      { $inc: { pendingDepositsPaise: amountPaise } }
    );

    // Queue email to admin
    await queueAndSendEmail({
      recipient: config.adminNotificationEmail,
      template: 'admin_deposit_notification',
      data: {
        requestId,
        userName: req.user.name,
        userPhone: req.user.phone,
        amount,
        paymentMethod,
        paymentReference,
      },
      eventKey: `deposit_admin_alert_${requestId}`,
    });

    await logAudit({
      actor: req.user,
      action: 'DEPOSIT_REQUESTED',
      targetType: 'DepositRequest',
      targetId: deposit._id,
      reason: `User submitted deposit of ₹${amount} with UTR: ${paymentReference}`,
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Deposit request submitted successfully. Waiting for operations verification.',
      data: deposit,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyDeposits = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    if (req.query.status) {
      query.status = req.query.status;
    }

    const [deposits, total] = await Promise.all([
      DepositRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      DepositRequest.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: deposits,
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

export const getDepositById = async (req, res, next) => {
  try {
    const deposit = await DepositRequest.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Deposit request not found.',
        code: 'NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: deposit,
    });
  } catch (err) {
    next(err);
  }
};
