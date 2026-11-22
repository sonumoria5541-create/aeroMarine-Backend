import User from '../models/User.js';
import Recharge from '../models/Recharge.js';
import Withdrawal from '../models/Withdrawal.js';
import Order from '../models/Order.js';
import Record from '../models/Record.js';
import Plan from '../models/Plan.js';
import { AuditLog } from '../models/AuditLog.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { config } from '../config/env.js';
import { creditDeposit, finalizePaidWithdrawal, releaseWithdrawalReservation, reconcileWallet } from '../services/ledgerService.js';
import { queueAndSendEmail } from '../services/emailService.js';

// ==========================================
// 1. ADMIN OVERVIEW & ANALYTICS DASHBOARD
// ==========================================
export const getOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const suspendedUsers = await User.countDocuments({ status: { $in: ['suspended', 'blocked'] } });

    // Registrations today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: startOfToday } });

    // Deposits breakdown
    const pendingDeposits = await Recharge.countDocuments({ status: 'pending' });
    const approvedDeposits = await Recharge.countDocuments({ status: 'approved' });
    const rejectedDeposits = await Recharge.countDocuments({ status: 'rejected' });
    const totalDepositApproved = await Recharge.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Withdrawals breakdown
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    const approvedWithdrawals = await Withdrawal.countDocuments({ status: 'approved' });
    const rejectedWithdrawals = await Withdrawal.countDocuments({ status: 'rejected' });
    const totalWithdrawApproved = await Withdrawal.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Container Fleet Orders
    const totalOrders = await Order.countDocuments();
    const activeOrders = await Order.countDocuments({ status: 'running' });
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    const activePlansCount = await Plan.countDocuments({ isActive: true });

    // Recent Audit Logs Feed
    const recentActivity = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10);

    const totalRecharged = totalDepositApproved[0]?.total || 0;
    const totalWithdrawn = totalWithdrawApproved[0]?.total || 0;

    return res.json({
      status: 'success',
      success: true,
      data: {
        totalUsers,
        pendingRecharges: pendingDeposits,
        pendingWithdrawals,
        activeOrders,
        totalRecharged,
        totalWithdrawn,
        appMode: config.appMode,
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          newToday: newUsersToday,
        },
        deposits: {
          total: pendingDeposits + approvedDeposits + rejectedDeposits,
          pendingCount: pendingDeposits,
          approvedCount: approvedDeposits,
          rejectedCount: rejectedDeposits,
          totalAmount: totalRecharged,
        },
        withdrawals: {
          total: pendingWithdrawals + approvedWithdrawals + rejectedWithdrawals,
          pendingCount: pendingWithdrawals,
          approvedCount: approvedWithdrawals,
          rejectedCount: rejectedWithdrawals,
          totalAmount: totalWithdrawn,
        },
        positions: {
          total: totalOrders,
          activeCount: activeOrders,
          completedCount: completedOrders,
          activePlansCount,
        },
        financial: {
          totalRecharged,
          totalWithdrawn,
          netTreasury: totalRecharged - totalWithdrawn,
        },
        recentActivity,
      },
    });
  } catch (error) {
    console.error('[Admin] Overview error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error retrieving operations overview' });
  }
};

