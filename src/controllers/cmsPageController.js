import Page from '../models/Page.js';
import { logAudit } from '../services/auditService.js';

// Default system page templates to ensure 100% backward compatibility
export const DEFAULT_PAGE_TEMPLATES = {
  home: {
    title: 'AeroMarine — Premier Maritime Container Leasing & Freight Yields',
    slug: 'home',
    description: 'Premier maritime shipping fleet operator and cargo container leasing platform. Earn daily automated freight yields.',
    status: 'published',
    isSystemPage: true,
    seo: {
      title: 'AeroMarine — Global Maritime Cargo & Container Leasing Platform',
      description: 'Connecting maritime capital with verified global container logistics and international freight charter lines.',
      keywords: 'container leasing, maritime investments, freight yields, shipping logistics',
    },
    sections: [
      {
        id: 'sec_hero_1',
        type: 'hero',
        name: 'Hero Banner',
        title: 'Global Cargo Container Yields',
        subtitle: 'Fleet Leasing Program',
        content: 'Earn daily automated payouts from international ocean freight routes.',
        badge: '⚡ 100% Insured Cargo Assets',
        buttons: [
          { label: 'Recharge Wallet', href: '/recharge', variant: 'primary', isExternal: false },
          { label: 'View Fleet Plans', href: '/#plans', variant: 'secondary', isExternal: false },
        ],
        settings: { visible: true, alignment: 'left', paddingY: 'normal', containerWidth: 'wide' },
        order: 1,
      },
      {
        id: 'sec_announcement_1',
        type: 'announcement_banner',
        name: 'Live Operations Marquee',
        title: 'Live Freight Dispatch Notice',
        content: 'Welcome to AeroMarine Shipping & Exports! Member 98***12 just received ₹4,354 daily yield! • Fast automated withdrawals active.',
        badge: 'LIVE DISPATCH',
        settings: { visible: true, paddingY: 'compact', containerWidth: 'wide' },
        order: 2,
      },
      {
        id: 'sec_plans_1',
        type: 'plans_catalog',
        name: 'Fleet Plans Catalog',
        title: 'Active Container Allocations',
        subtitle: 'Daily Automated Payouts • 13.3% Daily Yield',
        content: 'Select an active container fleet allocation deployed across verified global trade corridors.',
        badge: 'ACTIVE FLEET',
        settings: { visible: true, alignment: 'center', paddingY: 'normal', containerWidth: 'wide' },
        order: 3,
      },
    ],
  },
  about: {
    title: 'About AeroMarine Shipping & Exports',
    slug: 'about',
    description: 'Premier shipping fleet operator and cargo leasing enterprise across major trade corridors.',
    status: 'published',
    isSystemPage: true,
    seo: {
      title: 'About AeroMarine — Maritime Fleet Logistics & Infrastructure',
      description: 'Learn about our ocean freight operations, intermodal containers, and 30% Level 1 referral rewards.',
      keywords: 'about aeromarine, maritime logistics, cargo fleet operator',
    },
    sections: [
      {
        id: 'sec_about_story',
        type: 'about_story',
        name: 'Company Background',
        title: 'AEROMARINE SHIPPING & EXPORTS',
        subtitle: 'Maritime Capital Platform',
        content: 'The power of international maritime logistics — now a modern earnings platform built for steady daily income, high-tier team rewards, and complete financial security. AeroMarine is a premier shipping fleet operator and cargo leasing enterprise leasing intermodal dry containers, specialized refrigerated units, and coastal bulk vessels across major trade corridors in the Indian Ocean, Arabian Sea, and Asia-Pacific.',
        settings: { visible: true, alignment: 'center', paddingY: 'normal', containerWidth: 'wide' },
        order: 1,
      },
      {
        id: 'sec_about_stats',
        type: 'stats',
        name: 'Performance Metrics',
        title: 'Why Members Choose Us',
        items: [
          { value: '30%', label: 'Level-1 Commission', description: 'Instant direct payouts on member recharges' },
          { value: '24h', label: 'Auto Daily Payout', description: 'Hands-free automatic daily wallet credit' },
          { value: '100%', label: 'Secure & Insured', description: 'Full maritime equipment asset backing' },
          { value: '24×7', label: 'Member Support', description: 'Dedicated logistics and operations help desk' },
        ],
        settings: { visible: true, paddingY: 'normal', containerWidth: 'wide' },
        order: 2,
      },
      {
        id: 'sec_about_steps',
        type: 'features',
        name: 'How It Works',
        title: 'How It Works',
        subtitle: '4 Simple Steps to Maritime Yields',
        items: [
          { title: 'Recharge your wallet', description: 'Add funds securely through our instant UPI / QR payment gateway.' },
          { title: 'Choose a container lease plan', description: 'Every fleet plan has a fixed price, set daily yield, and predefined duration.' },
          { title: 'Receive automated freight yields', description: 'Daily income is automatically calculated and credited directly to your balance.' },
          { title: 'Withdraw earnings anytime', description: 'Request instant bank transfers or UPI payouts with zero hidden fees.' },
        ],
        settings: { visible: true, paddingY: 'normal', containerWidth: 'wide' },
        order: 3,
      },
    ],
  },
  contact: {
    title: 'Contact Port Operations Desk',
    slug: 'contact',
    description: 'Have questions regarding container allocations or banking verification? Contact our port operations coordinators.',
    status: 'published',
    isSystemPage: true,
    seo: {
      title: 'Contact Us — AeroMarine Port Logistics Desk',
      description: 'Get in touch with AeroMarine maritime operations desk for inquiries and fleet assistance.',
    },
    sections: [
      {
        id: 'sec_contact_hub',
        type: 'contact_block',
        name: 'Contact Coordinates & Form',
        title: 'Contact Port Operations Desk',
        subtitle: 'Support & Logistics Desk',
        content: 'Have questions regarding container allocations, banking deposit verification, or charter contract terms? Our operations team is available Monday through Saturday.',
        settings: { visible: true, paddingY: 'normal', containerWidth: 'wide' },
        order: 1,
      },
    ],
  },
  terms: {
    title: 'Terms of Service & Maritime Risk Disclosure',
    slug: 'terms',
    description: 'Governance, risk disclosures, refund policies, and participation terms for AeroMarine.',
    status: 'published',
    isSystemPage: true,
    seo: {
      title: 'Terms & Disclosures — AeroMarine Platform Governance',
      description: 'Official terms, conditions, and risk disclosures for AeroMarine container leasing.',
    },
    sections: [
      {
        id: 'sec_terms_content',
        type: 'rich_text',
        name: 'Legal Terms & Disclosure Content',
        title: 'Maritime Equipment Lease Governance & Risk Disclosures',
        subtitle: 'Legal and Compliance Guidelines',
        content: `<h3>1. Equipment Lease Agreements</h3><p>By participating in AeroMarine container allocations, you agree to the terms governing intermodal cargo container leases. Equipment is operated on active charter routes.</p><h3>2. Financial Returns & Daily Yields</h3><p>Daily returns are calculated on active equipment utilization. Past performance in shipping logistics does not guarantee identical future freight rates.</p><h3>3. Withdrawal & Payout Rules</h3><p>Withdrawals are settled during standard banking hours via IMPS or UPI. Requests are subject to anti-money laundering and ledger reconciliation checks.</p>`,
        settings: { visible: true, paddingY: 'normal', containerWidth: 'wide' },
        order: 1,
      },
    ],
  },
};

