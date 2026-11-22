import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    inviteCode: {
      type: String,
      unique: true,
      default: () => Math.floor(100000 + Math.random() * 900000).toString(),
    },
    invitedBy: {
      type: String,
      default: null,
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

export default mongoose.model('User', UserSchema);
