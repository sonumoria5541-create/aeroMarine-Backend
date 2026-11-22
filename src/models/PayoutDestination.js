import mongoose from 'mongoose';

const payoutDestinationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['bank_account', 'upi'],
      required: true,
    },
    label: {
      type: String,
      default: 'Primary Payout',
    },
    // For Bank Account
    accountHolderName: {
      type: String,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    ifscCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    // For UPI
    upiId: {
      type: String,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Masking virtual / method
payoutDestinationSchema.methods.toMaskedJSON = function () {
  const obj = this.toObject();
  if (obj.accountNumber && obj.accountNumber.length > 4) {
    obj.accountNumberMasked = `••••••••${obj.accountNumber.slice(-4)}`;
    delete obj.accountNumber;
  }
  if (obj.upiId && obj.upiId.includes('@')) {
    const [userPart, domain] = obj.upiId.split('@');
    obj.upiIdMasked = `${userPart.slice(0, 2)}••••@${domain}`;
    delete obj.upiId;
  }
  return obj;
};

export const PayoutDestination = mongoose.model('PayoutDestination', payoutDestinationSchema);
