import Plan from '../models/Plan.js';
import Order from '../models/Order.js';
import Record from '../models/Record.js';
import User from '../models/User.js';

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

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ status: 'failed', message: 'Fleet plan not found or no longer active' });
    }

    const totalWallet = (user.wallet.availableBalance || 0) + (user.wallet.rechargeBalance || 0);
    if (totalWallet < plan.price) {
      return res.status(400).json({
        status: 'failed',
        message: `Insufficient wallet balance. Total required: ₹${plan.price}, available: ₹${totalWallet}. Please recharge first.`,
      });
    }

    // Deduct balance: prioritize recharge balance first, then available balance
    let remainingToDeduct = plan.price;
    if (user.wallet.rechargeBalance >= remainingToDeduct) {
      user.wallet.rechargeBalance -= remainingToDeduct;
      remainingToDeduct = 0;
    } else {
      remainingToDeduct -= user.wallet.rechargeBalance;
      user.wallet.rechargeBalance = 0;
      user.wallet.availableBalance -= remainingToDeduct;
    }

    // Unlock daily spin bonus for buying a plan
    user.spinsLeft = (user.spinsLeft || 0) + 1;
    await user.save();

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

    // Distribute referral commissions: L1 (10%), L2 (3%), L3 (1%)
    try {
      if (user.invitedBy) {
        const l1User = await User.findOne({ inviteCode: user.invitedBy });
        if (l1User) {
          const l1Bonus = Math.round(plan.price * 0.10);
          if (l1Bonus > 0) {
            l1User.wallet.availableBalance = (l1User.wallet.availableBalance || 0) + l1Bonus;
            l1User.wallet.totalIncome = (l1User.wallet.totalIncome || 0) + l1Bonus;
            await l1User.save();

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
                l2User.wallet.availableBalance = (l2User.wallet.availableBalance || 0) + l2Bonus;
                l2User.wallet.totalIncome = (l2User.wallet.totalIncome || 0) + l2Bonus;
                await l2User.save();

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
                    l3User.wallet.availableBalance = (l3User.wallet.availableBalance || 0) + l3Bonus;
                    l3User.wallet.totalIncome = (l3User.wallet.totalIncome || 0) + l3Bonus;
                    await l3User.save();

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
      wallet: user.wallet,
    });
  } catch (error) {
    console.error('[Plan] Buy error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error leasing container plan' });
  }
};
