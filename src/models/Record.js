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
    },
    referenceId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Record', RecordSchema);
