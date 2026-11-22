import mongoose from 'mongoose';

const ledgerEntrySchema = new mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerTransaction',
      required: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: [
        'user_available',
        'user_reserved',
        'system_clearing',
        'system_revenue',
        'system_payout',
        'user_earnings',
      ],
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    entryType: {
      type: String,
      enum: ['debit', 'credit'],
      required: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'INR',
    },
  },
  {
    timestamps: true,
  }
);

export const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
