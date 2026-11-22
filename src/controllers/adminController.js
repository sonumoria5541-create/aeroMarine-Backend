import User from '../models/User.js';
import Recharge from '../models/Recharge.js';
import Withdrawal from '../models/Withdrawal.js';
import Order from '../models/Order.js';
import Record from '../models/Record.js';
import { AuditLog } from '../models/AuditLog.js';
import { config } from '../config/env.js';
import { creditDeposit, finalizePaidWithdrawal, releaseWithdrawalReservation, reconcileWallet } from '../services/ledgerService.js';
import { queueAndSendEmail } from '../services/emailService.js';

export const getOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingRecharges = await Recharge.countDocuments({ status: 'pending' });
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    const activeOrders = await Order.countDocuments({ status: 'running' });

    const totalRechargeApproved = await Recharge.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalWithdrawApproved = await Withdrawal.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return res.json({
      status: 'success',
      data: {
        totalUsers,
        pendingRecharges,
        pendingWithdrawals,
        activeOrders,
        totalRecharged: totalRechargeApproved[0]?.total || 0,
        totalWithdrawn: totalWithdrawApproved[0]?.total || 0,
        appMode: config.appMode,
      },
    });
  } catch (error) {
    console.error('[Admin] Overview error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error retrieving admin overview' });
  }
};

export const getRecharges = async (req, res) => {
  try {
    const list = await Recharge.find().sort({ createdAt: -1 }).limit(100);
    return res.json({ status: 'success', data: list });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error fetching recharges' });
  }
};

export const approveRecharge = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = req.user;

    // Atomic State Transition: ensures only a 'pending' recharge can be approved exactly once
    const recharge = await Recharge.findOneAndUpdate(
      { _id: id, status: 'pending' },
      {
        $set: {
          status: 'approved',
          adminRemark: 'Verified and credited by administrator',
          approvedBy: admin._id,
          approvedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!recharge) {
      const checkExists = await Recharge.findById(id);
      if (!checkExists) {
        return res.status(404).json({ status: 'failed', message: 'Recharge request not found' });
      }
      return res.status(400).json({
        status: 'failed',
        message: `Recharge has already been processed (Current status: ${checkExists.status})`,
      });
    }

    // Atomically credit user recharge balance
    const updatedUser = await User.findByIdAndUpdate(
      recharge.userId,
      { $inc: { 'wallet.rechargeBalance': recharge.amount } },
      { new: true }
    );

    // Update Transaction Record
    await Record.findOneAndUpdate(
      { referenceId: recharge._id.toString() },
      { status: 'Success' }
    );

    // Sync Double-Entry Ledger
    try {
      await creditDeposit({
        userId: recharge.userId,
        amount: recharge.amount,
        referenceId: recharge._id.toString(),
        idempotencyKey: `DEP-APP-${recharge._id}`,
        actorId: admin._id,
        isDemo: config.appMode === 'DEMO',
      });
    } catch (ledgerErr) {
      console.warn('[Ledger Notice] Background deposit ledger sync:', ledgerErr.message);
    }

    // Audit Log Entry
    await AuditLog.create({
      actor: admin._id,
      actorPhone: admin.phone,
      actorRole: admin.role,
      action: 'APPROVE_RECHARGE',
      targetType: 'Recharge',
      targetId: recharge._id.toString(),
      afterSnapshot: { amount: recharge.amount, status: 'approved', utr: recharge.utr },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.json({
      status: 'success',
      message: 'Recharge approved and funds credited successfully!',
      recharge,
      userWallet: updatedUser?.wallet,
    });
  } catch (error) {
    console.error('[Admin] Approve recharge error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error approving recharge' });
  }
};

export const rejectRecharge = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Invalid UTR or unverified bank receipt' } = req.body;
    const admin = req.user;

    const recharge = await Recharge.findOneAndUpdate(
      { _id: id, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          adminRemark: reason,
          approvedBy: admin._id,
          approvedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!recharge) {
      const checkExists = await Recharge.findById(id);
      if (!checkExists) {
        return res.status(404).json({ status: 'failed', message: 'Recharge not found' });
      }
      return res.status(400).json({
        status: 'failed',
        message: `Recharge has already been processed (Current status: ${checkExists.status})`,
      });
    }

    await Record.findOneAndUpdate(
      { referenceId: recharge._id.toString() },
      { status: 'Failed' }
    );

    await AuditLog.create({
      actor: admin._id,
      actorPhone: admin.phone,
      actorRole: admin.role,
      action: 'REJECT_RECHARGE',
      targetType: 'Recharge',
      targetId: recharge._id.toString(),
      reason,
      ipAddress: req.ip || '',
    });

    return res.json({ status: 'success', message: 'Recharge request rejected', recharge });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error rejecting recharge' });
  }
};

