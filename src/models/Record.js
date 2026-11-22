import mongoose from 'mongoose';

const RecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['recharge', 'withdraw', 'order', 'yield', 'commission', 'reward'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    isCredit: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Success', 'Failed'],
      default: 'Pending',
      index: true,
    },
    referenceId: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

RecordSchema.index({ userId: 1, category: 1, createdAt: -1 });
RecordSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Record', RecordSchema);
