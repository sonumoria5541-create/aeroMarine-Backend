import Recharge from '../models/Recharge.js';
import Withdrawal from '../models/Withdrawal.js';
import Record from '../models/Record.js';
import User from '../models/User.js';

export const submitRecharge = async (req, res) => {
  try {
    const user = req.user;
    const { amount, channel = 'Channel A Online', utr } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 250) {
      return res.status(400).json({ status: 'failed', message: 'Minimum recharge amount is ₹250' });
    }

    if (!utr || utr.trim().length < 6) {
      return res.status(400).json({ status: 'failed', message: 'Please enter a valid 12-digit UTR / Reference number' });
    }

    const recharge = new Recharge({
      userId: user._id,
      userPhone: user.phone,
      amount: numAmount,
      channel,
      utr: utr.trim(),
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

    return res.status(201).json({
      status: 'success',
      message: 'Recharge submitted successfully! Balance will be credited automatically once verified.',
      recharge,
    });
  } catch (error) {
    console.error('[Wallet] Recharge error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error submitting recharge' });
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

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 120) {
      return res.status(400).json({ status: 'failed', message: 'Minimum withdrawal amount is ₹120' });
    }

    const currentBalance = user.wallet.availableBalance || 0;
    if (currentBalance < numAmount) {
      return res.status(400).json({
        status: 'failed',
        message: `Insufficient withdrawable balance. Available: ₹${currentBalance}, requested: ₹${numAmount}`,
      });
    }

    const fee = Math.round(numAmount * 0.10); // 10% fee
    const receiveAmount = numAmount - fee;

    // Deduct immediately from availableBalance
    user.wallet.availableBalance -= numAmount;
    user.wallet.totalWithdrawn = (user.wallet.totalWithdrawn || 0) + numAmount;
    await user.save();

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

    return res.status(201).json({
      status: 'success',
      message: 'Withdrawal submitted! Requests are reviewed and credited within banking hours (06:00 - 19:00).',
      withdrawal,
      wallet: user.wallet,
    });
  } catch (error) {
    console.error('[Wallet] Withdrawal error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error processing withdrawal request' });
  }
};

export const getRecords = async (req, res) => {
  try {
    const { tab } = req.query; // 'all', 'withdraw', 'recharge'
    const filter = { userId: req.user._id };

    if (tab === 'withdraw') {
      filter.category = 'withdraw';
    } else if (tab === 'recharge') {
      filter.category = 'recharge';
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
