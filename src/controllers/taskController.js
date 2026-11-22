import Record from '../models/Record.js';
import User from '../models/User.js';

const WHEEL_PRIZES = [200, 250, 300, 350, 400, 250, 300, 200];

export const spinWheel = async (req, res) => {
  try {
    const user = req.user;

    // Atomic Guard: Decrement spin count atomically with a conditional check
    // Prevents concurrent requests from consuming more spins than available
    const decrementedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        spinsLeft: { $gt: 0 },
      },
      {
        $inc: { spinsLeft: -1 },
        $set: { lastSpinAt: new Date() },
      },
      { new: true }
    );

    if (!decrementedUser) {
      return res.status(400).json({
        status: 'failed',
        message: 'No spins left! Lease an active container plan on the Home page to unlock free daily spins.',
      });
    }

    // Pick random prize index
    const randomIndex = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const prizeAmount = WHEEL_PRIZES[randomIndex];

    // Atomically credit the prize reward to the user's wallet
    const finalUser = await User.findByIdAndUpdate(
      user._id,
      {
        $inc: {
          'wallet.availableBalance': prizeAmount,
          'wallet.totalIncome': prizeAmount,
        },
      },
      { new: true }
    );

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
      spinsLeft: finalUser.spinsLeft,
      wallet: finalUser.wallet,
    });
  } catch (error) {
    console.error('[Task] Spin error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error processing lucky cargo spin' });
  }
};
