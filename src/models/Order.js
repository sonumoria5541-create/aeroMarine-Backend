import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    dailyIncome: {
      type: Number,
      required: true,
    },
    totalRevenue: {
      type: Number,
      required: true,
    },
    durationDays: {
      type: Number,
      required: true,
    },
    daysRemaining: {
      type: Number,
      required: true,
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['running', 'completed'],
      default: 'running',
    },
    lastYieldAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Order', OrderSchema);
