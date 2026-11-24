import SystemSetting from '../models/SystemSetting.js';
import { logAudit } from '../services/auditService.js';

export const DEFAULT_APPEARANCE = {
  branding: {
    siteName: 'AeroMarine Shipping & Exports',
    tagline: 'Global Cargo Logistics & Maritime Capital Platform',
    logoUrl: '',
    logoDarkUrl: '',
    faviconUrl: '',
  },
  colors: {
    primaryColor: '#0077B6',
    secondaryColor: '#0B2545',
    accentColor: '#00B4D8',
    backgroundColor: '#F4F8FC',
  },
  header: {
    sticky: true,
    showSupportButton: true,
    ctaButton: {
      label: 'Open Account',
      href: '/register',
      visible: true,
    },
  },
  footer: {
    companyName: 'AeroMarine Logistics Global Ltd.',
    description:
      'Connecting maritime capital with verified global container logistics and international freight charter lines. Operating under strict auditable ledger governance.',
    address: 'International Port Complex, Nariman Point, Mumbai 400021, India',
    phone: '+91 22 4988 2000',
    email: 'compliance@aeromarine.site',
    copyright: '© 2026 AeroMarine Logistics Global Ltd. All rights reserved.',
    socialLinks: {
      telegram: 'https://t.me/aeromarine_official',
      whatsapp: 'https://wa.me/912249882000',
      twitter: '',
      linkedin: '',
    },
  },
  announcement: {
    enabled: true,
    text: 'Welcome to AeroMarine Shipping & Exports! Member 98***12 just received ₹4,354 daily yield! • Fast automated withdrawals active.',
    link: '/#plans',
  },
  seo: {
    defaultTitle: 'AeroMarine — Maritime Container Leasing & Freight Yields',
    defaultDescription:
      'Premier maritime shipping fleet operator and cargo container leasing platform. Earn daily automated freight yields with 100% insured assets.',
    defaultKeywords: 'container leasing, maritime investments, freight yields, shipping logistics, daily income',
    defaultOgImage: '',
    googleAnalyticsId: '',
  },
};

export const getPublicAppearance = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ key: 'site_appearance' });
    const appearance = setting ? { ...DEFAULT_APPEARANCE, ...setting.value } : DEFAULT_APPEARANCE;

    return res.json({
      status: 'success',
      success: true,
      data: appearance,
    });
  } catch (error) {
    console.error('[Appearance] getPublicAppearance error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error retrieving site appearance' });
  }
};

export const getAdminAppearance = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ key: 'site_appearance' });
    const appearance = setting ? { ...DEFAULT_APPEARANCE, ...setting.value } : DEFAULT_APPEARANCE;

    return res.json({
      status: 'success',
      success: true,
      data: appearance,
    });
  } catch (error) {
    console.error('[Appearance] getAdminAppearance error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error loading appearance settings' });
  }
};

export const updateAppearance = async (req, res) => {
  try {
    const updates = req.body;
    const admin = req.user;

    const existing = await SystemSetting.findOne({ key: 'site_appearance' });
    const currentValue = existing ? existing.value : DEFAULT_APPEARANCE;

    const merged = {
      branding: { ...currentValue.branding, ...(updates.branding || {}) },
      colors: { ...currentValue.colors, ...(updates.colors || {}) },
      header: { ...currentValue.header, ...(updates.header || {}) },
      footer: { ...currentValue.footer, ...(updates.footer || {}) },
      announcement: { ...currentValue.announcement, ...(updates.announcement || {}) },
      seo: { ...currentValue.seo, ...(updates.seo || {}) },
    };

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'site_appearance' },
      {
        key: 'site_appearance',
        value: merged,
        description: 'Global website appearance, branding, header, footer, and SEO defaults',
        isPublic: true,
        updatedBy: admin._id,
      },
      { upsert: true, new: true }
    );

    await logAudit({
      actor: admin,
      action: 'UPDATE_APPEARANCE',
      targetType: 'SystemSetting',
      targetId: setting._id,
      reason: 'Updated website branding, appearance, header/footer configuration',
      req,
    });

    return res.json({
      status: 'success',
      success: true,
      message: 'Website appearance updated successfully',
      data: setting.value,
    });
  } catch (error) {
    console.error('[Appearance] updateAppearance error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error updating appearance settings' });
  }
};
