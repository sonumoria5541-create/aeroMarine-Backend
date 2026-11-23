import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const planSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subtitle: { type: String, default: 'Daily Freight Yield' },
  category: { type: String, default: 'regular', index: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  dailyIncome: { type: Number, required: true },
  totalRevenue: { type: Number, required: true },
  durationDays: { type: Number, required: true },
  limitPerUser: { type: Number, default: 10 },
  remainingPercent: { type: Number, default: 88 },
  icon: { type: String, default: 'Ship' },
  imageUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true, index: true },
  status: { type: String, default: 'active', index: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

const newPlans = [
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

async function updatePlans() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGODB_URI in environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('[UpdateFleet] Connected to MongoDB Atlas.');

    // Delete existing plans and insert new ones
    await Plan.deleteMany({});
    console.log('[UpdateFleet] Old plans cleared.');

    const inserted = await Plan.insertMany(newPlans);
    console.log(`[UpdateFleet] Successfully inserted ${inserted.length} updated fleet plans!`);

    inserted.forEach((p) => {
      console.log(`- [${p.category.toUpperCase()}] ${p.name}: Price ₹${p.price}, Daily ₹${p.dailyIncome} (13.3%), Term: ${p.durationDays}d, Total: ₹${p.totalRevenue}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('[UpdateFleet] Error:', err);
    process.exit(1);
  }
}

updatePlans();
