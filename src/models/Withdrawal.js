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
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Withdrawal amount must be positive'],
    },
    fee: {
      type: Number,
      required: true,
      default: 0,
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
      index: true,
    },
    adminRemark: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    payoutReference: {
      type: String,
      default: '',
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true }
);

WithdrawalSchema.index({ createdAt: -1 });

export default mongoose.model('Withdrawal', WithdrawalSchema);
