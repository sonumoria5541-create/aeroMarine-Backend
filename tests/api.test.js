import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import User from '../src/models/User.js';
import Plan from '../src/models/Plan.js';

describe('AeroMarine Simple Mobile API Test Suite', () => {
  let userToken = '';
  let adminToken = '';
  let samplePlanId = '';
  let testRechargeId = '';
  let testWithdrawalId = '';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Get a plan id
    const plan = await Plan.findOne();
    if (plan) {
      samplePlanId = plan._id.toString();
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('1. Authentication Tests', () => {
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

    it('should get current user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.user.phone).toBe('7009962845');
      expect(res.body.user.wallet).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone: '7009962845', password: 'wrongpassword' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
    });
  });

  describe('2. Container Fleet Plans & Orders', () => {
    it('should fetch regular and welfare container plans', async () => {
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
      expect(res.body.data.stats.incomeTimer).toBeDefined();
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
  });

  describe('3. Lucky Spin Wheel', () => {
    it('should execute spin and award instant cash prize', async () => {
      // Ensure user has at least 1 spin
      await User.updateOne({ phone: '7009962845' }, { $set: { spinsLeft: 2 } });

      const res = await request(app)
        .post('/api/task/spin')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.prize).toBeGreaterThanOrEqual(200);
    });
  });

  describe('4. Recharge & Withdrawal Flow', () => {
    it('should submit a recharge request with UTR', async () => {
      const res = await request(app)
        .post('/api/wallet/recharge')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 500,
          utr: '123456789012',
          channel: 'Channel A Online',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.recharge.status).toBe('pending');
      testRechargeId = res.body.recharge._id;
    });

    it('should submit a withdrawal request to bound bank account', async () => {
      const res = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 200 });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.withdrawal.receiveAmount).toBe(180); // 200 - 10% fee
      testWithdrawalId = res.body.withdrawal._id;
    });

    it('should fetch account records', async () => {
      const res = await request(app)
        .get('/api/wallet/records')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('5. Admin 1-Click Approvals', () => {
    it('admin should approve pending recharge and credit balance', async () => {
      if (!testRechargeId) return;

      const res = await request(app)
        .post(`/api/admin/recharges/${testRechargeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.recharge.status).toBe('approved');
    });

    it('admin should approve pending withdrawal', async () => {
      if (!testWithdrawalId) return;

      const res = await request(app)
        .post(`/api/admin/withdrawals/${testWithdrawalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.withdrawal.status).toBe('approved');
    });
  });
});