// ==========================================
// 2. USER MANAGEMENT
// ==========================================
export const getUsers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { phone: { $regex: term, $options: 'i' } },
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { inviteCode: { $regex: term, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.json({
      status: 'success',
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    console.error('[Admin] Get users error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error fetching users directory' });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ status: 'failed', success: false, message: 'User not found' });
    }

    const [orders, recharges, withdrawals, records, logs] = await Promise.all([
      Order.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20),
      Recharge.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20),
      Withdrawal.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20),
      Record.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50),
      AuditLog.find({ targetId: user._id.toString() }).sort({ createdAt: -1 }).limit(10),
    ]);

    return res.json({
      status: 'success',
      success: true,
      data: {
        user,
        orders,
        recharges,
        withdrawals,
        records,
        auditLogs: logs,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error fetching user profile' });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason = 'Administrative review' } = req.body;
    const admin = req.user;

    if (!['active', 'suspended', 'blocked'].includes(status)) {
      return res.status(400).json({ status: 'failed', success: false, message: 'Invalid status value' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ status: 'failed', success: false, message: 'User not found' });
    }

    // Protection rule: Primary owner / Super Admin account cannot be blocked or suspended
    if (targetUser.isProtectedOwner || targetUser.phone === '8427348239') {
      return res.status(403).json({
        status: 'failed',
        success: false,
        message: 'Security Violation: The primary owner account cannot be suspended or blocked.',
      });
    }

    const previousStatus = targetUser.status;
    targetUser.status = status;
    targetUser.statusReason = reason;
    targetUser.statusUpdatedAt = new Date();
    targetUser.statusUpdatedBy = admin._id;
    await targetUser.save();

    await AuditLog.create({
      actor: admin._id,
      actorPhone: admin.phone,
      actorRole: admin.role,
      action: status === 'active' ? 'UNBLOCK_USER' : 'BLOCK_USER',
      targetType: 'User',
      targetId: targetUser._id.toString(),
      reason,
      beforeSnapshot: { status: previousStatus },
      afterSnapshot: { status },
      ipAddress: req.ip || '',
    });

    return res.json({
      status: 'success',
      success: true,
      message: `User account status updated to '${status}'.`,
      user: targetUser.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error updating user status' });
  }
};

export const addUserNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const admin = req.user;

    if (!note || !note.trim()) {
      return res.status(400).json({ status: 'failed', success: false, message: 'Note text is required' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: 'failed', success: false, message: 'User not found' });
    }

    user.adminNotes.push({
      text: note.trim(),
      author: admin.phone || 'admin',
      createdAt: new Date(),
    });
    await user.save();

    return res.json({
      status: 'success',
      success: true,
      message: 'Admin note added successfully',
      notes: user.adminNotes,
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error adding admin note' });
  }
};

export const adjustUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { availableBalance, rechargeBalance, reason = 'Administrative adjustment' } = req.body;
    const admin = req.user;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'failed', success: false, message: 'User not found' });
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
      success: true,
      message: 'User balance updated successfully',
      user: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error updating balance' });
  }
};

