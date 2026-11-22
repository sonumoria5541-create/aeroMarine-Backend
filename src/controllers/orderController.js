import Order from '../models/Order.js';
import Record from '../models/Record.js';
import User from '../models/User.js';
import { creditEarning } from '../services/ledgerService.js';
import { config } from '../config/env.js';

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });

    const activeOrders = orders.filter((o) => o.status === 'running');
    const totalInvested = activeOrders.reduce((sum, o) => sum + o.price, 0);
    const dailyIncome = activeOrders.reduce((sum, o) => sum + o.dailyIncome, 0);
    const activePlans = activeOrders.length;

    // Calculate countdown time until next 24-hour yield release (e.g. 09:42:39 style)
    const now = new Date();
    const nextYield = new Date();
    nextYield.setHours(24, 0, 0, 0);
    const diffMs = Math.max(0, nextYield.getTime() - now.getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60)).toString().padStart(2, '0');
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000).toString().padStart(2, '0');
    const incomeTimer = `${hours}:${minutes}:${seconds}`;

    return res.json({
      status: 'success',
      data: {
        orders,
        stats: {
          totalInvested,
          dailyIncome,
          activePlans,
          incomeTimer,
        },
      },
    });
  } catch (error) {
    console.error('[Order] Get my orders error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error retrieving your orders' });
  }
};

export const claimDailyYield = async (req, res) => {
  try {
    const user = req.user;
    const activeOrders = await Order.find({ userId: user._id, status: 'running' });

    if (activeOrders.length === 0) {
      return res.status(400).json({ status: 'failed', message: 'No active container fleet plans running' });
    }

    let totalClaimed = 0;
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    for (const order of activeOrders) {
      // Atomic Guard: update only if at least 12 hours elapsed or never claimed
      // Prevents concurrent multi-click double-earnings
      const claimedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          status: 'running',
          $or: [
            { lastYieldAt: { $lte: twelveHoursAgo } },
            { lastYieldAt: null },
          ],
        },
        {
          $set: { lastYieldAt: now },
          $inc: {
            totalEarned: order.dailyIncome,
            daysRemaining: -1,
          },
        },
        { new: true }
      );

      if (claimedOrder) {
        totalClaimed += order.dailyIncome;

        if (claimedOrder.daysRemaining <= 0) {
          claimedOrder.status = 'completed';
          await claimedOrder.save();
        }

        // Ledger sync per plan
        try {
          await creditEarning({
            userId: user._id,
            amount: order.dailyIncome,
            period: new Date().toISOString().split('T')[0],
            planName: order.planName,
            referenceId: order._id.toString(),
            isDemo: config.appMode === 'DEMO',
          });
        } catch (ledgerErr) {
          console.warn('[Ledger Notice] Background earning ledger sync:', ledgerErr.message);
        }
      }
    }

    if (totalClaimed > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          $inc: {
            'wallet.availableBalance': totalClaimed,
            'wallet.totalIncome': totalClaimed,
          },
        },
        { new: true }
      );

      await Record.create({
        userId: user._id,
        category: 'yield',
        title: 'Daily Maritime Freight Yield',
        amount: totalClaimed,
        isCredit: true,
        status: 'Success',
      });

      return res.json({
        status: 'success',
        message: `Successfully collected ₹${totalClaimed} daily freight earnings!`,
        totalClaimed,
        wallet: updatedUser.wallet,
      });
    }

    return res.json({
      status: 'info',
      message: 'Your daily earnings are already up to date. Next automatic settlement arriving shortly.',
    });
  } catch (error) {
    console.error('[Order] Claim error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error processing daily claim' });
  }
};