export const getWithdrawals = async (req, res) => {
  try {
    const list = await Withdrawal.find().sort({ createdAt: -1 }).limit(100);
    return res.json({ status: 'success', data: list });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error fetching withdrawals' });
  }
};

export const approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { payoutReference = `IMPS-${Date.now()}` } = req.body;
    const admin = req.user;

    // Atomic State Transition: guarantees a pending withdrawal is approved once only
    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: id, status: 'pending' },
      {
        $set: {
          status: 'approved',
          adminRemark: `Payout confirmed via IMPS/NEFT (Ref: ${payoutReference})`,
          approvedBy: admin._id,
          approvedAt: new Date(),
          payoutReference,
        },
      },
      { new: true }
    );

    if (!withdrawal) {
      const checkExists = await Withdrawal.findById(id);
      if (!checkExists) {
        return res.status(404).json({ status: 'failed', message: 'Withdrawal not found' });
      }
      return res.status(400).json({
        status: 'failed',
        message: `Withdrawal has already been processed (Current status: ${checkExists.status})`,
      });
    }

    await Record.findOneAndUpdate(
      { referenceId: withdrawal._id.toString() },
      { status: 'Success' }
    );

    // Finalize Paid Withdrawal in Double-Entry Ledger
    try {
      await finalizePaidWithdrawal({
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        fee: withdrawal.fee,
        netAmount: withdrawal.receiveAmount,
        referenceId: withdrawal._id.toString(),
        payoutReference,
        actorId: admin._id,
        isDemo: config.appMode === 'DEMO',
      });
    } catch (ledgerErr) {
      console.warn('[Ledger Notice] Background payout ledger sync:', ledgerErr.message);
    }

    await AuditLog.create({
      actor: admin._id,
      actorPhone: admin.phone,
      actorRole: admin.role,
      action: 'APPROVE_WITHDRAWAL',
      targetType: 'Withdrawal',
      targetId: withdrawal._id.toString(),
      afterSnapshot: { amount: withdrawal.amount, receiveAmount: withdrawal.receiveAmount, payoutReference },
      ipAddress: req.ip || '',
    });

    return res.json({
      status: 'success',
      message: 'Withdrawal approved & payout marked as dispatched!',
      withdrawal,
    });
  } catch (error) {
    console.error('[Admin] Approve withdrawal error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error approving withdrawal' });
  }
};

