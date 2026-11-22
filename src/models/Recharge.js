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
    },
    amount: {
      type: Number,
      required: true,
    },
    channel: {
      type: String,
      default: 'Channel A Online',
    },
    utr: {
      type: String,
      required: true,
      trim: true,
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

export default mongoose.model('Recharge', RechargeSchema);
