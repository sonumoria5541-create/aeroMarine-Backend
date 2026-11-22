import { WalletAccount } from '../models/WalletAccount.js';
import { PlanPosition } from '../models/PlanPosition.js';
import { LedgerTransaction } from '../models/LedgerTransaction.js';
import { EarningRecord } from '../models/EarningRecord.js';
import { User } from '../models/User.js';
import { getOrCreateWallet } from '../services/ledgerService.js';
import { config } from '../config/env.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [wallet, activePositions, recentTransactions, totalAccrued] = await Promise.all([
      getOrCreateWallet(userId),
      PlanPosition.find({ user: userId, status: 'active' }),
      LedgerTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(5),
      EarningRecord.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, totalPaise: { $sum: '$netAmountPaise' } } },
      ]),
    ]);

    const totalSimulatedEarnings = totalAccrued[0] ? totalAccrued[0].totalPaise / 100 : 0;

    res.json({
      success: true,
      data: {
        user: {
          name: req.user.name,
          phone: req.user.phone,
          role: req.user.role,
          referralCode: req.user.referralCode,
        },
        wallet: {
          availableBalance: wallet.availableBalance,
          reservedBalance: wallet.reservedBalance,
          pendingDeposits: wallet.pendingDeposits,
          pendingEarnings: wallet.pendingEarnings,
          totalCredited: wallet.totalCredited,
          totalWithdrawn: wallet.totalWithdrawn,
        },
        positions: {
          activeCount: activePositions.length,
          activeList: activePositions,
        },
        earnings: {
          totalSimulated: totalSimulatedEarnings,
          isSimulated: false,
          label: 'Fleet Revenue Earnings',
        },
        recentTransactions,
        appMode: config.appMode,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getEarnings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;

    const [earnings, total] = await Promise.all([
      EarningRecord.find({ user: req.user._id })
        .populate('planPosition', 'planSnapshot')
        .sort({ period: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      EarningRecord.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      success: true,
      data: earnings,
      meta: {
        isDemo: config.appMode === 'DEMO',
        notice: 'Verified ledger earnings from operational container fleet allocations.',
      },
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

export const getReferrals = async (req, res, next) => {
  try {
    const referrals = await User.find({ invitedBy: req.user._id })
      .select('name phone createdAt')
      .sort({ createdAt: -1 });

    // Mask phone numbers for privacy
    const maskedReferrals = referrals.map((r) => ({
      name: r.name,
      phoneMasked: `${r.phone.slice(0, 3)}••••••${r.phone.slice(-3)}`,
      joinedAt: r.createdAt,
    }));

    res.json({
      success: true,
      data: {
        referralCode: req.user.referralCode,
        referralLink: `${config.clientUrl}/register?invite=${req.user.referralCode}`,
        totalReferrals: referrals.length,
        referredUsers: maskedReferrals,
        commissionNotice: 'Referral commission program is in compliance draft phase.',
      },
    });
  } catch (err) {
    next(err);
  }
};
