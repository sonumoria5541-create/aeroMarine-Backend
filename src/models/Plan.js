import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: 'Daily Freight Yield',
    },
    category: {
      type: String,
      default: 'regular',
      index: true,
    },
    description: {
      type: String,
      default: '',
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
    limitPerUser: {
      type: Number,
      default: 10,
    },
    remainingPercent: {
      type: Number,
      default: 88,
    },
    icon: {
      type: String,
      default: 'Ship',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'inactive'],
      default: 'active',
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    features: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

PlanSchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.model('Plan', PlanSchema);
