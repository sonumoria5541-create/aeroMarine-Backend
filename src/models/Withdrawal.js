import mongoose from 'mongoose';

const WithdrawalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userPhone: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    fee: {
      type: Number,
      required: true,
    },
    receiveAmount: {
      type: Number,
      required: true,
    },
    bankDetails: {
      realName: { type: String, required: true },
      ifsc: { type: String, required: true },
      accountNumber: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminRemark: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Withdrawal', WithdrawalSchema);