// ==========================================
// 3. DEPOSIT MANAGEMENT
// ==========================================
export const getDeposits = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { utr: { $regex: term, $options: 'i' } },
        { userPhone: { $regex: term, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const total = await Recharge.countDocuments(filter);
    const deposits = await Recharge.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.json({
      status: 'success',
      success: true,
      data: deposits,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error fetching deposits' });
  }
};

export const getRecharges = getDeposits; // Alias for backward compatibility

export const handleDepositAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNote = '' } = req.body;
    const admin = req.user;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ status: 'failed', success: false, message: 'Invalid action. Must be approve or reject.' });
    }

    if (action === 'approve') {
      const recharge = await Recharge.findOneAndUpdate(
        { _id: id, status: 'pending' },
        {
          $set: {
            status: 'approved',
            adminRemark: adminNote || 'Verified and approved by administrator',
            approvedBy: admin._id,
            approvedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!recharge) {
        const checkExists = await Recharge.findById(id);
        if (!checkExists) {
          return res.status(404).json({ status: 'failed', success: false, message: 'Recharge request not found' });
        }
        return res.status(400).json({
          status: 'failed',
          success: false,
          message: `Recharge has already been processed (Current status: ${checkExists.status})`,
        });
      }

      // Atomically credit user recharge balance
      const updatedUser = await User.findByIdAndUpdate(
        recharge.userId,
        { $inc: { 'wallet.rechargeBalance': recharge.amount } },
        { new: true }
      );

      await Record.findOneAndUpdate(
        { referenceId: recharge._id.toString() },
        { status: 'Success' }
      );

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

      await AuditLog.create({
        actor: admin._id,
        actorPhone: admin.phone,
        actorRole: admin.role,
        action: 'APPROVE_RECHARGE',
        targetType: 'Recharge',
        targetId: recharge._id.toString(),
        afterSnapshot: { amount: recharge.amount, status: 'approved', utr: recharge.utr },
        ipAddress: req.ip || '',
      });

      return res.json({
        status: 'success',
        success: true,
        message: 'Deposit verified and funds credited successfully!',
        recharge,
        userWallet: updatedUser?.wallet,
      });
    } else {
      // Reject
      const recharge = await Recharge.findOneAndUpdate(
        { _id: id, status: 'pending' },
        {
          $set: {
            status: 'rejected',
            adminRemark: adminNote || 'Invalid bank reference or unverified transaction',
            approvedBy: admin._id,
            approvedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!recharge) {
        const checkExists = await Recharge.findById(id);
        if (!checkExists) {
          return res.status(404).json({ status: 'failed', success: false, message: 'Recharge not found' });
        }
        return res.status(400).json({
          status: 'failed',
          success: false,
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
        reason: adminNote,
        ipAddress: req.ip || '',
      });

      return res.json({
        status: 'success',
        success: true,
        message: 'Deposit request rejected.',
        recharge,
      });
    }
  } catch (error) {
    console.error('[Admin] Deposit action error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error processing deposit action' });
  }
};

export const approveRecharge = (req, res) => {
  req.body.action = 'approve';
  return handleDepositAction(req, res);
};

export const rejectRecharge = (req, res) => {
  req.body.action = 'reject';
  req.body.adminNote = req.body.reason || req.body.adminNote;
  return handleDepositAction(req, res);
};

// ==========================================
// 4. WITHDRAWAL MANAGEMENT
// ==========================================
export const getWithdrawals = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { userPhone: { $regex: term, $options: 'i' } },
        { 'bankDetails.accountNumber': { $regex: term, $options: 'i' } },
        { 'bankDetails.realName': { $regex: term, $options: 'i' } },
        { payoutReference: { $regex: term, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const total = await Withdrawal.countDocuments(filter);
    const withdrawals = await Withdrawal.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.json({
      status: 'success',
      success: true,
      data: withdrawals,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error fetching withdrawals' });
  }
};

export const handleWithdrawalAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, payoutReference = `IMPS-${Date.now()}`, adminNote = '' } = req.body;
    const admin = req.user;

    if (!['approve', 'mark_paid', 'reject'].includes(action)) {
      return res.status(400).json({ status: 'failed', success: false, message: 'Invalid withdrawal action' });
    }

    if (action === 'approve' || action === 'mark_paid') {
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
          return res.status(404).json({ status: 'failed', success: false, message: 'Withdrawal not found' });
        }
        return res.status(400).json({
          status: 'failed',
          success: false,
          message: `Withdrawal has already been processed (Current status: ${checkExists.status})`,
        });
      }

      await Record.findOneAndUpdate(
        { referenceId: withdrawal._id.toString() },
        { status: 'Success' }
      );

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
        success: true,
        message: 'Withdrawal approved & payout marked as dispatched!',
        withdrawal,
      });
    } else {
      // Reject
      const withdrawal = await Withdrawal.findOneAndUpdate(
        { _id: id, status: 'pending' },
        {
          $set: {
            status: 'rejected',
            adminRemark: adminNote || 'Incorrect bank details or compliance verification failed',
            approvedBy: admin._id,
            approvedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!withdrawal) {
        const checkExists = await Withdrawal.findById(id);
        if (!checkExists) {
          return res.status(404).json({ status: 'failed', success: false, message: 'Withdrawal not found' });
        }
        return res.status(400).json({
          status: 'failed',
          success: false,
          message: `Withdrawal has already been processed (Current status: ${checkExists.status})`,
        });
      }

      // Atomic refund back to availableBalance
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

      try {
        await releaseWithdrawalReservation({
          userId: withdrawal.userId,
          amount: withdrawal.amount,
          referenceId: withdrawal._id.toString(),
          reason: adminNote,
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
        reason: adminNote,
        ipAddress: req.ip || '',
      });

      return res.json({
        status: 'success',
        success: true,
        message: 'Withdrawal rejected and reserved funds refunded to user wallet.',
        withdrawal,
        userWallet: updatedUser?.wallet,
      });
    }
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error processing withdrawal action' });
  }
};

export const approveWithdrawal = (req, res) => {
  req.body.action = 'approve';
  return handleWithdrawalAction(req, res);
};

export const rejectWithdrawal = (req, res) => {
  req.body.action = 'reject';
  req.body.adminNote = req.body.reason || req.body.adminNote;
  return handleWithdrawalAction(req, res);
};

// ==========================================
// 5. CONTAINER FLEET PLAN MANAGEMENT
// ==========================================
export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ sortOrder: 1, createdAt: -1 });
    return res.json({ status: 'success', success: true, data: plans });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error fetching plans' });
  }
};

