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
      index: true,
    },
    planName: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: [1, 'Price must be positive'],
    },
    dailyIncome: {
      type: Number,
      required: true,
      min: [0, 'Daily income must be non-negative'],
    },
    totalRevenue: {
      type: Number,
      required: true,
    },
    durationDays: {
      type: Number,
      required: true,
      min: [1, 'Duration must be at least 1 day'],
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
      index: true,
    },
    lastYieldAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

OrderSchema.index({ userId: 1, status: 1 });
OrderSchema.index({ createdAt: -1 });

export default mongoose.model('Order', OrderSchema);
