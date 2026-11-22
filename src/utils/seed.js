import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Order from '../models/Order.js';
import Record from '../models/Record.js';

export const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('[Seed] Seeding database...');

    // Clear old data
    await User.deleteMany({});
    await Plan.deleteMany({});
    await Order.deleteMany({});
    await Record.deleteMany({});

    console.log('[Seed] Old collections wiped.');

    // 1. Create Target Test User (7009962845 / yadav123)
    const userHashedPassword = await bcrypt.hash('yadav123', 10);
    const testUser = await User.create({
      phone: '7009962845',
      password: userHashedPassword,
      role: 'user',
      inviteCode: '179041',
      vipLevel: 1,
      avatar: 'av1',
      wallet: {
        availableBalance: 2500,
        rechargeBalance: 1200,
        totalIncome: 6850,
        totalWithdrawn: 1000,
      },
      bankAccount: {
        realName: 'Yadav Kumar',
        ifsc: 'HDFC0001234',
        accountNumber: '5010045892143',
        isBound: true,
      },
      spinsLeft: 2,
    });
    console.log(`[Seed] Created test user: ${testUser.phone} with password 'yadav123'`);

    // 2. Create Admin User (9999999999 / admin123)
    const adminHashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await User.create({
      phone: '9999999999',
      password: adminHashedPassword,
      role: 'admin',
      inviteCode: '999999',
      vipLevel: 5,
      avatar: 'av2',
      wallet: {
        availableBalance: 100000,
        rechargeBalance: 50000,
        totalIncome: 250000,
        totalWithdrawn: 10000,
      },
      bankAccount: {
        realName: 'AeroMarine Admin',
        ifsc: 'SBIN0001234',
        accountNumber: '309988776655',
        isBound: true,
      },
      spinsLeft: 10,
    });
    console.log(`[Seed] Created admin user: ${adminUser.phone} with password 'admin123'`);

    // 3. Create Container Plans
    const plansData = [
      // Regular Fleet Plans
      {
        name: 'Offer Plan - Ocean Freight Express',
        subtitle: 'Daily Withdrawal • 20ft Container Lease',
        category: 'regular',
        price: 720,
        dailyIncome: 4354,
        totalRevenue: 8708,
        durationDays: 2,
        limitPerUser: 10,
        remainingPercent: 88,
        icon: 'Ship',
        sortOrder: 1,
      },
      {
        name: 'Cargo Carrier A - Coastal Feeder',
        subtitle: 'Daily Withdrawal • Standard Bulk',
        category: 'regular',
        price: 285,
        dailyIncome: 245,
        totalRevenue: 7350,
        durationDays: 30,
        limitPerUser: 10,
        remainingPercent: 92,
        icon: 'Anchor',
        sortOrder: 2,
      },
      {
        name: 'Cargo Carrier B - Regional Trade Vessel',
        subtitle: 'Daily Withdrawal • Heavy Freight',
        category: 'regular',
        price: 520,
        dailyIncome: 1565,
        totalRevenue: 10955,
        durationDays: 7,
        limitPerUser: 10,
        remainingPercent: 79,
        icon: 'Compass',
        sortOrder: 3,
      },
      {
        name: 'Cargo Carrier C - Trans-Oceanic Carrier',
        subtitle: 'Daily Withdrawal • High Yield Fast Lease',
        category: 'regular',
        price: 1000,
        dailyIncome: 8586,
        totalRevenue: 25758,
        durationDays: 3,
        limitPerUser: 10,
        remainingPercent: 84,
        icon: 'Navigation',
        sortOrder: 4,
      },
      {
        name: 'Cargo Carrier D - Heavy Freight Logistics',
        subtitle: 'Daily Withdrawal • Intercontinental',
        category: 'regular',
        price: 1600,
        dailyIncome: 1463,
        totalRevenue: 21945,
        durationDays: 15,
        limitPerUser: 10,
        remainingPercent: 71,
        icon: 'Container',
        sortOrder: 5,
      },
      {
        name: 'Cargo Carrier E - Ultra Large Vessel',
        subtitle: 'Daily Withdrawal • Deep Sea Route',
        category: 'regular',
        price: 2200,
        dailyIncome: 1967,
        totalRevenue: 37373,
        durationDays: 19,
        limitPerUser: 10,
        remainingPercent: 65,
        icon: 'Ship',
        sortOrder: 6,
      },
      {
        name: 'Cargo Carrier F - Global Charter Lease',
        subtitle: 'Daily Withdrawal • Express 3-Day Turnaround',
        category: 'regular',
        price: 3500,
        dailyIncome: 4502,
        totalRevenue: 13506,
        durationDays: 3,
        limitPerUser: 10,
        remainingPercent: 55,
        icon: 'Globe',
        sortOrder: 7,
      },
      {
        name: 'Cargo Carrier G - Sovereign Flagship',
        subtitle: 'Daily Withdrawal • Maximum Fleet Allocation',
        category: 'regular',
        price: 4735,
        dailyIncome: 19053,
        totalRevenue: 38106,
        durationDays: 2,
        limitPerUser: 10,
        remainingPercent: 42,
        icon: 'Shield',
        sortOrder: 8,
      },

      // VIP Welfare Fleet Plans
      {
        name: 'VIP Special - Maritime Fast Express',
        subtitle: 'Daily Withdrawal • VIP Welfare Exclusive',
        category: 'welfare',
        price: 600,
        dailyIncome: 3806,
        totalRevenue: 7612,
        durationDays: 2,
        limitPerUser: 10,
        remainingPercent: 80,
        icon: 'Award',
        sortOrder: 1,
      },
      {
        name: 'VIP Fleet Plan 1 - Pacific Trade Sovereign',
        subtitle: 'Daily Withdrawal • 26-Day High Stability',
        category: 'welfare',
        price: 1200,
        dailyIncome: 1099,
        totalRevenue: 28574,
        durationDays: 26,
        limitPerUser: 10,
        remainingPercent: 75,
        icon: 'Compass',
        sortOrder: 2,
      },
      {
        name: 'VIP Fleet Plan 2 - Atlantic Super Carrier',
        subtitle: 'Daily Withdrawal • 3-Day Sprint Return',
        category: 'welfare',
        price: 2500,
        dailyIncome: 7500,
        totalRevenue: 22500,
        durationDays: 3,
        limitPerUser: 10,
        remainingPercent: 60,
        icon: 'Ship',
        sortOrder: 3,
      },
      {
        name: 'VIP Fleet Plan 3 - Global Sovereign Carrier',
        subtitle: 'Daily Withdrawal • Premium VIP Tier',
        category: 'welfare',
        price: 3800,
        dailyIncome: 13800,
        totalRevenue: 27600,
        durationDays: 2,
        limitPerUser: 10,
        remainingPercent: 50,
        icon: 'Crown',
        sortOrder: 4,
      },
    ];

    const createdPlans = await Plan.insertMany(plansData);
    console.log(`[Seed] Inserted ${createdPlans.length} maritime container plans.`);

    // 4. Create Active Order for Test User
    const firstPlan = createdPlans[0];
    const userOrder = await Order.create({
      userId: testUser._id,
      planId: firstPlan._id,
      planName: firstPlan.name,
      price: firstPlan.price,
      dailyIncome: firstPlan.dailyIncome,
      totalRevenue: firstPlan.totalRevenue,
      durationDays: firstPlan.durationDays,
      daysRemaining: 1,
      totalEarned: firstPlan.dailyIncome,
      status: 'running',
    });
    console.log(`[Seed] Created active order for ${testUser.phone}: ${userOrder.planName}`);

    // 5. Create Sample Transaction Records
    await Record.create([
      {
        userId: testUser._id,
        category: 'recharge',
        title: 'Recharge',
        amount: 720,
        isCredit: true,
        status: 'Success',
      },
      {
        userId: testUser._id,
        category: 'order',
        title: firstPlan.name,
        amount: firstPlan.price,
        isCredit: false,
        status: 'Success',
      },
      {
        userId: testUser._id,
        category: 'yield',
        title: 'Daily Maritime Freight Yield',
        amount: firstPlan.dailyIncome,
        isCredit: true,
        status: 'Success',
      },
    ]);
    console.log('[Seed] Created sample account records.');

    console.log('[Seed] Database successfully seeded!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
