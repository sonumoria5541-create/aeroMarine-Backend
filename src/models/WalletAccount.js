import mongoose from 'mongoose';

const walletAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    currency: {
      type: String,
      default: 'INR',
      required: true,
    },
    availableBalancePaise: {
      type: Number,
      default: 0,
      min: [0, 'Available balance cannot be negative'],
    },
    reservedBalancePaise: {
      type: Number,
      default: 0,
      min: [0, 'Reserved balance cannot be negative'],
    },
    pendingDepositsPaise: {
      type: Number,
      default: 0,
    },
    pendingEarningsPaise: {
      type: Number,
      default: 0,
    },
    totalCreditedPaise: {
      type: Number,
      default: 0,
    },
    totalWithdrawnPaise: {
      type: Number,
      default: 0,
    },
    lastReconciledAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Virtuals to expose readable rupee values
walletAccountSchema.virtual('availableBalance').get(function () {
  return this.availableBalancePaise / 100;
});
walletAccountSchema.virtual('reservedBalance').get(function () {
  return this.reservedBalancePaise / 100;
});
walletAccountSchema.virtual('pendingDeposits').get(function () {
  return this.pendingDepositsPaise / 100;
});
walletAccountSchema.virtual('pendingEarnings').get(function () {
  return this.pendingEarningsPaise / 100;
});
walletAccountSchema.virtual('totalCredited').get(function () {
  return this.totalCreditedPaise / 100;
});
walletAccountSchema.virtual('totalWithdrawn').get(function () {
  return this.totalWithdrawnPaise / 100;
});

walletAccountSchema.set('toJSON', { virtuals: true });
walletAccountSchema.set('toObject', { virtuals: true });

export const WalletAccount = mongoose.model('WalletAccount', walletAccountSchema);
