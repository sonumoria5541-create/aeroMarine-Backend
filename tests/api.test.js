import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import User from '../src/models/User.js';
import Plan from '../src/models/Plan.js';

describe('AeroMarine Production API & Security Test Suite', () => {
  let userToken = '';
  let adminToken = '';
  let samplePlanId = '';
  let testRechargeId = '';
  let testWithdrawalId = '';
  let testUserId = '';
  const uniqueUtr = `UTR${Date.now()}`;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Ensure test user has known balance & credentials
    const testUser = await User.findOne({ phone: '7009962845' });
    if (testUser) {
      testUserId = testUser._id.toString();
      testUser.wallet.availableBalance = 3000;
      testUser.wallet.rechargeBalance = 2000;
      testUser.spinsLeft = 2;
      await testUser.save();
    }

    // Ensure test admin exists
    let adminUser = await User.findOne({ phone: '9999999999' });
    if (!adminUser) {
      const hashed = await bcrypt.hash('admin123', 10);
      adminUser = await User.create({
        phone: '9999999999',
        password: hashed,
        role: 'admin',
        inviteCode: '999999',
      });
    } else {
      adminUser.role = 'admin';
      adminUser.password = await bcrypt.hash('admin123', 10);
      await adminUser.save();
    }

    // Get a plan id
    const plan = await Plan.findOne({ isActive: true });
    if (plan) {
      samplePlanId = plan._id.toString();
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('1. Health & Infrastructure Endpoints', () => {
    it('should return 200 healthy status with database connection info', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database.status).toBe('connected');
      expect(res.body.service).toContain('AeroMarine');
    });

    it('should return 200 on /api/health as well', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('2. Authentication & Authorization Security', () => {
    it('should login test user 7009962845 with yadav123', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone: '7009962845', password: 'yadav123' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.user.phone).toBe('7009962845');

      userToken = res.body.token;
    });

    it('should login admin 9999999999 with admin123', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone: '9999999999', password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.user.role).toBe('admin');

      adminToken = res.body.token;
    });

    it('should reject wrong password with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone: '7009962845', password: 'wrongpassword' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
    });

    it('should reject registration of existing phone number with clear message', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ phone: '7009962845', password: 'yadav123password' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
      expect(res.body.message).toContain('already registered');
    });

    it('should reject unauthenticated request to protected endpoint (401)', async () => {
      const res = await request(app).get('/api/orders/my');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('failed');
    });

    it('should deny non-admin user access to administrative overview (403)', async () => {
      const res = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('failed');
    });

    it('admin should have access to administrative overview (200)', async () => {
      const res = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.totalUsers).toBeGreaterThan(0);
    });
  });

  describe('3. Container Fleet Plans & Leases', () => {
    it('should fetch active container fleet plans', async () => {
      const res = await request(app).get('/api/plans');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should fetch user active container leases', async () => {
      const res = await request(app)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.stats).toBeDefined();
    });

    it('should lease a container plan with available balance', async () => {
      if (!samplePlanId) return;

      const res = await request(app)
        .post('/api/plans/buy')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ planId: samplePlanId });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.order).toBeDefined();
    });

    it('should reject leasing an invalid/non-existent plan ID with 404', async () => {
      const res = await request(app)
        .post('/api/plans/buy')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ planId: new mongoose.Types.ObjectId() });

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('failed');
    });
  });

  describe('4. Lucky Spin Wheel', () => {
    it('should execute spin and award instant cash prize', async () => {
      const res = await request(app)
        .post('/api/task/spin')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect([0, 10, 20, 50, 100, 500, 1000]).toContain(res.body.prize);
    });
  });

  describe('5. Recharge (Deposit) Flow & Concurrency Controls', () => {
    it('should reject recharge with amount below ₹750 minimum', async () => {
      const res = await request(app)
        .post('/api/wallet/recharge')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 100, utr: 'UTR_TOO_LOW_001', proofUrl: 'https://cloudinary.com/test.jpg' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
      expect(res.body.message).toContain('Minimum recharge amount is ₹750');
    });

    it('should submit a valid recharge request with UTR', async () => {
      const res = await request(app)
        .post('/api/wallet/recharge')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 750,
          utr: uniqueUtr,
          channel: 'Channel 1 (VIP Fast UPI)',
          proofUrl: 'https://cloudinary.com/test.jpg',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.recharge.status).toBe('pending');
      testRechargeId = res.body.recharge._id;
    });

    it('should reject duplicate submission with the same UTR', async () => {
      const res = await request(app)
        .post('/api/wallet/recharge')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 750,
          utr: uniqueUtr,
          channel: 'Channel 1 (VIP Fast UPI)',
          proofUrl: 'https://cloudinary.com/test.jpg',
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
      expect(res.body.message).toContain('already been submitted');
    });
  });

  describe('6. Withdrawal Flow & Anti-Overspending Protection', () => {
    it('should reject withdrawal exceeding available balance', async () => {
      const res = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 50000 });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
      expect(res.body.message).toContain('Insufficient');
    });

    it('should reject withdrawal below ₹120 minimum', async () => {
      const res = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 50 });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
      expect(res.body.message).toContain('Minimum withdrawal amount is ₹120');
    });

    it('should submit a valid withdrawal request and atomically reserve balance', async () => {
      const res = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 200 });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.withdrawal.receiveAmount).toBe(180); // 200 - 10% fee
      testWithdrawalId = res.body.withdrawal._id;
    });
  });

  describe('7. Admin 1-Click Approvals & Double-Processing Guards', () => {
    it('admin should approve pending recharge and credit balance', async () => {
      if (!testRechargeId) return;

      const res = await request(app)
        .post(`/api/admin/recharges/${testRechargeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.recharge.status).toBe('approved');
    });

    it('admin attempting to approve an ALREADY APPROVED recharge should be rejected (400)', async () => {
      if (!testRechargeId) return;

      const res = await request(app)
        .post(`/api/admin/recharges/${testRechargeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
      expect(res.body.message).toContain('already been processed');
    });

    it('admin should approve pending withdrawal', async () => {
      if (!testWithdrawalId) return;

      const res = await request(app)
        .post(`/api/admin/withdrawals/${testWithdrawalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ payoutReference: 'IMPS-TEST-12345' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.withdrawal.status).toBe('approved');
    });

    it('admin attempting to approve an ALREADY APPROVED withdrawal should be rejected (400)', async () => {
      if (!testWithdrawalId) return;

      const res = await request(app)
        .post(`/api/admin/withdrawals/${testWithdrawalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
      expect(res.body.message).toContain('already been processed');
    });

    it('admin should be able to run ledger reconciliation report for a user', async () => {
      if (!testUserId) return;

      const res = await request(app)
        .get(`/api/admin/reconcile/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.auditReconciliation).toBeDefined();
    });
  });
});
