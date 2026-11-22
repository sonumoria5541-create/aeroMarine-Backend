import mongoose from 'mongoose';

const depositRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [100, 'Minimum deposit amount is 100 INR'],
    },
    amountPaise: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'upi', 'demo_transfer'],
      default: 'upi',
    },
    paymentReference: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    proofFile: {
      originalName: String,
      filename: String,
      path: String,
      mimeType: String,
      size: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    adminNote: {
      type: String,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    ledgerTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerTransaction',
      default: null,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    isDemo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const DepositRequest = mongoose.model('DepositRequest', depositRequestSchema);
