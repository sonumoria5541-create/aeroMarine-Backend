import mongoose from 'mongoose';

const InquirySchema = new mongoose.Schema(
  {
    inquiryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    subject: {
      type: String,
      default: '',
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    sourcePage: {
      type: String,
      default: '/contact',
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved', 'closed', 'spam'],
      default: 'new',
      index: true,
    },
    priority: {
      type: String,
      enum: ['normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    adminNotes: [
      {
        text: { type: String, required: true },
        author: { type: String, default: 'Coordinator' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

InquirySchema.index({ createdAt: -1 });

export const Inquiry = mongoose.models.Inquiry || mongoose.model('Inquiry', InquirySchema);
export default Inquiry;
