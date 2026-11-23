import Recharge from '../models/Recharge.js';
import Withdrawal from '../models/Withdrawal.js';
import Record from '../models/Record.js';
import User from '../models/User.js';
import { config } from '../config/env.js';
import { queueAndSendEmail } from '../services/emailService.js';
import { reserveWithdrawal } from '../services/ledgerService.js';

export const submitRecharge = async (req, res) => {
  try {
    const user = req.user;
    const { amount, channel = 'Channel 1 (VIP Fast UPI)', utr, proofUrl, proofPublicId } = req.body;

    const numAmount = Math.floor(Number(amount));
    if (!numAmount || isNaN(numAmount) || numAmount < 250) {
      return res.status(400).json({ status: 'failed', message: 'Minimum recharge amount is ₹250' });
    }

    if (numAmount > 10000000) {
      return res.status(400).json({ status: 'failed', message: 'Amount exceeds maximum permitted single recharge limit' });
    }

    const cleanUtr = (utr || '').toString().trim();
    if (cleanUtr.length < 6 || cleanUtr.length > 30) {
      return res.status(400).json({ status: 'failed', message: 'Please enter a valid 12-digit UTR / Reference number' });
    }

    const cleanProofUrl = (proofUrl || '').toString().trim();
    if (!cleanProofUrl) {
      return res.status(400).json({
        status: 'failed',
        message: 'Payment screenshot is strictly required. Please upload your payment proof before submitting.',
      });
    }

    // Prevent duplicate UTR submission across pending/approved requests
    const existingRecharge = await Recharge.findOne({
      utr: cleanUtr,
      status: { $in: ['pending', 'approved'] },
    });

    if (existingRecharge) {
      return res.status(400).json({
        status: 'failed',
        message: 'This UTR / Reference number has already been submitted or verified.',
      });
    }

    const recharge = new Recharge({
      userId: user._id,
      userPhone: user.phone,
      amount: numAmount,
      channel: channel.slice(0, 50),
      utr: cleanUtr,
      proofUrl: cleanProofUrl,
      proofPublicId: (proofPublicId || '').toString().trim(),
      status: 'pending',
    });
    await recharge.save();

    const record = new Record({
      userId: user._id,
      category: 'recharge',
      title: 'Recharge',
      amount: numAmount,
      isCredit: true,
      status: 'Pending',
      referenceId: recharge._id.toString(),
    });
    await record.save();

    // Trigger asynchronous administrative email notification
    try {
      if (config.adminNotificationEmail) {
        await queueAndSendEmail({
          recipient: config.adminNotificationEmail,
          template: 'admin_deposit_alert',
          data: {
            amount: numAmount,
            phone: user.phone,
            reference: cleanUtr,
            channel: recharge.channel,
          },
          eventKey: `recharge_req_${recharge._id}`,
        });
      }
    } catch (emailErr) {
      console.warn('[Email Service Notice] Could not queue deposit notification email:', emailErr.message);
    }

    return res.status(201).json({
      status: 'success',
      message: 'Recharge submitted successfully! Balance will be credited automatically once verified.',
      recharge,
    });
  } catch (error) {
    console.error('[Wallet] Recharge error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error submitting recharge request' });
  }
};

export const submitWithdrawal = async (req, res) => {
  try {
    const user = req.user;
    const { amount } = req.body;

    if (!user.bankAccount || !user.bankAccount.isBound || !user.bankAccount.accountNumber) {
      return res.status(400).json({
        status: 'failed',
        message: 'No bank account added yet. Please add your bank details in Profile -> Bank Card first.',
      });
    }

    const numAmount = Math.floor(Number(amount));
    if (!numAmount || isNaN(numAmount) || numAmount < 120) {
      return res.status(400).json({ status: 'failed', message: 'Minimum withdrawal amount is ₹120' });
    }

    if (numAmount > 1000000) {
      return res.status(400).json({ status: 'failed', message: 'Amount exceeds maximum permitted single withdrawal' });
    }

    // Atomic Guard: Verify and reserve available balance in one atomic database operation
    // This strictly prevents double-spending and race conditions from concurrent requests
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        'wallet.availableBalance': { $gte: numAmount },
      },
      {
        $inc: {
          'wallet.availableBalance': -numAmount,
          'wallet.totalWithdrawn': numAmount,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      const currentBalance = user.wallet?.availableBalance || 0;
      return res.status(400).json({
        status: 'failed',
        message: `Insufficient withdrawable balance. Available: ₹${currentBalance}, requested: ₹${numAmount}`,
      });
    }

    const fee = Math.round(numAmount * 0.10); // 10% fee
    const receiveAmount = numAmount - fee;

    const withdrawal = new Withdrawal({
      userId: user._id,
      userPhone: user.phone,
      amount: numAmount,
      fee,
      receiveAmount,
      bankDetails: {
        realName: user.bankAccount.realName,
        ifsc: user.bankAccount.ifsc,
        accountNumber: user.bankAccount.accountNumber,
      },
      status: 'pending',
    });
    await withdrawal.save();

    const record = new Record({
      userId: user._id,
      category: 'withdraw',
      title: 'Withdraw',
      amount: numAmount,
      isCredit: false,
      status: 'Pending',
      referenceId: withdrawal._id.toString(),
    });
    await record.save();

    // Dual-entry Ledger Reservation
    try {
      await reserveWithdrawal({
        userId: user._id,
        amount: numAmount,
        fee,
        netAmount: receiveAmount,
        referenceId: withdrawal._id.toString(),
        isDemo: config.appMode === 'DEMO',
      });
    } catch (ledgerErr) {
      console.warn('[Ledger Notice] Background ledger reservation sync:', ledgerErr.message);
    }

    // Trigger Admin Email Notification
    try {
      if (config.adminNotificationEmail) {
        await queueAndSendEmail({
          recipient: config.adminNotificationEmail,
          template: 'admin_withdrawal_alert',
          data: {
            amount: numAmount,
            receiveAmount,
            phone: user.phone,
            accountNumber: user.bankAccount.accountNumber,
            ifsc: user.bankAccount.ifsc,
            realName: user.bankAccount.realName,
          },
          eventKey: `withdrawal_req_${withdrawal._id}`,
        });
      }
    } catch (emailErr) {
      console.warn('[Email Service Notice] Could not queue withdrawal notification email:', emailErr.message);
    }

    return res.status(201).json({
      status: 'success',
      message: 'Withdrawal submitted! Requests are reviewed and credited within banking hours (06:00 - 19:00).',
      withdrawal,
      wallet: updatedUser.wallet,
    });
  } catch (error) {
    console.error('[Wallet] Withdrawal error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error processing withdrawal request' });
  }
};

export const getRecords = async (req, res) => {
  try {
    const { tab } = req.query;
    const filter = { userId: req.user._id };

    if (tab === 'withdraw') {
      filter.category = 'withdraw';
    } else if (tab === 'recharge') {
      filter.category = 'recharge';
    } else if (tab && ['order', 'yield', 'commission', 'reward'].includes(tab)) {
      filter.category = tab;
    }

    const records = await Record.find(filter).sort({ createdAt: -1 }).limit(100);

    return res.json({
      status: 'success',
      data: records,
    });
  } catch (error) {
    console.error('[Wallet] Get records error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error loading account records' });
  }
};
