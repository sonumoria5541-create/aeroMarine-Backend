import mongoose from 'mongoose';

const containerPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      default: 'Standard Cargo',
    },
    description: {
      type: String,
      required: true,
    },
    shortDescription: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    gallery: [{ type: String }],
    price: {
      type: Number,
      required: true,
      min: [0, 'Price must be positive'],
    },
    priceInPaise: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    availableUnits: {
      type: Number,
      default: 50,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    eligibilityRules: {
      type: String,
      default: 'Available for verified accounts with completed compliance acknowledgment.',
    },
    earningModelDescription: {
      type: String,
      default: 'Fleet utilization model based on charter freight leasing revenue.',
    },
    dailyRatePercent: {
      type: Number,
      default: 0,
    },
    estimatedDailyEarning: {
      type: Number,
      default: 0,
    },
    payoutSchedule: {
      type: String,
      enum: ['daily', 'weekly', 'at_completion'],
      default: 'daily',
    },
    feesPercent: {
      type: Number,
      default: 0,
    },
    riskLabel: {
      type: String,
      default: 'Maritime Commercial Risk',
    },
    riskDisclosure: {
      type: String,
      required: true,
      default: 'Illustrative simulation only. Past shipping volume does not guarantee future earnings. Capital is subject to maritime freight demand fluctuations.',
    },
    supportingDocumentsUrl: {
      type: String,
      default: '',
    },
    termsVersion: {
      type: String,
      default: 'v1.0',
    },
    status: {
      type: String,
      enum: ['draft', 'pending_compliance', 'active', 'paused', 'sold_out', 'archived'],
      default: 'draft',
      index: true,
    },
    isDemo: {
      type: Boolean,
      default: true,
      index: true,
    },
    complianceApprovedAt: {
      type: Date,
      default: null,
    },
    complianceApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ContainerPlan = mongoose.model('ContainerPlan', containerPlanSchema);