export const rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Incorrect bank details or compliance verification failed' } = req.body;
    const admin = req.user;

    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: id, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          adminRemark: reason,
          approvedBy: admin._id,
          approvedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!withdrawal) {
      const checkExists = await Withdrawal.findById(id);
      if (!checkExists) {
        return res.status(404).json({ status: 'failed', message: 'Withdrawal not found' });
      }
      return res.status(400).json({
        status: 'failed',
        message: `Withdrawal has already been processed (Current status: ${checkExists.status})`,
      });
    }

    // Atomic Refund: return reserved funds safely to user's available balance
    const updatedUser = await User.findByIdAndUpdate(
      withdrawal.userId,
      {
        $inc: {
          'wallet.availableBalance': withdrawal.amount,
          'wallet.totalWithdrawn': -withdrawal.amount,
        },
      },
      { new: true }
    );

    await Record.findOneAndUpdate(
      { referenceId: withdrawal._id.toString() },
      { status: 'Failed' }
    );

    // Release Reservation in Double-Entry Ledger
    try {
      await releaseWithdrawalReservation({
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        referenceId: withdrawal._id.toString(),
        reason,
        actorId: admin._id,
        isDemo: config.appMode === 'DEMO',
      });
    } catch (ledgerErr) {
      console.warn('[Ledger Notice] Background release reservation sync:', ledgerErr.message);
    }

    await AuditLog.create({
      actor: admin._id,
      actorPhone: admin.phone,
      actorRole: admin.role,
      action: 'REJECT_WITHDRAWAL',
      targetType: 'Withdrawal',
      targetId: withdrawal._id.toString(),
      reason,
      ipAddress: req.ip || '',
    });

    return res.json({
      status: 'success',
      message: 'Withdrawal rejected and reserved funds refunded to user wallet.',
      withdrawal,
      userWallet: updatedUser?.wallet,
    });
  } catch (error) {
    console.error('[Admin] Reject withdrawal error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error rejecting withdrawal' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(100);
    return res.json({ status: 'success', data: users });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error fetching users' });
  }
};

export const adjustUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { availableBalance, rechargeBalance, reason = 'Administrative adjustment' } = req.body;
    const admin = req.user;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'failed', message: 'User not found' });
    }

    const beforeSnapshot = { ...user.wallet };

    if (availableBalance !== undefined && !isNaN(Number(availableBalance))) {
      user.wallet.availableBalance = Math.max(0, Number(availableBalance));
    }
    if (rechargeBalance !== undefined && !isNaN(Number(rechargeBalance))) {
      user.wallet.rechargeBalance = Math.max(0, Number(rechargeBalance));
    }
    await user.save();

    await AuditLog.create({
      actor: admin._id,
      actorPhone: admin.phone,
      actorRole: admin.role,
      action: 'ADJUST_BALANCE',
      targetType: 'User',
      targetId: user._id.toString(),
      reason,
      beforeSnapshot,
      afterSnapshot: { ...user.wallet },
      ipAddress: req.ip || '',
    });

    return res.json({
      status: 'success',
      message: 'User balance updated successfully',
      user: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error updating balance' });
  }
};

// Administrative Reconciliation Utility (Reads & verifies without destructive mutations)
export const reconcileUserLedger = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'failed', message: 'User not found' });
    }

    // Calculate sum of all approved recharges
    const recharges = await Recharge.aggregate([
      { $match: { userId: user._id, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalApprovedRecharges = recharges[0]?.total || 0;

    // Calculate sum of all approved withdrawals
    const withdrawals = await Withdrawal.aggregate([
      { $match: { userId: user._id, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalApprovedWithdrawals = withdrawals[0]?.total || 0;

    // Calculate order spendings
    const orders = await Order.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, total: { $sum: '$price' }, totalEarned: { $sum: '$totalEarned' } } },
    ]);
    const totalOrderSpend = orders[0]?.total || 0;
    const totalFreightEarned = orders[0]?.totalEarned || 0;

    return res.json({
      status: 'success',
      data: {
        userId: user._id,
        phone: user.phone,
        currentWallet: user.wallet,
        auditReconciliation: {
          totalApprovedRecharges,
          totalApprovedWithdrawals,
          totalOrderSpend,
          totalFreightEarned,
          netCalculatedBalance: totalApprovedRecharges + totalFreightEarned - totalOrderSpend - totalApprovedWithdrawals,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error running reconciliation utility' });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    return res.json({ status: 'success', data: logs });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error retrieving audit logs' });
  }
};
