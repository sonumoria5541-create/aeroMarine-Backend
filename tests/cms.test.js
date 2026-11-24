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
import Page from '../src/models/Page.js';
import Inquiry from '../src/models/Inquiry.js';

describe('AeroMarine CMS, Media, Inquiries, Navigation & Staff Test Suite', () => {
  let adminToken = '';
  let userToken = '';
  let createdPageId = '';
  let createdInquiryId = '';
  let createdStaffId = '';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Ensure admin user exists
    let adminUser = await User.findOne({ phone: '9999999999' });
    if (!adminUser) {
      const hashed = await bcrypt.hash('admin123', 10);
      adminUser = await User.create({
        phone: '9999999999',
        password: hashed,
        role: 'admin',
        inviteCode: '999999',
      });
    }

    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone: '9999999999', password: 'admin123' });
    adminToken = adminLoginRes.body.token;

    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone: '7009962845', password: 'yadav123' });
    userToken = userLoginRes.body.token;
  });

  afterAll(async () => {
    // Clean up test records
    if (createdPageId) {
      await Page.findByIdAndDelete(createdPageId);
    }
    if (createdInquiryId) {
      await Inquiry.findByIdAndDelete(createdInquiryId);
    }
    if (createdStaffId) {
      await User.findByIdAndDelete(createdStaffId);
    }
    await mongoose.connection.close();
  });

  describe('1. Public CMS & Website Experience', () => {
    it('should return published home page with sections', async () => {
      const res = await request(app).get('/api/pages/home');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.slug).toBe('home');
      expect(Array.isArray(res.body.data.sections)).toBe(true);
    });

    it('should return 404 for non-existent page', async () => {
      const res = await request(app).get('/api/pages/non-existent-xyz-page');
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('failed');
    });

    it('should submit an inquiry through public desk', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({
          name: 'Maritime Fleet Test User',
          email: 'fleet.inquiry@testmaritime.org',
          phone: '9876543210',
          subject: 'Cold-Chain Reefer Leasing Inquiry',
          message: 'Interested in allocating 5x 40ft Reefer units for the Arabian Sea line.',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.inquiryId).toBeDefined();

      const created = await Inquiry.findOne({ email: 'fleet.inquiry@testmaritime.org' });
      if (created) createdInquiryId = created._id.toString();
    });

    it('should return navigation menus (header & footer)', async () => {
      const res = await request(app).get('/api/navigation');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.header).toBeDefined();
      expect(res.body.data.footer).toBeDefined();
    });

    it('should return public website appearance and branding', async () => {
      const res = await request(app).get('/api/appearance');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.branding.siteName).toBeDefined();
      expect(res.body.data.colors.primaryColor).toBeDefined();
    });

    it('should serve dynamic XML sitemap', async () => {
      const res = await request(app).get('/sitemap.xml');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/xml');
      expect(res.text).toContain('<urlset');
    });

    it('should serve dynamic robots.txt', async () => {
      const res = await request(app).get('/robots.txt');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('User-agent: *');
    });
  });

  describe('2. Administrative CMS Page Management & Protection', () => {
    it('should reject unauthorized user from accessing admin pages', async () => {
      const res = await request(app)
        .get('/api/admin/pages')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('admin should fetch all pages', async () => {
      const res = await request(app)
        .get('/api/admin/pages')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.pages.length).toBeGreaterThan(0);
    });

    it('admin should create a new CMS landing page', async () => {
      const res = await request(app)
        .post('/api/admin/pages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Specialized ISO Tanker Fleet',
          slug: 'iso-tankers',
          description: 'Specialized chemical and food-grade bulk liquid logistics.',
          status: 'published',
          sections: [
            {
              id: 'sec_tanker_hero',
              type: 'hero',
              name: 'Tanker Hero',
              title: 'Global Liquid Bulk Logistics',
              subtitle: 'ISO Certified Fleet Units',
              content: 'Liquid bulk containers for food-grade oils and certified petrochemical transport.',
              settings: { visible: true, alignment: 'left' },
              order: 1,
            },
          ],
          seo: {
            title: 'ISO Tanker Containers — AeroMarine Freight',
            description: 'Deploy capital in specialized ISO tankers with guaranteed charter payouts.',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.slug).toBe('iso-tankers');
      createdPageId = res.body.data._id;
    });

    it('admin should duplicate a page as draft', async () => {
      const res = await request(app)
        .post(`/api/admin/pages/${createdPageId}/duplicate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.title).toContain('(Copy)');

      // Clean up clone
      await Page.findByIdAndDelete(res.body.data._id);
    });

    it('admin should reject deletion of system page (e.g. home)', async () => {
      const homePage = await Page.findOne({ slug: 'home' });
      expect(homePage).toBeDefined();

      const res = await request(app)
        .delete(`/api/admin/pages/${homePage._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Critical system pages cannot be deleted');
    });

    it('admin should delete non-system page successfully', async () => {
      const res = await request(app)
        .delete(`/api/admin/pages/${createdPageId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      createdPageId = ''; // cleared
    });
  });

  describe('3. Inquiries & Lead Management', () => {
    it('admin should list inquiries with status counts', async () => {
      const res = await request(app)
        .get('/api/admin/inquiries')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.statusCounts).toBeDefined();
      expect(Array.isArray(res.body.data.inquiries)).toBe(true);
    });

    it('admin should update inquiry status and add coordinator note', async () => {
      if (!createdInquiryId) return;

      const res = await request(app)
        .patch(`/api/admin/inquiries/${createdInquiryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'in_progress',
          priority: 'high',
          adminNote: 'Contacted client regarding reefer fleet allocation via phone.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('in_progress');
      expect(res.body.data.priority).toBe('high');
      expect(res.body.data.adminNotes.length).toBeGreaterThan(0);
    });
  });

  describe('4. Appearance & SEO Audit', () => {
    it('admin should update website appearance', async () => {
      const res = await request(app)
        .patch('/api/admin/appearance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          branding: { siteName: 'AeroMarine Maritime Freight Network' },
          colors: { primaryColor: '#0077B6' },
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.branding.siteName).toBe('AeroMarine Maritime Freight Network');
    });

    it('admin should run comprehensive SEO audit', async () => {
      const res = await request(app)
        .get('/api/admin/seo/audit')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.totalChecked).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.pageAudits)).toBe(true);
    });
  });

  describe('5. Staff & Granular RBAC', () => {
    const testStaffPhone = '8888877777';

    it('admin should create a new staff account with granular permissions', async () => {
      const res = await request(app)
        .post('/api/admin/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          phone: testStaffPhone,
          password: 'staffpassword123',
          name: 'Officer Rajesh',
          role: 'support',
          permissions: ['inquiries.manage', 'content.manage'],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.role).toBe('support');
      expect(res.body.data.permissions).toContain('inquiries.manage');
      createdStaffId = res.body.data._id;
    });

    it('admin should update staff permissions', async () => {
      const res = await request(app)
        .patch(`/api/admin/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'operations',
          permissions: ['inquiries.manage', 'content.manage', 'pages.manage'],
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.role).toBe('operations');
      expect(res.body.data.permissions).toContain('pages.manage');
    });

    it('admin should revoke staff privileges', async () => {
      const res = await request(app)
        .delete(`/api/admin/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });
});
