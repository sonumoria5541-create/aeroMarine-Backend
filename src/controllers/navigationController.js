import NavigationMenu from '../models/NavigationMenu.js';
import { logAudit } from '../services/auditService.js';

const DEFAULT_MENUS = {
  header: {
    location: 'header',
    title: 'Main Navigation Header',
    items: [
      { id: 'nav_fleet', label: 'Fleet Plans', href: '/#plans', isExternal: false, order: 1 },
      { id: 'nav_about', label: 'Maritime Operations', href: '/about', isExternal: false, order: 2 },
      { id: 'nav_contact', label: 'Contact Desk', href: '/contact', isExternal: false, order: 3 },
      { id: 'nav_terms', label: 'Legal & Risk', href: '/terms', isExternal: false, order: 4 },
    ],
    isActive: true,
  },
  footer: {
    location: 'footer',
    title: 'Footer Navigation Columns',
    items: [
      { id: 'foot_containers', label: 'Container Fleet', href: '/#plans', isExternal: false, order: 1 },
      { id: 'foot_about', label: 'Maritime Logistics', href: '/about', isExternal: false, order: 2 },
      { id: 'foot_recharge', label: 'Wallet Recharge', href: '/recharge', isExternal: false, order: 3 },
      { id: 'foot_terms', label: 'Terms & Disclosures', href: '/terms', isExternal: false, order: 4 },
      { id: 'foot_contact', label: 'Port Operations Desk', href: '/contact', isExternal: false, order: 5 },
    ],
    isActive: true,
  },
};

export const getPublicNavigation = async (req, res) => {
  try {
    const { location } = req.query;
    const query = { isActive: true };
    if (location) query.location = location;

    let menus = await NavigationMenu.find(query);

    // Auto-seed defaults if not present
    if (menus.length === 0) {
      for (const [locKey, defaultMenu] of Object.entries(DEFAULT_MENUS)) {
        const created = await NavigationMenu.findOneAndUpdate(
          { location: locKey },
          defaultMenu,
          { upsert: true, new: true }
        );
        menus.push(created);
      }
    }

    const menuMap = {};
    menus.forEach((m) => {
      menuMap[m.location] = m.items.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    return res.json({
      status: 'success',
      success: true,
      data: menuMap,
    });
  } catch (error) {
    console.error('[Navigation] getPublicNavigation error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error loading navigation' });
  }
};

export const getAdminNavigations = async (req, res) => {
  try {
    for (const [locKey, defaultMenu] of Object.entries(DEFAULT_MENUS)) {
      const exists = await NavigationMenu.exists({ location: locKey });
      if (!exists) {
        await NavigationMenu.create(defaultMenu);
      }
    }

    const menus = await NavigationMenu.find({}).sort({ location: 1 });
    return res.json({
      status: 'success',
      success: true,
      data: menus,
    });
  } catch (error) {
    console.error('[Navigation] getAdminNavigations error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error loading menus' });
  }
};

export const updateNavigationMenu = async (req, res) => {
  try {
    const { location } = req.params;
    const { title, items, isActive } = req.body;
    const admin = req.user;

    if (!['header', 'footer', 'mobile', 'quick_links'].includes(location)) {
      return res.status(400).json({ status: 'failed', success: false, message: 'Invalid menu location' });
    }

    const formattedItems = Array.isArray(items)
      ? items.map((it, idx) => ({
          ...it,
          id: it.id || `menu_${Date.now()}_${idx}`,
          order: it.order !== undefined ? it.order : idx + 1,
        }))
      : [];

    const menu = await NavigationMenu.findOneAndUpdate(
      { location },
      {
        title: title || `${location.toUpperCase()} Menu`,
        items: formattedItems,
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: admin._id,
      },
      { upsert: true, new: true }
    );

    await logAudit({
      actor: admin,
      action: 'UPDATE_NAVIGATION',
      targetType: 'NavigationMenu',
      targetId: menu._id,
      reason: `Updated ${location} navigation menu items (${formattedItems.length} items)`,
      req,
    });

    return res.json({
      status: 'success',
      success: true,
      message: `Updated ${location} navigation successfully`,
      data: menu,
    });
  } catch (error) {
    console.error('[Navigation] updateNavigationMenu error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error updating navigation' });
  }
};
