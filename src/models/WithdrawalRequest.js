import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema(
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
      min: [200, 'Minimum withdrawal amount is 200 INR'],
    },
    amountPaise: {
      type: Number,
      required: true,
    },
    fee: {
      type: Number,
      default: 0,
    },
    feePaise: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    netAmountPaise: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    payoutMethod: {
      type: String,
      enum: ['bank_transfer', 'upi'],
      required: true,
    },
    payoutDestinationSnapshot: {
      accountHolderName: String,
      bankName: String,
      accountNumberMasked: String,
      ifscCode: String,
      upiIdMasked: String,
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'processing', 'paid', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reservedLedgerTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerTransaction',
      default: null,
    },
    paidLedgerTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerTransaction',
      default: null,
    },
    payoutReference: {
      type: String,
      default: null,
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
    paidAt: {
      type: Date,
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

export const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
