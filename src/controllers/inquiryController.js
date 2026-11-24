import Inquiry from '../models/Inquiry.js';
import { queueAndSendEmail } from '../services/emailService.js';
import { config } from '../config/env.js';
import { logAudit } from '../services/auditService.js';

export const submitInquiry = async (req, res) => {
  try {
    const { name, email, phone = '', subject = '', message, sourcePage = '/contact' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'failed', success: false, message: 'Your name is required' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ status: 'failed', success: false, message: 'A valid email address is required' });
    }

    if (!message || message.trim().length < 5) {
      return res.status(400).json({ status: 'failed', success: false, message: 'Message must be at least 5 characters' });
    }

    const inquiryId = `INQ-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const inquiry = await Inquiry.create({
      inquiryId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      subject: subject.trim() || 'General Maritime Logistics Inquiry',
      message: message.trim(),
      sourcePage,
      status: 'new',
      priority: 'normal',
      ipAddress: req.ip || '',
    });

    // Notify support operations desk via Resend
    try {
      const recipient = config.supportEmail || config.adminNotificationEmail;
      if (recipient) {
        await queueAndSendEmail({
          recipient,
          template: 'admin_deposit_notification',
          data: {
            requestId: inquiryId,
            userName: name.trim(),
            userPhone: phone.trim() || 'Not provided',
            amount: 0,
            paymentMethod: 'INQUIRY DESK',
            paymentReference: `${subject || 'Logistics'}: ${message.trim().slice(0, 80)}...`,
          },
          eventKey: `inquiry_alert_${inquiry._id}`,
        });
      }
    } catch (emailErr) {
      console.warn('[Inquiry Notice] Could not queue coordinator email:', emailErr.message);
    }

    return res.status(201).json({
      status: 'success',
      success: true,
      message: 'Thank you for reaching out! Your inquiry has been logged and our port operations coordinator will review it shortly.',
      inquiryId,
    });
  } catch (error) {
    console.error('[Inquiry] submitInquiry error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error submitting inquiry request' });
  }
};

export const getInquiries = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 25 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        { inquiryId: { $regex: s, $options: 'i' } },
        { subject: { $regex: s, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 25;
    const skip = (pageNum - 1) * pageSize;

    const [total, inquiries, statusCounts] = await Promise.all([
      Inquiry.countDocuments(query),
      Inquiry.find(query)
        .populate('assignedTo', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Inquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const countsMap = { new: 0, in_progress: 0, resolved: 0, closed: 0, spam: 0 };
    statusCounts.forEach((sc) => {
      if (sc._id && countsMap[sc._id] !== undefined) countsMap[sc._id] = sc.count;
    });

    return res.json({
      status: 'success',
      success: true,
      data: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / pageSize),
        statusCounts: countsMap,
        inquiries,
      },
    });
  } catch (error) {
    console.error('[Inquiry] getInquiries error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error retrieving inquiries' });
  }
};

export const getInquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await Inquiry.findById(id).populate('assignedTo', 'name phone email');

    if (!inquiry) {
      return res.status(404).json({ status: 'failed', success: false, message: 'Inquiry not found' });
    }

    return res.json({
      status: 'success',
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error('[Inquiry] getInquiryById error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error loading inquiry details' });
  }
};

export const updateInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNote, assignedTo } = req.body;
    const admin = req.user;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ status: 'failed', success: false, message: 'Inquiry not found' });
    }

    if (status && ['new', 'in_progress', 'resolved', 'closed', 'spam'].includes(status)) {
      inquiry.status = status;
      if (status === 'resolved' && !inquiry.respondedAt) {
        inquiry.respondedAt = new Date();
      }
    }

    if (priority && ['normal', 'high', 'urgent'].includes(priority)) {
      inquiry.priority = priority;
    }

    if (assignedTo !== undefined) {
      inquiry.assignedTo = assignedTo || null;
    }

    if (adminNote && adminNote.trim()) {
      inquiry.adminNotes.push({
        text: adminNote.trim(),
        author: admin.phone || admin.name || 'Admin',
        createdAt: new Date(),
      });
    }

    await inquiry.save();

    await logAudit({
      actor: admin,
      action: 'UPDATE_INQUIRY',
      targetType: 'Inquiry',
      targetId: inquiry._id,
      reason: `Updated inquiry ${inquiry.inquiryId} to status: ${inquiry.status}`,
      req,
    });

    return res.json({
      status: 'success',
      success: true,
      message: 'Inquiry updated successfully',
      data: inquiry,
    });
  } catch (error) {
    console.error('[Inquiry] updateInquiry error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error updating inquiry' });
  }
};

export const deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = req.user;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ status: 'failed', success: false, message: 'Inquiry not found' });
    }

    await Inquiry.findByIdAndDelete(id);

    await logAudit({
      actor: admin,
      action: 'DELETE_INQUIRY',
      targetType: 'Inquiry',
      targetId: inquiry._id,
      reason: `Deleted customer inquiry: ${inquiry.inquiryId}`,
      req,
    });

    return res.json({
      status: 'success',
      success: true,
      message: 'Inquiry deleted successfully',
    });
  } catch (error) {
    console.error('[Inquiry] deleteInquiry error:', error);
    return res.status(500).json({ status: 'failed', success: false, message: 'Error deleting inquiry' });
  }
};
