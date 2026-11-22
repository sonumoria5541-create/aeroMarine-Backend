import Order from '../models/Order.js';
import Record from '../models/Record.js';
import User from '../models/User.js';

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

    for (const order of activeOrders) {
      // Check if at least 12 hours passed since last yield or newly purchased
      const last = order.lastYieldAt ? new Date(order.lastYieldAt).getTime() : 0;
      const hoursSince = (now.getTime() - last) / (1000 * 60 * 60);

      // If user hasn't claimed in last 12 hours or never claimed
      if (hoursSince >= 12 || !order.lastYieldAt) {
        order.totalEarned += order.dailyIncome;
        order.daysRemaining = Math.max(0, order.daysRemaining - 1);
        if (order.daysRemaining <= 0) {
          order.status = 'completed';
        }
        order.lastYieldAt = now;
        await order.save();

        totalClaimed += order.dailyIncome;
      }
    }

    if (totalClaimed > 0) {
      user.wallet.availableBalance = (user.wallet.availableBalance || 0) + totalClaimed;
      user.wallet.totalIncome = (user.wallet.totalIncome || 0) + totalClaimed;
      await user.save();

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
        wallet: user.wallet,
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
