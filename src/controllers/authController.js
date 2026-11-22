import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { config } from '../config/env.js';

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, config.jwtAccessSecret, { expiresIn: '30d' });
};

const setTokenCookie = (res, token) => {
  res.cookie('aeromarine_token', token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

export const login = async (req, res) => {
  try {
    const phone = (req.body.phone || req.body.mobile || '').toString().trim();
    const { password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ status: 'failed', message: 'Missing mobile or password' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ status: 'failed', message: 'Invalid phone number or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ status: 'failed', message: 'Invalid phone number or password' });
    }

    const token = generateToken(user._id, user.role);
    setTokenCookie(res, token);

    return res.json({
      status: 'success',
      message: 'Login Successful! Redirecting...',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
};

export const register = async (req, res) => {
  try {
    const phone = (req.body.phone || req.body.mobile || '').toString().trim();
    const { password, inviteCode } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ status: 'failed', message: 'Please provide phone and password' });
    }

    if (phone.length !== 10) {
      return res.status(400).json({ status: 'failed', message: 'Phone number must be exactly 10 digits' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ status: 'failed', message: 'Phone number is already registered. Please login.' });
    }

    // Verify inviter if code provided
    let referrerCode = null;
    if (inviteCode) {
      const referrer = await User.findOne({ inviteCode: inviteCode.trim() });
      if (referrer) {
        referrerCode = referrer.inviteCode;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      phone,
      password: hashedPassword,
      invitedBy: referrerCode,
      wallet: {
        availableBalance: 0,
        rechargeBalance: 0,
        totalIncome: 0,
        totalWithdrawn: 0,
      },
      spinsLeft: 1,
    });

    await newUser.save();

    const token = generateToken(newUser._id, newUser.role);
    setTokenCookie(res, token);

    return res.status(201).json({
      status: 'success',
      message: 'Registration Successful! Redirecting...',
      token,
      user: newUser.toSafeObject(),
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    return res.status(500).json({ status: 'failed', message: 'Internal server error during registration' });
  }
};

export const getMe = async (req, res) => {
  try {
    return res.json({
      status: 'success',
      user: req.user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error retrieving profile' });
  }
};

export const updateBank = async (req, res) => {
  try {
    const { realName, ifsc, accountNumber } = req.body;

    if (!realName || !ifsc || !accountNumber) {
      return res.status(400).json({ status: 'failed', message: 'Please fill in real name, IFSC code, and account number.' });
    }

    req.user.bankAccount = {
      realName: realName.trim(),
      ifsc: ifsc.trim().toUpperCase(),
      accountNumber: accountNumber.trim(),
      isBound: true,
    };

    await req.user.save();

    return res.json({
      status: 'success',
      message: 'Bank details saved successfully',
      user: req.user.toSafeObject(),
    });
  } catch (error) {
    console.error('[Auth] Bank update error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error saving bank details' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ status: 'failed', message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ status: 'failed', message: 'New password must be at least 6 characters' });
    }

    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ status: 'failed', message: 'Current password is incorrect' });
    }

    req.user.password = await bcrypt.hash(newPassword, 10);
    await req.user.save();

    return res.json({
      status: 'success',
      message: 'Password updated successfully',
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error updating password' });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    if (avatar) {
      req.user.avatar = avatar;
      await req.user.save();
    }
    return res.json({
      status: 'success',
      message: 'Avatar updated',
      user: req.user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error saving avatar' });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('aeromarine_token');
  return res.json({ status: 'success', message: 'Logged out successfully' });
};
