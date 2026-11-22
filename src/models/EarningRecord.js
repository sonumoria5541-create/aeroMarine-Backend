import mongoose from 'mongoose';

const earningRecordSchema = new mongoose.Schema(
  {
    planPosition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanPosition',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EarningBatch',
      default: null,
      index: true,
    },
    period: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    grossAmountPaise: {
      type: Number,
      required: true,
    },
    grossAmount: {
      type: Number,
      required: true,
    },
    feesPaise: {
      type: Number,
      default: 0,
    },
    fees: {
      type: Number,
      default: 0,
    },
    netAmountPaise: {
      type: Number,
      required: true,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    calculationRatePercent: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['estimated', 'accrued', 'approved', 'credited', 'reversed'],
      default: 'accrued',
      index: true,
    },
    ruleVersion: {
      type: String,
      default: 'v1.0',
    },
    isDemo: {
      type: Boolean,
      default: true,
    },
    ledgerTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerTransaction',
      default: null,
    },
    reversedAt: {
      type: Date,
      default: null,
    },
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate accrual for the same position and period
earningRecordSchema.index({ planPosition: 1, period: 1 }, { unique: true });

export const EarningRecord = mongoose.model('EarningRecord', earningRecordSchema);