// ==========================================
// 1. PUBLIC PAGE APIS
// ==========================================

export const getPublicPageBySlug = async (req, res) => {
  try {
    const rawSlug = (req.params.slug || 'home').toLowerCase().trim();
    const cleanSlug = rawSlug === '' || rawSlug === 'index' ? 'home' : rawSlug;

    let page = await Page.findOne({ slug: cleanSlug, status: 'published' });

    // Fall back to default template if not yet initialized in database
    if (!page && DEFAULT_PAGE_TEMPLATES[cleanSlug]) {
      const template = DEFAULT_PAGE_TEMPLATES[cleanSlug];
      page = await Page.findOneAndUpdate(
        { slug: cleanSlug },
        { ...template, isSystemPage: true },
        { upsert: true, new: true }
      );
    }

    if (!page) {
      return res.status(404).json({
        status: 'failed',
        success: false,
        message: `Page '/${cleanSlug}' not found or not currently published.`,
      });
    }

    // Sort visible sections by order
    const visibleSections = (page.sections || [])
      .filter((s) => s.settings?.visible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    return res.json({
      status: 'success',
      success: true,
      data: {
        _id: page._id,
        title: page.title,
        slug: page.slug,
        description: page.description,
        featuredImage: page.featuredImage,
        seo: page.seo,
        sections: visibleSections,
        publishedAt: page.publishedAt,
        updatedAt: page.updatedAt,
      },
    });
  } catch (error) {
    console.error('[CMS] getPublicPageBySlug error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error retrieving page content' });
  }
};

