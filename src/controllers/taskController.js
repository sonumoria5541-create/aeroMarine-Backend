import Record from '../models/Record.js';
import User from '../models/User.js';

const WHEEL_PRIZES = [200, 250, 300, 350, 400, 250, 300, 200];

export const spinWheel = async (req, res) => {
  try {
    const user = req.user;

    if (!user.spinsLeft || user.spinsLeft <= 0) {
      return res.status(400).json({
        status: 'failed',
        message: 'No spins left! Lease an active container plan on the Home page to unlock free daily spins.',
      });
    }

    // Pick random index
    const randomIndex = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const prizeAmount = WHEEL_PRIZES[randomIndex];

    user.spinsLeft -= 1;
    user.lastSpinAt = new Date();
    user.wallet.availableBalance = (user.wallet.availableBalance || 0) + prizeAmount;
    user.wallet.totalIncome = (user.wallet.totalIncome || 0) + prizeAmount;
    await user.save();

    await Record.create({
      userId: user._id,
      category: 'reward',
      title: 'Lucky Cargo Spin Reward',
      amount: prizeAmount,
      isCredit: true,
      status: 'Success',
    });

    return res.json({
      status: 'success',
      message: `Congratulations! You won ₹${prizeAmount} cash reward!`,
      prize: prizeAmount,
      targetIndex: randomIndex,
      spinsLeft: user.spinsLeft,
      wallet: user.wallet,
    });
  } catch (error) {
    console.error('[Task] Spin error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error processing spin' });
  }
};
