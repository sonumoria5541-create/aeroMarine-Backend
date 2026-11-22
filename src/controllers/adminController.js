import User from '../models/User.js';
import Recharge from '../models/Recharge.js';
import Withdrawal from '../models/Withdrawal.js';
import Order from '../models/Order.js';
import Record from '../models/Record.js';

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
    const recharge = await Recharge.findById(id);

    if (!recharge) {
      return res.status(404).json({ status: 'failed', message: 'Recharge not found' });
    }

    if (recharge.status !== 'pending') {
      return res.status(400).json({ status: 'failed', message: `Recharge is already ${recharge.status}` });
    }

    const user = await User.findById(recharge.userId);
    if (!user) {
      return res.status(404).json({ status: 'failed', message: 'User not found' });
    }

    // Credit recharge balance
    user.wallet.rechargeBalance = (user.wallet.rechargeBalance || 0) + recharge.amount;
    await user.save();

    recharge.status = 'approved';
    recharge.adminRemark = 'Verified and approved by admin';
    await recharge.save();

    await Record.findOneAndUpdate(
      { referenceId: recharge._id.toString() },
      { status: 'Success' }
    );

    return res.json({ status: 'success', message: 'Recharge approved and funds credited!', recharge });
  } catch (error) {
    console.error('[Admin] Approve recharge error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error approving recharge' });
  }
};

export const rejectRecharge = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Invalid UTR reference' } = req.body;
    const recharge = await Recharge.findById(id);

    if (!recharge) {
      return res.status(404).json({ status: 'failed', message: 'Recharge not found' });
    }

    if (recharge.status !== 'pending') {
      return res.status(400).json({ status: 'failed', message: `Recharge is already ${recharge.status}` });
    }

    recharge.status = 'rejected';
    recharge.adminRemark = reason;
    await recharge.save();

    await Record.findOneAndUpdate(
      { referenceId: recharge._id.toString() },
      { status: 'Failed' }
    );

    return res.json({ status: 'success', message: 'Recharge rejected', recharge });
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
    const withdrawal = await Withdrawal.findById(id);

    if (!withdrawal) {
      return res.status(404).json({ status: 'failed', message: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ status: 'failed', message: `Withdrawal is already ${withdrawal.status}` });
    }

    withdrawal.status = 'approved';
    withdrawal.adminRemark = 'Paid via IMPS/NEFT';
    await withdrawal.save();

    await Record.findOneAndUpdate(
      { referenceId: withdrawal._id.toString() },
      { status: 'Success' }
    );

    return res.json({ status: 'success', message: 'Withdrawal approved & marked as paid!', withdrawal });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error approving withdrawal' });
  }
};

export const rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Incorrect bank details' } = req.body;
    const withdrawal = await Withdrawal.findById(id);

    if (!withdrawal) {
      return res.status(404).json({ status: 'failed', message: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ status: 'failed', message: `Withdrawal is already ${withdrawal.status}` });
    }

    const user = await User.findById(withdrawal.userId);
    if (user) {
      // Refund balance back to user availableBalance
      user.wallet.availableBalance = (user.wallet.availableBalance || 0) + withdrawal.amount;
      user.wallet.totalWithdrawn = Math.max(0, (user.wallet.totalWithdrawn || 0) - withdrawal.amount);
      await user.save();
    }

    withdrawal.status = 'rejected';
    withdrawal.adminRemark = reason;
    await withdrawal.save();

    await Record.findOneAndUpdate(
      { referenceId: withdrawal._id.toString() },
      { status: 'Failed' }
    );

    return res.json({ status: 'success', message: 'Withdrawal rejected and funds refunded to user wallet', withdrawal });
  } catch (error) {
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
    const { availableBalance, rechargeBalance } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'failed', message: 'User not found' });
    }

    if (availableBalance !== undefined) user.wallet.availableBalance = Number(availableBalance);
    if (rechargeBalance !== undefined) user.wallet.rechargeBalance = Number(rechargeBalance);
    await user.save();

    return res.json({ status: 'success', message: 'User balance updated successfully', user: user.toSafeObject() });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error updating balance' });
  }
};