export const getPublicPages = async (req, res) => {
  try {
    const pages = await Page.find({ status: 'published' })
      .select('title slug description featuredImage updatedAt')
      .sort({ title: 1 });

    return res.json({
      status: 'success',
      success: true,
      data: pages,
    });
  } catch (error) {
    console.error('[CMS] getPublicPages error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error retrieving public page list' });
  }
};

// ==========================================
// 2. ADMINISTRATIVE CMS APIS
// ==========================================

export const getAdminPages = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && ['draft', 'published', 'archived'].includes(status)) {
      query.status = status;
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [{ title: { $regex: s, $options: 'i' } }, { slug: { $regex: s, $options: 'i' } }];
    }

    // Ensure default system pages exist
    for (const [key, tpl] of Object.entries(DEFAULT_PAGE_TEMPLATES)) {
      const exists = await Page.exists({ slug: key });
      if (!exists) {
        await Page.create({ ...tpl, isSystemPage: true });
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * pageSize;

    const [total, pages] = await Promise.all([
      Page.countDocuments(query),
      Page.find(query)
        .populate('updatedBy', 'phone role name')
        .sort({ isSystemPage: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
    ]);

    return res.json({
      status: 'success',
      success: true,
      data: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / pageSize),
        pages,
      },
    });
  } catch (error) {
    console.error('[CMS] getAdminPages error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error loading admin pages' });
  }
};

export const getAdminPageById = async (req, res) => {
  try {
    const { id } = req.params;
    let page = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      page = await Page.findById(id).populate('updatedBy', 'phone role');
    } else {
      page = await Page.findOne({ slug: id.toLowerCase() }).populate('updatedBy', 'phone role');
    }

    if (!page) {
      return res.status(404).json({ status: 'failed', success: false, message: 'Page not found' });
    }

    // Sort sections by order
    page.sections.sort((a, b) => (a.order || 0) - (b.order || 0));

    return res.json({
      status: 'success',
      success: true,
      data: page,
    });
  } catch (error) {
    console.error('[CMS] getAdminPageById error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error loading page' });
  }
};

export const createPage = async (req, res) => {
  try {
    const { title, slug, description, status = 'published', sections = [], featuredImage = '', seo = {} } = req.body;
    const admin = req.user;

    if (!title || !title.trim()) {
      return res.status(400).json({ status: 'failed', success: false, message: 'Page title is required' });
    }

    const cleanSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanSlug) {
      return res.status(400).json({ status: 'failed', success: false, message: 'Valid URL slug is required' });
    }

    const existing = await Page.findOne({ slug: cleanSlug });
    if (existing) {
      return res.status(400).json({ status: 'failed', success: false, message: `URL slug '/${cleanSlug}' already exists` });
    }

    const newPage = await Page.create({
      title: title.trim(),
      slug: cleanSlug,
      description: description || '',
      status,
      isSystemPage: false,
      sections: sections.map((sec, idx) => ({
        ...sec,
        id: sec.id || `sec_${Date.now()}_${idx}`,
        order: sec.order !== undefined ? sec.order : idx + 1,
      })),
      featuredImage,
      seo,
      createdBy: admin._id,
      updatedBy: admin._id,
      publishedAt: status === 'published' ? new Date() : null,
    });

    await logAudit({
      actor: admin,
      action: 'CREATE_PAGE',
      targetType: 'Page',
      targetId: newPage._id,
      reason: `Created new CMS page: ${newPage.title} (/${newPage.slug})`,
      req,
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: `Page '${newPage.title}' created successfully`,
      data: newPage,
    });
  } catch (error) {
    console.error('[CMS] createPage error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error creating page' });
  }
};

