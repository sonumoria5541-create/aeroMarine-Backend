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
      enum: ['regular', 'welfare'], // regular = Normal Plan, welfare = VIP Plan
      default: 'regular',
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
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Plan', PlanSchema);