export const createPlan = async (req, res) => {
  try {
    const {
      name,
      subtitle = 'Daily Freight Yield',
      category = 'regular',
      description = '',
      price,
      dailyIncome,
      durationDays,
      limitPerUser = 10,
      icon = 'Ship',
      imageUrl = '',
    } = req.body;
    const admin = req.user;

    const numPrice = Number(price);
    const numDaily = Number(dailyIncome);
    const numDuration = Number(durationDays);

    if (!name || isNaN(numPrice) || numPrice <= 0 || isNaN(numDaily) || isNaN(numDuration) || numDuration <= 0) {
      return res.status(400).json({
        status: 'failed',
        success: false,
        message: 'Please provide valid plan name, positive price, daily income, and duration days.',
      });
    }

    const totalRevenue = numDaily * numDuration;

    const plan = new Plan({
      name: name.trim(),
      subtitle: subtitle.trim(),
      category,
      description,
      price: numPrice,
      dailyIncome: numDaily,
      totalRevenue,
      durationDays: numDuration,
      limitPerUser: Number(limitPerUser) || 10,
      icon,
      imageUrl,
      isActive: true,
      status: 'active',
    });
    await plan.save();

    await AuditLog.create({
      actor: admin._id,
      actorPhone: admin.phone,
      actorRole: admin.role,
      action: 'CREATE_PLAN',
      targetType: 'Plan',
      targetId: plan._id.toString(),
      afterSnapshot: { name: plan.name, price: plan.price, durationDays: plan.durationDays },
      ipAddress: req.ip || '',
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: 'Container fleet plan created successfully!',
      data: plan,
    });
  } catch (error) {
    console.error('[Admin] Create plan error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error creating container plan' });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const admin = req.user;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ status: 'failed', success: false, message: 'Plan not found' });
    }

    const beforeSnapshot = { ...plan.toObject() };

    if (updates.name !== undefined) plan.name = updates.name.trim();
    if (updates.subtitle !== undefined) plan.subtitle = updates.subtitle.trim();
    if (updates.category !== undefined) plan.category = updates.category;
    if (updates.description !== undefined) plan.description = updates.description;
    if (updates.price !== undefined && !isNaN(Number(updates.price))) plan.price = Number(updates.price);
    if (updates.dailyIncome !== undefined && !isNaN(Number(updates.dailyIncome))) plan.dailyIncome = Number(updates.dailyIncome);
    if (updates.durationDays !== undefined && !isNaN(Number(updates.durationDays))) plan.durationDays = Number(updates.durationDays);
    if (updates.limitPerUser !== undefined) plan.limitPerUser = Number(updates.limitPerUser);
    if (updates.icon !== undefined) plan.icon = updates.icon;
    if (updates.imageUrl !== undefined) plan.imageUrl = updates.imageUrl;
    if (updates.isActive !== undefined) plan.isActive = Boolean(updates.isActive);
    if (updates.status !== undefined) plan.status = updates.status;

    plan.totalRevenue = plan.dailyIncome * plan.durationDays;
    await plan.save();

    await AuditLog.create({
      actor: admin._id,
      actorPhone: admin.phone,
      actorRole: admin.role,
      action: 'UPDATE_PLAN',
      targetType: 'Plan',
      targetId: plan._id.toString(),
      beforeSnapshot,
      afterSnapshot: { name: plan.name, price: plan.price },
      ipAddress: req.ip || '',
    });

    return res.json({
      status: 'success',
      success: true,
      message: 'Plan updated successfully',
      data: plan,
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error updating plan' });
  }
};

export const archivePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = req.user;

    // Safeguard: Never delete plan permanently if orders exist; set status to archived
    const plan = await Plan.findByIdAndUpdate(
      id,
      { isActive: false, status: 'archived' },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ status: 'failed', success: false, message: 'Plan not found' });
    }

    await AuditLog.create({
      actor: admin._id,
      actorPhone: admin.phone,
      actorRole: admin.role,
      action: 'ARCHIVE_PLAN',
      targetType: 'Plan',
      targetId: plan._id.toString(),
      ipAddress: req.ip || '',
    });

    return res.json({
      status: 'success',
      success: true,
      message: 'Plan archived successfully. Existing active user contracts remain safe and unaffected.',
      data: plan,
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error archiving plan' });
  }
};