export const updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, description, status, sections, featuredImage, seo } = req.body;
    const admin = req.user;

    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({ status: 'failed', success: false, message: 'Page not found' });
    }

    if (title !== undefined) page.title = title.trim();
    if (description !== undefined) page.description = description;
    if (featuredImage !== undefined) page.featuredImage = featuredImage;
    if (seo !== undefined) page.seo = { ...page.seo, ...seo };

    // Prevent changing slug of critical system pages
    if (slug !== undefined && slug.trim() && slug.trim().toLowerCase() !== page.slug) {
      if (page.isSystemPage) {
        return res.status(400).json({
          status: 'failed',
          success: false,
          message: 'System page URL slugs are protected and cannot be changed.',
        });
      }
      const cleanSlug = slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const conflict = await Page.findOne({ slug: cleanSlug, _id: { $ne: page._id } });
      if (conflict) {
        return res.status(400).json({ status: 'failed', success: false, message: `Slug '/${cleanSlug}' is already in use` });
      }
      page.slug = cleanSlug;
    }

    if (status !== undefined && ['draft', 'published', 'archived'].includes(status)) {
      page.status = status;
      if (status === 'published' && !page.publishedAt) {
        page.publishedAt = new Date();
      }
    }

    if (Array.isArray(sections)) {
      page.sections = sections.map((sec, idx) => ({
        ...sec,
        id: sec.id || `sec_${Date.now()}_${idx}`,
        order: sec.order !== undefined ? sec.order : idx + 1,
      }));
    }

    page.updatedBy = admin._id;
    await page.save();

    await logAudit({
      actor: admin,
      action: 'UPDATE_PAGE',
      targetType: 'Page',
      targetId: page._id,
      reason: `Updated CMS page: ${page.title} (/${page.slug})`,
      req,
    });

    return res.json({
      status: 'success',
      success: true,
      message: `Page '${page.title}' updated successfully`,
      data: page,
    });
  } catch (error) {
    console.error('[CMS] updatePage error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error updating page' });
  }
};

export const deletePage = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = req.user;

    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({ status: 'failed', success: false, message: 'Page not found' });
    }

    // Protection: Never allow accidental deletion of critical system pages
    if (page.isSystemPage || ['home', 'about', 'contact', 'terms'].includes(page.slug)) {
      return res.status(403).json({
        status: 'failed',
        success: false,
        message: 'Security Violation: Critical system pages cannot be deleted.',
      });
    }

    await Page.findByIdAndDelete(id);

    await logAudit({
      actor: admin,
      action: 'DELETE_PAGE',
      targetType: 'Page',
      targetId: page._id,
      reason: `Deleted CMS page: ${page.title} (/${page.slug})`,
      req,
    });

    return res.json({
      status: 'success',
      success: true,
      message: `Page '${page.title}' deleted successfully`,
    });
  } catch (error) {
    console.error('[CMS] deletePage error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error deleting page' });
  }
};

export const duplicatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = req.user;

    const source = await Page.findById(id);
    if (!source) {
      return res.status(404).json({ status: 'failed', success: false, message: 'Source page not found' });
    }

    const newSlug = `${source.slug}-copy-${Date.now().toString().slice(-4)}`;
    const cloned = await Page.create({
      title: `${source.title} (Copy)`,
      slug: newSlug,
      description: source.description,
      status: 'draft',
      isSystemPage: false,
      sections: source.sections.map((s, idx) => ({
        ...s.toObject(),
        id: `sec_${Date.now()}_${idx}`,
      })),
      featuredImage: source.featuredImage,
      seo: { ...source.seo, title: `${source.seo?.title || source.title} (Copy)` },
      createdBy: admin._id,
      updatedBy: admin._id,
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: `Duplicated '${source.title}' as '${cloned.title}' (Draft)`,
      data: cloned,
    });
  } catch (error) {
    console.error('[CMS] duplicatePage error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error duplicating page' });
  }
};
