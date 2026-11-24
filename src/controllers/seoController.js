import Page from '../models/Page.js';
import Plan from '../models/Plan.js';
import SystemSetting from '../models/SystemSetting.js';
import { config } from '../config/env.js';
import { DEFAULT_APPEARANCE } from './appearanceController.js';

export const getSitemapXml = async (req, res) => {
  try {
    const siteUrl = (config.clientUrl || 'https://www.aeromarine.site').replace(/\/$/, '');

    const [pages, plans] = await Promise.all([
      Page.find({ status: 'published', 'seo.noIndex': { $ne: true } }).select('slug updatedAt'),
      Plan.find({ isActive: true }).select('_id updatedAt'),
    ]);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Root URL
    xml += `  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    // Static / Mobile routes
    const coreRoutes = ['/about', '/income', '/recharge', '/team'];
    for (const r of coreRoutes) {
      xml += `  <url>\n    <loc>${siteUrl}${r}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    // Dynamic CMS Pages
    for (const page of pages) {
      if (page.slug !== 'home') {
        const lastMod = (page.updatedAt || new Date()).toISOString().split('T')[0];
        xml += `  <url>\n    <loc>${siteUrl}/${page.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }
    }

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    return res.status(200).send(xml);
  } catch (error) {
    console.error('[SEO] getSitemapXml error:', error);
    return res.status(500).send('Error generating XML sitemap');
  }
};

export const getRobotsTxt = async (req, res) => {
  try {
    const siteUrl = (config.clientUrl || 'https://www.aeromarine.site').replace(/\/$/, '');
    const setting = await SystemSetting.findOne({ key: 'site_appearance' });
    const isMaintenance = setting?.value?.maintenanceMode || false;

    let robots = `User-agent: *\n`;
    if (isMaintenance) {
      robots += `Disallow: /\n`;
    } else {
      robots += `Disallow: /admin\n`;
      robots += `Disallow: /admin/\n`;
      robots += `Disallow: /api/\n`;
      robots += `Allow: /\n`;
      robots += `Sitemap: ${siteUrl}/sitemap.xml\n`;
    }

    res.header('Content-Type', 'text/plain');
    return res.status(200).send(robots);
  } catch (error) {
    console.error('[SEO] getRobotsTxt error:', error);
    return res.status(500).send('Error generating robots.txt');
  }
};

export const getSeoAuditReport = async (req, res) => {
  try {
    const pages = await Page.find({ status: 'published' });
    const setting = await SystemSetting.findOne({ key: 'site_appearance' });
    const globalSeo = setting?.value?.seo || DEFAULT_APPEARANCE.seo;

    const warnings = [];
    const pageAudits = [];
    const titlesSet = new Set();
    const descriptionsSet = new Set();

    for (const p of pages) {
      const pageWarnings = [];
      const title = p.seo?.title || p.title;
      const desc = p.seo?.description || p.description;

      if (!title || title.length < 10) {
        pageWarnings.push('Title tag is too short (under 10 characters)');
      } else if (title.length > 70) {
        pageWarnings.push('Title tag exceeds recommended 70 characters');
      }

      if (titlesSet.has(title)) {
        pageWarnings.push(`Duplicate title tag: "${title}" matches another page`);
      } else {
        titlesSet.add(title);
      }

      if (!desc || desc.length < 30) {
        pageWarnings.push('Meta description is missing or too short (under 30 characters)');
      } else if (desc.length > 160) {
        pageWarnings.push('Meta description exceeds recommended 160 characters');
      }

      if (descriptionsSet.has(desc)) {
        pageWarnings.push('Duplicate meta description detected');
      } else {
        descriptionsSet.add(desc);
      }

      if (!p.seo?.ogImage && !p.featuredImage && !globalSeo.defaultOgImage) {
        pageWarnings.push('Missing OpenGraph social share card image');
      }

      // Check section images for missing alt text
      let missingAltCount = 0;
      (p.sections || []).forEach((sec) => {
        (sec.images || []).forEach((img) => {
          if (!img.alt || !img.alt.trim()) missingAltCount++;
        });
      });

      if (missingAltCount > 0) {
        pageWarnings.push(`${missingAltCount} image(s) missing descriptive ALT attributes`);
      }

      if (pageWarnings.length > 0) {
        warnings.push({ pageTitle: p.title, slug: p.slug, issues: pageWarnings });
      }

      pageAudits.push({
        id: p._id,
        title: p.title,
        slug: p.slug,
        seoTitle: title,
        seoDescription: desc,
        hasOgImage: Boolean(p.seo?.ogImage || p.featuredImage || globalSeo.defaultOgImage),
        noIndex: p.seo?.noIndex || false,
        issuesCount: pageWarnings.length,
      });
    }

    return res.json({
      status: 'success',
      success: true,
      data: {
        globalSeo,
        totalChecked: pages.length,
        totalIssues: warnings.reduce((acc, w) => acc + w.issues.length, 0),
        warnings,
        pageAudits,
      },
    });
  } catch (error) {
    console.error('[SEO] getSeoAuditReport error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error compiling SEO audit report' });
  }
};
