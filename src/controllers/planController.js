import Plan from '../models/Plan.js';
import Order from '../models/Order.js';
import Record from '../models/Record.js';
import User from '../models/User.js';
import { purchaseContainerPosition } from '../services/ledgerService.js';
import { config } from '../config/env.js';

export const getPlans = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category) {
      filter.category = category;
    }

    const plans = await Plan.find(filter).sort({ sortOrder: 1, price: 1 });
    return res.json({ status: 'success', data: plans });
  } catch (error) {
    console.error('[Plan] Get plans error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error retrieving plans' });
  }
};

export const buyPlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const user = req.user;

    if (!planId) {
      return res.status(400).json({ status: 'failed', message: 'Missing plan identifier' });
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ status: 'failed', message: 'Fleet plan not found or no longer active' });
    }

    // Check user limit per plan
    if (plan.limitPerUser) {
      const activeUserOrders = await Order.countDocuments({
        userId: user._id,
        planId: plan._id,
        status: 'running',
      });
      if (activeUserOrders >= plan.limitPerUser) {
        return res.status(400).json({
          status: 'failed',
          message: `Purchase limit reached: you already hold ${activeUserOrders} active units of this fleet container (Max: ${plan.limitPerUser}).`,
        });
      }
    }

    const totalWallet = (user.wallet.availableBalance || 0) + (user.wallet.rechargeBalance || 0);
    if (totalWallet < plan.price) {
      return res.status(400).json({
        status: 'failed',
        message: `Insufficient wallet balance. Total required: ₹${plan.price}, available: ₹${totalWallet}. Please recharge first.`,
      });
    }

    // Calculate deduction distribution: prioritize recharge balance first
    let deductRecharge = 0;
    let deductAvailable = 0;

    const currentRecharge = user.wallet.rechargeBalance || 0;
    if (currentRecharge >= plan.price) {
      deductRecharge = plan.price;
    } else {
      deductRecharge = currentRecharge;
      deductAvailable = plan.price - currentRecharge;
    }

    // Atomic Balance Deduction Guard
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        'wallet.rechargeBalance': { $gte: deductRecharge },
        'wallet.availableBalance': { $gte: deductAvailable },
      },
      {
        $inc: {
          'wallet.rechargeBalance': -deductRecharge,
          'wallet.availableBalance': -deductAvailable,
          spinsLeft: 1, // Reward spin for container leasing
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({
        status: 'failed',
        message: 'Wallet balance changed or insufficient for this container lease. Please try again.',
      });
    }

    // Create active contract / order
    const order = new Order({
      userId: user._id,
      planId: plan._id,
      planName: plan.name,
      price: plan.price,
      dailyIncome: plan.dailyIncome,
      totalRevenue: plan.totalRevenue,
      durationDays: plan.durationDays,
      daysRemaining: plan.durationDays,
      totalEarned: 0,
      status: 'running',
      lastYieldAt: new Date(),
    });
    await order.save();

    // Create transaction record
    const record = new Record({
      userId: user._id,
      category: 'order',
      title: plan.name,
      amount: plan.price,
      isCredit: false,
      status: 'Success',
      referenceId: order._id.toString(),
    });
    await record.save();

    // Double-Entry Ledger sync
    try {
      await purchaseContainerPosition({
        userId: user._id,
        planName: plan.name,
        amount: plan.price,
        referenceId: order._id.toString(),
        isDemo: config.appMode === 'DEMO',
      });
    } catch (ledgerErr) {
      console.warn('[Ledger Notice] Background order ledger sync:', ledgerErr.message);
    }

    // Distribute referral commissions: L1 (10%), L2 (3%), L3 (1%)
    try {
      if (user.invitedBy) {
        const l1User = await User.findOne({ inviteCode: user.invitedBy });
        if (l1User) {
          const l1Bonus = Math.round(plan.price * 0.10);
          if (l1Bonus > 0) {
            await User.findByIdAndUpdate(l1User._id, {
              $inc: {
                'wallet.availableBalance': l1Bonus,
                'wallet.totalIncome': l1Bonus,
              },
            });

            await Record.create({
              userId: l1User._id,
              category: 'commission',
              title: `Level 1 Commission (${user.phone.slice(0, 3)}***${user.phone.slice(-4)})`,
              amount: l1Bonus,
              isCredit: true,
              status: 'Success',
            });
          }

          // Level 2
          if (l1User.invitedBy) {
            const l2User = await User.findOne({ inviteCode: l1User.invitedBy });
            if (l2User) {
              const l2Bonus = Math.round(plan.price * 0.03);
              if (l2Bonus > 0) {
                await User.findByIdAndUpdate(l2User._id, {
                  $inc: {
                    'wallet.availableBalance': l2Bonus,
                    'wallet.totalIncome': l2Bonus,
                  },
                });

                await Record.create({
                  userId: l2User._id,
                  category: 'commission',
                  title: `Level 2 Commission (${user.phone.slice(0, 3)}***${user.phone.slice(-4)})`,
                  amount: l2Bonus,
                  isCredit: true,
                  status: 'Success',
                });
              }

              // Level 3
              if (l2User.invitedBy) {
                const l3User = await User.findOne({ inviteCode: l2User.invitedBy });
                if (l3User) {
                  const l3Bonus = Math.round(plan.price * 0.01);
                  if (l3Bonus > 0) {
                    await User.findByIdAndUpdate(l3User._id, {
                      $inc: {
                        'wallet.availableBalance': l3Bonus,
                        'wallet.totalIncome': l3Bonus,
                      },
                    });

                    await Record.create({
                      userId: l3User._id,
                      category: 'commission',
                      title: `Level 3 Commission (${user.phone.slice(0, 3)}***${user.phone.slice(-4)})`,
                      amount: l3Bonus,
                      isCredit: true,
                      status: 'Success',
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch (commError) {
      console.error('[Plan] Referral commission distribution error:', commError);
    }

    return res.status(201).json({
      status: 'success',
      message: 'Container fleet contract leased successfully!',
      order,
      wallet: updatedUser.wallet,
    });
  } catch (error) {
    console.error('[Plan] Buy error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error leasing container plan' });
  }
};
