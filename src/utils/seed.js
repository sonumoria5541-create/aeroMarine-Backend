import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Order from '../models/Order.js';
import Record from '../models/Record.js';

export const seedDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[CRITICAL] Destructive database seeding is strictly blocked in production!');
    throw new Error('Database seeding is strictly forbidden in production mode to protect real user data.');
  }
  try {
    await connectDB();
    console.log('[Seed] Seeding development database...');

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
        availableBalance: 2400,
        rechargeBalance: 1480,
        totalIncome: 1250,
        totalWithdrawn: 600,
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

    // 3. Create Container Plans - Realistic, Trustable & Sustainable Returns
    const plansData = [
      // Regular Fleet Plans (15% to 50% Net ROI based on duration)
      {
        name: 'Starter Fleet - Coastal Feeder 20ft',
        subtitle: 'Daily Withdrawal • 15-Day Coastal Route',
        category: 'regular',
        price: 350,
        dailyIncome: 27,
        totalRevenue: 405,
        durationDays: 15,
        limitPerUser: 10,
        remainingPercent: 92,
        icon: 'Anchor',
        sortOrder: 1,
      },
      {
        name: 'Regional Line - 40ft High-Cube Container',
        subtitle: 'Daily Withdrawal • 25-Day Regional Route',
        category: 'regular',
        price: 800,
        dailyIncome: 40,
        totalRevenue: 1000,
        durationDays: 25,
        limitPerUser: 10,
        remainingPercent: 88,
        icon: 'Ship',
        sortOrder: 2,
      },
      {
        name: 'Trade Corridor - Reefer Cold-Chain Unit',
        subtitle: 'Daily Withdrawal • 30-Day Insured Route',
        category: 'regular',
        price: 1500,
        dailyIncome: 65,
        totalRevenue: 1950,
        durationDays: 30,
        limitPerUser: 10,
        remainingPercent: 82,
        icon: 'Compass',
        sortOrder: 3,
      },
      {
        name: 'Transpacific Route - Heavy Freight Unit',
        subtitle: 'Daily Withdrawal • 35-Day Transoceanic Route',
        category: 'regular',
        price: 3000,
        dailyIncome: 115,
        totalRevenue: 4025,
        durationDays: 35,
        limitPerUser: 10,
        remainingPercent: 76,
        icon: 'Navigation',
        sortOrder: 4,
      },
      {
        name: 'Intercontinental - Panamax Bulk Container',
        subtitle: 'Daily Withdrawal • 45-Day Deep Sea Freight',
        category: 'regular',
        price: 5000,
        dailyIncome: 155,
        totalRevenue: 6975,
        durationDays: 45,
        limitPerUser: 10,
        remainingPercent: 68,
        icon: 'Container',
        sortOrder: 5,
      },
      {
        name: 'Ultra Large Carrier - Industrial Fleet Lot',
        subtitle: 'Daily Withdrawal • 50-Day Intercontinental Route',
        category: 'regular',
        price: 8500,
        dailyIncome: 245,
        totalRevenue: 12250,
        durationDays: 50,
        limitPerUser: 10,
        remainingPercent: 61,
        icon: 'Ship',
        sortOrder: 6,
      },
      {
        name: 'Global Charter - Multi-Container Export Block',
        subtitle: 'Daily Withdrawal • 60-Day Global Charter',
        category: 'regular',
        price: 15000,
        dailyIncome: 380,
        totalRevenue: 22800,
        durationDays: 60,
        limitPerUser: 10,
        remainingPercent: 54,
        icon: 'Globe',
        sortOrder: 7,
      },
      {
        name: 'Sovereign Flagship - Commercial Vessel Allocation',
        subtitle: 'Daily Withdrawal • 75-Day Flagship Lease',
        category: 'regular',
        price: 25000,
        dailyIncome: 550,
        totalRevenue: 41250,
        durationDays: 75,
        limitPerUser: 10,
        remainingPercent: 42,
        icon: 'Shield',
        sortOrder: 8,
      },

      // VIP Express Cargo Plans (Priority Fast Turnaround: 12% to 35% Net ROI)
      {
        name: 'VIP Express - 7-Day Fast Freight Sprint',
        subtitle: 'Daily Withdrawal • 7-Day Priority Turnaround',
        category: 'welfare',
        price: 600,
        dailyIncome: 96,
        totalRevenue: 672,
        durationDays: 7,
        limitPerUser: 10,
        remainingPercent: 85,
        icon: 'Award',
        sortOrder: 1,
      },
      {
        name: 'VIP Trade Liner - 14-Day Pacific Route',
        subtitle: 'Daily Withdrawal • 14-Day Priority Cargo',
        category: 'welfare',
        price: 1800,
        dailyIncome: 150,
        totalRevenue: 2100,
        durationDays: 14,
        limitPerUser: 10,
        remainingPercent: 78,
        icon: 'Compass',
        sortOrder: 2,
      },
      {
        name: 'VIP Atlantic Carrier - 21-Day Direct Cargo',
        subtitle: 'Daily Withdrawal • 21-Day Sprint Return',
        category: 'welfare',
        price: 4200,
        dailyIncome: 250,
        totalRevenue: 5250,
        durationDays: 21,
        limitPerUser: 10,
        remainingPercent: 64,
        icon: 'Ship',
        sortOrder: 3,
      },
      {
        name: 'VIP Sovereign Mega Freight - 30-Day Premier Fleet',
        subtitle: 'Daily Withdrawal • 30-Day Premier Fleet',
        category: 'welfare',
        price: 10000,
        dailyIncome: 450,
        totalRevenue: 13500,
        durationDays: 30,
        limitPerUser: 10,
        remainingPercent: 50,
        icon: 'Crown',
        sortOrder: 4,
      },
    ];

    const createdPlans = await Plan.insertMany(plansData);
    console.log(`[Seed] Inserted ${createdPlans.length} maritime container plans with realistic yields.`);

    // 4. Create Active Order for Test User
    const activePlan = createdPlans[1]; // Regional Line - 40ft High-Cube Container
    const userOrder = await Order.create({
      userId: testUser._id,
      planId: activePlan._id,
      planName: activePlan.name,
      price: activePlan.price,
      dailyIncome: activePlan.dailyIncome,
      totalRevenue: activePlan.totalRevenue,
      durationDays: activePlan.durationDays,
      daysRemaining: 18,
      totalEarned: activePlan.dailyIncome * 7, // 7 days earned
      status: 'running',
    });
    console.log(`[Seed] Created active order for ${testUser.phone}: ${userOrder.planName}`);

    // 5. Create Sample Transaction Records
    await Record.create([
      {
        userId: testUser._id,
        category: 'recharge',
        title: 'UPI Wallet Deposit',
        amount: 800,
        isCredit: true,
        status: 'Success',
      },
      {
        userId: testUser._id,
        category: 'order',
        title: activePlan.name,
        amount: activePlan.price,
        isCredit: false,
        status: 'Success',
      },
      {
        userId: testUser._id,
        category: 'yield',
        title: 'Daily Maritime Freight Yield',
        amount: activePlan.dailyIncome,
        isCredit: true,
        status: 'Success',
      },
    ]);
    console.log('[Seed] Created sample account records.');

    console.log('[Seed] Database successfully seeded with realistic, trustworthy yields!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
