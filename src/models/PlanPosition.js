import mongoose from 'mongoose';

const planPositionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContainerPlan',
      required: true,
      index: true,
    },
    planSnapshot: {
      name: String,
      slug: String,
      category: String,
      imageUrl: String,
      price: Number,
      durationDays: Number,
      dailyRatePercent: Number,
      termsVersion: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    amountInPaise: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
      index: true,
    },
    acceptedDocumentVersion: {
      type: String,
      default: 'v1.0',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    lastAccrualDate: {
      type: Date,
      default: null,
    },
    totalAccruedPaise: {
      type: Number,
      default: 0,
    },
    purchaseLedgerTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerTransaction',
      default: null,
    },
    isDemo: {
      type: Boolean,
      default: true,
    },
    adminNote: {
      type: String,
      default: null,
    },
    activatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PlanPosition = mongoose.model('PlanPosition', planPositionSchema);
