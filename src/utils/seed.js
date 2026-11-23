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

    // 3. Create Container Plans - Daily 13.3% ROI Fleet Plans
    const plansData = [
      // Regular Fleet Plans (Starting from 750 up to 251000 with 13.3% daily return)
      {
        name: 'Starter Feeder - Coastal 20ft Fleet',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 45 Days',
        category: 'regular',
        price: 750,
        dailyIncome: 99.75,
        totalRevenue: 4488.75,
        durationDays: 45,
        limitPerUser: 10,
        remainingPercent: 95,
        icon: 'Anchor',
        sortOrder: 1,
      },
      {
        name: 'Regional Line - 40ft High-Cube Container',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 45 Days',
        category: 'regular',
        price: 1000,
        dailyIncome: 133,
        totalRevenue: 5985,
        durationDays: 45,
        limitPerUser: 10,
        remainingPercent: 91,
        icon: 'Ship',
        sortOrder: 2,
      },
      {
        name: 'Trade Corridor - Reefer Cold-Chain Unit',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 45 Days',
        category: 'regular',
        price: 2000,
        dailyIncome: 266,
        totalRevenue: 11970,
        durationDays: 45,
        limitPerUser: 10,
        remainingPercent: 88,
        icon: 'Compass',
        sortOrder: 3,
      },
      {
        name: 'Transpacific Route - Heavy Freight Unit',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 45 Days',
        category: 'regular',
        price: 3000,
        dailyIncome: 399,
        totalRevenue: 17955,
        durationDays: 45,
        limitPerUser: 10,
        remainingPercent: 82,
        icon: 'Navigation',
        sortOrder: 4,
      },
      {
        name: 'Arabian Sea Express - Multi-Cargo Carrier',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 45 Days',
        category: 'regular',
        price: 4500,
        dailyIncome: 598.5,
        totalRevenue: 26932.5,
        durationDays: 45,
        limitPerUser: 10,
        remainingPercent: 79,
        icon: 'Ship',
        sortOrder: 5,
      },
      {
        name: 'Suez Maritime - Bulk Intermodal Freight',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 45 Days',
        category: 'regular',
        price: 5500,
        dailyIncome: 731.5,
        totalRevenue: 32917.5,
        durationDays: 45,
        limitPerUser: 10,
        remainingPercent: 74,
        icon: 'Container',
        sortOrder: 6,
      },
      {
        name: 'Panamax Carrier - Deep-Sea Intermodal Block',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 45 Days',
        category: 'regular',
        price: 6500,
        dailyIncome: 864.5,
        totalRevenue: 38902.5,
        durationDays: 45,
        limitPerUser: 10,
        remainingPercent: 70,
        icon: 'Navigation',
        sortOrder: 7,
      },
      {
        name: 'Industrial Fleet - Ultra Large Freight Carrier',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 45 Days',
        category: 'regular',
        price: 8000,
        dailyIncome: 1064,
        totalRevenue: 47880,
        durationDays: 45,
        limitPerUser: 10,
        remainingPercent: 65,
        icon: 'Ship',
        sortOrder: 8,
      },
      {
        name: 'Global Charter - Heavy Industrial Export Block',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 50 Days',
        category: 'regular',
        price: 10000,
        dailyIncome: 1330,
        totalRevenue: 66500,
        durationDays: 50,
        limitPerUser: 10,
        remainingPercent: 58,
        icon: 'Globe',
        sortOrder: 9,
      },
      {
        name: 'Sovereign Maritime - Intercontinental Transoceanic',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 50 Days',
        category: 'regular',
        price: 15000,
        dailyIncome: 1995,
        totalRevenue: 99750,
        durationDays: 50,
        limitPerUser: 10,
        remainingPercent: 52,
        icon: 'Compass',
        sortOrder: 10,
      },
      {
        name: 'Sovereign Flagship - Commercial Vessel Allocation',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 60 Days',
        category: 'regular',
        price: 25000,
        dailyIncome: 3325,
        totalRevenue: 199500,
        durationDays: 60,
        limitPerUser: 10,
        remainingPercent: 44,
        icon: 'Shield',
        sortOrder: 11,
      },
      {
        name: 'Global Sovereign Armada - Mega Fleet Allocation',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 60 Days',
        category: 'regular',
        price: 251000,
        dailyIncome: 33383,
        totalRevenue: 2002980,
        durationDays: 60,
        limitPerUser: 10,
        remainingPercent: 38,
        icon: 'Crown',
        sortOrder: 12,
      },

      // VIP Express Cargo Plans (Priority Fast Turnaround: 13.3% Daily Yield)
      {
        name: 'VIP Express - 7-Day Fast Freight Sprint',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 7-Day Priority',
        category: 'welfare',
        price: 1000,
        dailyIncome: 133,
        totalRevenue: 931,
        durationDays: 7,
        limitPerUser: 10,
        remainingPercent: 85,
        icon: 'Award',
        sortOrder: 1,
      },
      {
        name: 'VIP Trade Liner - 14-Day Pacific Route',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 14-Day Priority',
        category: 'welfare',
        price: 3000,
        dailyIncome: 399,
        totalRevenue: 5586,
        durationDays: 14,
        limitPerUser: 10,
        remainingPercent: 78,
        icon: 'Compass',
        sortOrder: 2,
      },
      {
        name: 'VIP Atlantic Carrier - 21-Day Direct Cargo',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 21-Day Direct',
        category: 'welfare',
        price: 8000,
        dailyIncome: 1064,
        totalRevenue: 22344,
        durationDays: 21,
        limitPerUser: 10,
        remainingPercent: 64,
        icon: 'Ship',
        sortOrder: 3,
      },
      {
        name: 'VIP Sovereign Mega Freight - 30-Day Premier Fleet',
        subtitle: 'Daily Withdrawal • 13.3% Daily Yield • 30-Day Premier',
        category: 'welfare',
        price: 15000,
        dailyIncome: 1995,
        totalRevenue: 59850,
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
        amount: 1000,
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
