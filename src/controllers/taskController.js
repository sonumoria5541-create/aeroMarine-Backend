import Record from '../models/Record.js';
import User from '../models/User.js';

// 8 Segments matching the visual wheel:
// 0: Better Luck Next Time (₹0)
// 1: ₹10
// 2: ₹50
// 3: ₹20
// 4: ₹100
// 5: ₹500
// 6: ₹1000
// 7: Better Luck Next Time (₹0)
const WHEEL_SEGMENTS = [
  { index: 0, label: 'Better Luck Next Time', amount: 0, weight: 35 },
  { index: 1, label: '₹10', amount: 10, weight: 20 },
  { index: 2, label: '₹50', amount: 50, weight: 6 },
  { index: 3, label: '₹20', amount: 20, weight: 12 },
  { index: 4, label: '₹100', amount: 100, weight: 4 },
  { index: 5, label: '₹500', amount: 500, weight: 1.5 },
  { index: 6, label: '₹1000', amount: 1000, weight: 0.5 },
  { index: 7, label: 'Better Luck Next Time', amount: 0, weight: 21 },
];

function pickWeightedSegment() {
  const totalWeight = WHEEL_SEGMENTS.reduce((sum, seg) => sum + seg.weight, 0);
  let random = Math.random() * totalWeight;
  for (const seg of WHEEL_SEGMENTS) {
    if (random < seg.weight) {
      return seg;
    }
    random -= seg.weight;
  }
  return WHEEL_SEGMENTS[0];
}

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

    const selectedSegment = pickWeightedSegment();
    const prizeAmount = selectedSegment.amount;

    if (prizeAmount > 0) {
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
        title: `Lucky Cargo Spin Reward (${selectedSegment.label})`,
        amount: prizeAmount,
        isCredit: true,
        status: 'Success',
      });

      return res.json({
        status: 'success',
        message: `Congratulations! You won ₹${prizeAmount} cash reward!`,
        prize: prizeAmount,
        prizeLabel: selectedSegment.label,
        targetIndex: selectedSegment.index,
        spinsLeft: finalUser.spinsLeft,
        wallet: finalUser.wallet,
      });
    } else {
      return res.json({
        status: 'success',
        message: 'Better luck next time! Try again tomorrow or lease a container for more spins.',
        prize: 0,
        prizeLabel: 'Better Luck Next Time',
        targetIndex: selectedSegment.index,
        spinsLeft: decrementedUser.spinsLeft,
        wallet: decrementedUser.wallet,
      });
    }
  } catch (error) {
    console.error('[Task] Spin error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error processing lucky cargo spin' });
  }
};
