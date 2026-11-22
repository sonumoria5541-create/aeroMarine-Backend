import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'owner', 'finance', 'support', 'operations'],
      default: 'user',
      index: true,
    },
    isProtectedOwner: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'blocked'],
      default: 'active',
      index: true,
    },
    statusReason: {
      type: String,
      default: '',
    },
    statusUpdatedAt: {
      type: Date,
      default: null,
    },
    statusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adminNotes: [
      {
        text: { type: String, required: true },
        author: { type: String, default: 'admin' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    permissions: [
      {
        type: String,
      },
    ],
    inviteCode: {
      type: String,
      unique: true,
      default: () => Math.floor(100000 + Math.random() * 900000).toString(),
      index: true,
    },
    invitedBy: {
      type: String,
      default: null,
      index: true,
    },
    vipLevel: {
      type: Number,
      default: 0,
    },
    avatar: {
      type: String,
      default: 'av1',
    },
    wallet: {
      availableBalance: { type: Number, default: 0 },
      rechargeBalance: { type: Number, default: 0 },
      totalIncome: { type: Number, default: 0 },
      totalWithdrawn: { type: Number, default: 0 },
    },
    bankAccount: {
      realName: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      isBound: { type: Boolean, default: false },
    },
    spinsLeft: {
      type: Number,
      default: 1,
    },
    lastSpinAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
    lastLoginIp: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Method to verify password
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to safe return user data
UserSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

UserSchema.index({ createdAt: -1 });

export default mongoose.model('User', UserSchema);
