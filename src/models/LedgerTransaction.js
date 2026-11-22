import mongoose from 'mongoose';

const ledgerTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'deposit',
        'withdrawal_reserve',
        'withdrawal_paid',
        'withdrawal_release',
        'container_purchase',
        'earning_credit',
        'adjustment',
        'reversal',
      ],
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['posted', 'reversed'],
      default: 'posted',
      index: true,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    referenceType: {
      type: String,
      enum: ['DepositRequest', 'WithdrawalRequest', 'PlanPosition', 'EarningBatch', 'ManualAdjustment'],
      default: null,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorRole: {
      type: String,
      default: 'system',
    },
    isDemo: {
      type: Boolean,
      default: true,
    },
    reversedByTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerTransaction',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const LedgerTransaction = mongoose.model('LedgerTransaction', ledgerTransactionSchema);
