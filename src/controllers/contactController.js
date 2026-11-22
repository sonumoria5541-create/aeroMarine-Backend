import { queueAndSendEmail } from '../services/emailService.js';
import { config } from '../config/env.js';

export const submitContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Send email alert to support desk
    if (config.supportEmail) {
      await queueAndSendEmail({
        recipient: config.supportEmail,
        template: 'admin_deposit_notification', // fallback template or simple alert
        data: {
          requestId: `INQ-${Date.now().toString().slice(-4)}`,
          userName: name,
          userPhone: phone || 'Not provided',
          amount: 0,
          paymentMethod: 'INQUIRY',
          paymentReference: `${subject}: ${message}`,
        },
        eventKey: `contact_${Date.now()}`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for reaching out. An AeroMarine port coordinator will review your inquiry shortly.',
    });
  } catch (err) {
    next(err);
  }
};
