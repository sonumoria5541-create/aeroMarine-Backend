import mongoose from 'mongoose';

const RechargeSchema = new mongoose.Schema(
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
      min: [1, 'Recharge amount must be positive'],
    },
    channel: {
      type: String,
      default: 'Channel 1 (VIP Fast UPI / QR)',
    },
    utr: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    proofUrl: {
      type: String,
      default: '',
      trim: true,
    },
    proofPublicId: {
      type: String,
      default: '',
      trim: true,
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
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true }
);

RechargeSchema.index({ createdAt: -1 });

export default mongoose.model('Recharge', RechargeSchema);
