import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import readline from 'readline';
import { connectDB } from '../config/db.js';
import { config } from '../config/env.js';
import User from '../models/User.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain both letters and numbers.';
  }
  return null;
};

const run = async () => {
  try {
    console.log('========================================================');
    console.log('  AEROMARINE — SECURE ADMINISTRATIVE BOOTSTRAP CLI      ');
    console.log('========================================================');

    await connectDB();

    // Check args or env or prompt
    const args = process.argv.slice(2);
    const isReset = args.includes('--reset');

    let phone = process.env.INITIAL_ADMIN_PHONE || args[0];
    let password = process.env.INITIAL_ADMIN_PASSWORD || args[1];

    if (!phone || phone.startsWith('--')) {
      phone = await askQuestion('Enter Administrator Mobile (10 digits): ');
    }
    phone = phone.trim();

    if (!/^\d{10}$/.test(phone)) {
      console.error('[Error] Administrator mobile number must be exactly 10 digits.');
      process.exit(1);
    }

    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      if (!isReset) {
        console.error(`[Security Guard] User with phone ${phone} already exists (Role: ${existingUser.role}).`);
        console.error('To update an existing admin password securely, run:');
        console.error('  npm run admin:create -- --reset');
        process.exit(1);
      } else {
        console.log(`[Verified] Found existing account for ${phone}. Proceeding with secure password reset...`);
      }
    }

    if (!password || password.startsWith('--')) {
      password = await askQuestion('Enter Strong Admin Password (min 8 chars, letters & numbers): ');
    }
    password = password.trim();

    const strengthErr = validatePasswordStrength(password);
    if (strengthErr) {
      console.error(`[Security Error] Weak password rejected: ${strengthErr}`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    if (existingUser && isReset) {
      existingUser.password = hashedPassword;
      existingUser.role = 'admin';
      await existingUser.save();
      console.log(`[Success] Password for administrator ${phone} updated securely.`);
    } else {
      const admin = await User.create({
        phone,
        password: hashedPassword,
        role: 'admin',
        inviteCode: '888888',
        vipLevel: 5,
        avatar: 'av2',
        wallet: {
          availableBalance: 0,
          rechargeBalance: 0,
          totalIncome: 0,
          totalWithdrawn: 0,
        },
        bankAccount: {
          realName: 'AeroMarine Operations',
          ifsc: 'SBIN0000001',
          accountNumber: '999999999999',
          isBound: true,
        },
        spinsLeft: 0,
      });

      console.log(`[Success] Administrator account created successfully!`);
      console.log(`  Account ID: ${admin._id}`);
      console.log(`  Phone:      ${admin.phone}`);
      console.log(`  Role:       ${admin.role}`);
      console.log(`  Created At: ${admin.createdAt.toISOString()}`);
    }

    console.log('========================================================');
    console.log('NOTICE: Clear any temporary environment variables from shell.');
    console.log('========================================================');
    process.exit(0);
  } catch (err) {
    console.error('[Fatal Error] Failed to bootstrap admin:', err.message);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.connection.close();
  }
};

run();