// ==========================================
// 6. FLEET ORDERS & CONTRACTS
// ==========================================
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'phone name inviteCode')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      status: 'success',
      success: true,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error fetching fleet orders' });
  }
};

// ==========================================
// 7. FINANCIAL LEDGER & AUDIT RECONCILIATION
// ==========================================
export const getTransactions = async (req, res) => {
  try {
    const { category, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const total = await Record.countDocuments(filter);
    const records = await Record.find(filter)
      .populate('userId', 'phone name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.json({
      status: 'success',
      success: true,
      data: records,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error fetching transactions' });
  }
};

export const reconcileUserLedger = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'failed', success: false, message: 'User not found' });
    }

    const recharges = await Recharge.aggregate([
      { $match: { userId: user._id, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalApprovedRecharges = recharges[0]?.total || 0;

    const withdrawals = await Withdrawal.aggregate([
      { $match: { userId: user._id, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalApprovedWithdrawals = withdrawals[0]?.total || 0;

    const orders = await Order.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, total: { $sum: '$price' }, totalEarned: { $sum: '$totalEarned' } } },
    ]);
    const totalOrderSpend = orders[0]?.total || 0;
    const totalFreightEarned = orders[0]?.totalEarned || 0;

    return res.json({
      status: 'success',
      success: true,
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
    return res.status(500).json({ status: 'failed', success: false, message: 'Error running reconciliation utility' });
  }
};

// ==========================================
// 8. AUDIT LOGS & SYSTEM SETTINGS
// ==========================================
export const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const total = await AuditLog.countDocuments();
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.json({
      status: 'success',
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error retrieving audit logs' });
  }
};

export const getSettings = async (req, res) => {
  try {
    const settingsList = await SystemSetting.find();
    const settingsMap = {};
    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    // Provide default operational settings if not yet saved in DB
    const defaults = {
      websiteName: 'AeroMarine Logistics',
      contactEmail: config.supportEmail || 'support@aeromarine.site',
      upiId: 'aeromarine.cargo@okhdfcbank',
      bankDetails: {
        bankName: 'HDFC Bank Ltd',
        accountHolderName: 'AeroMarine Maritime Freight Escrow',
        accountNumber: '50200088991122',
        ifscCode: 'HDFC0001234',
        branch: 'Port Complex Nariman Point, Mumbai',
      },
      minDeposit: 250,
      minWithdrawal: 120,
      maintenanceMode: false,
      announcement: '',
      appMode: config.appMode,
    };

    return res.json({
      status: 'success',
      success: true,
      data: { ...defaults, ...settingsMap },
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error loading settings' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    const admin = req.user;

    for (const [key, value] of Object.entries(updates)) {
      // Never allow browser to modify secret credentials
      if (['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI', 'RESEND_API_KEY'].includes(key)) {
        continue;
      }

      await SystemSetting.findOneAndUpdate(
        { key },
        {
          $set: {
            value,
            updatedBy: admin._id,
          },
        },
        { upsert: true, new: true }
      );
    }

    await AuditLog.create({
      actor: admin._id,
      actorPhone: admin.phone,
      actorRole: admin.role,
      action: 'UPDATE_SETTINGS',
      targetType: 'SystemSetting',
      ipAddress: req.ip || '',
    });

    return res.json({
      status: 'success',
      success: true,
      message: 'Platform settings saved successfully!',
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error saving settings' });
  }
};

// ==========================================
// 9. STAFF & PERMISSION ROLES
// ==========================================
export const getStaff = async (req, res) => {
  try {
    const staff = await User.find({
      role: { $in: ['admin', 'owner', 'finance', 'support', 'operations'] },
    }).select('-password').sort({ createdAt: -1 });

    return res.json({
      status: 'success',
      success: true,
      data: staff,
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', success: false, message: 'Error fetching staff' });
  }
};
