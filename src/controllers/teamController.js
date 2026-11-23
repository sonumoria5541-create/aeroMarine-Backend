import User from '../models/User.js';
import Recharge from '../models/Recharge.js';
import Withdrawal from '../models/Withdrawal.js';
import { config } from '../config/env.js';

export const getTeamData = async (req, res) => {
  try {
    const user = req.user;

    // Find Level 1 members (Direct referrals of current user)
    const l1Users = user.inviteCode
      ? await User.find({ invitedBy: user.inviteCode, _id: { $ne: user._id } }).select('phone createdAt wallet inviteCode')
      : [];
    const l1Codes = l1Users.map((u) => u.inviteCode).filter(Boolean);
    const l1Ids = l1Users.map((u) => u._id);

    // Find Level 2 members (Direct referrals of Level 1 members)
    const l2Users =
      l1Codes.length > 0
        ? await User.find({
            invitedBy: { $in: l1Codes },
            _id: { $nin: [user._id, ...l1Ids] },
          }).select('phone createdAt wallet inviteCode')
        : [];
    const l2Codes = l2Users.map((u) => u.inviteCode).filter(Boolean);
    const l2Ids = l2Users.map((u) => u._id);

    // Find Level 3 members (Direct referrals of Level 2 members)
    const l3Users =
      l2Codes.length > 0
        ? await User.find({
            invitedBy: { $in: l2Codes },
            _id: { $nin: [user._id, ...l1Ids, ...l2Ids] },
          }).select('phone createdAt wallet inviteCode')
        : [];
    const l3Ids = l3Users.map((u) => u._id);

    const allTeamIds = [...l1Ids, ...l2Ids, ...l3Ids];

    // Calculate team recharge and withdraw volume
    const teamRecharges = allTeamIds.length > 0 ? await Recharge.find({ userId: { $in: allTeamIds }, status: 'approved' }) : [];
    const teamWithdrawals = allTeamIds.length > 0 ? await Withdrawal.find({ userId: { $in: allTeamIds }, status: 'approved' }) : [];

    const totalRecharge = teamRecharges.reduce((sum, r) => sum + r.amount, 0);
    const totalWithdraw = teamWithdrawals.reduce((sum, w) => sum + w.amount, 0);

    const maskPhone = (ph) => {
      if (!ph || ph.length < 7) return ph;
      return `${ph.slice(0, 3)}***${ph.slice(-4)}`;
    };

    const l1Recharge = teamRecharges.filter((r) => l1Ids.some((id) => id.equals(r.userId))).reduce((s, r) => s + r.amount, 0);
    const l2Recharge = teamRecharges.filter((r) => l2Ids.some((id) => id.equals(r.userId))).reduce((s, r) => s + r.amount, 0);
    const l3Recharge = teamRecharges.filter((r) => l3Ids.some((id) => id.equals(r.userId))).reduce((s, r) => s + r.amount, 0);

    return res.json({
      status: 'success',
      data: {
        totalMembers: allTeamIds.length,
        teamRecharge: totalRecharge,
        teamWithdraw: totalWithdraw,
        inviteCode: user.inviteCode,
        inviteUrl: `${config.clientUrl}/register?invite=${user.inviteCode}`,
        levels: {
          level1: {
            level: 1,
            name: 'Level 1',
            commissionRate: '30%',
            membersCount: l1Users.length,
            activeCount: l1Users.filter((u) => (u.wallet?.totalIncome || 0) > 0).length,
            rechargeTotal: l1Recharge,
            members: l1Users.map((u) => ({
              phone: maskPhone(u.phone),
              date: u.createdAt,
            })),
          },
          level2: {
            level: 2,
            name: 'Level 2',
            commissionRate: '10%',
            membersCount: l2Users.length,
            activeCount: l2Users.filter((u) => (u.wallet?.totalIncome || 0) > 0).length,
            rechargeTotal: l2Recharge,
            members: l2Users.map((u) => ({
              phone: maskPhone(u.phone),
              date: u.createdAt,
            })),
          },
          level3: {
            level: 3,
            name: 'Level 3',
            commissionRate: '5%',
            membersCount: l3Users.length,
            activeCount: l3Users.filter((u) => (u.wallet?.totalIncome || 0) > 0).length,
            rechargeTotal: l3Recharge,
            members: l3Users.map((u) => ({
              phone: maskPhone(u.phone),
              date: u.createdAt,
            })),
          },
        },
      },
    });
  } catch (error) {
    console.error('[Team] Get team error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error retrieving team metrics' });
  }
};
