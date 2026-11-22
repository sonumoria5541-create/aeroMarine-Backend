import mongoose from 'mongoose';

const earningBatchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    period: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    totalPositions: {
      type: Number,
      default: 0,
    },
    totalGrossPaise: {
      type: Number,
      default: 0,
    },
    totalNetPaise: {
      type: Number,
      default: 0,
    },
    totalGross: {
      type: Number,
      default: 0,
    },
    totalNet: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['preview', 'posted', 'reversed'],
      default: 'preview',
      index: true,
    },
    isDemo: {
      type: Boolean,
      default: true,
    },
    executedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const EarningBatch = mongoose.model('EarningBatch', earningBatchSchema);
