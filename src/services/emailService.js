import { Resend } from 'resend';
import { config } from '../config/env.js';
import { NotificationOutbox } from '../models/NotificationOutbox.js';
import { getEmailTemplate } from '../utils/emailTemplates.js';

let resendClient = null;
if (config.resendApiKey) {
  try {
    resendClient = new Resend(config.resendApiKey);
  } catch (err) {
    console.error('[Resend] Init error:', err.message);
  }
}

export const queueAndSendEmail = async ({
  recipient,
  recipientName = '',
  template,
  data,
  eventKey = null,
}) => {
  const { subject, html } = getEmailTemplate(template, data);

  // 1. Create outbox record
  const outbox = await NotificationOutbox.create({
    recipient,
    recipientName,
    subject,
    template,
    eventKey,
    payload: data,
    status: 'pending',
    attempts: 0,
  });

  // 2. Attempt dispatch via Resend
  if (!resendClient || !config.resendApiKey) {
    console.log(`[Email Mock/Outbox] Resend key not configured. Queued email for ${recipient}: ${subject}`);
    outbox.status = 'sent';
    outbox.resendMessageId = 'mock_delivery_no_key';
    outbox.sentAt = new Date();
    await outbox.save();
    return outbox;
  }

  try {
    outbox.attempts += 1;
    const response = await resendClient.emails.send({
      from: config.resendFromEmail,
      to: recipient,
      subject,
      html,
    });

    if (response.error) {
      console.warn(`[Resend Warning] Delivery error for ${recipient}:`, response.error);
      outbox.status = 'failed';
      outbox.lastError = JSON.stringify(response.error);
    } else {
      console.log(`[Resend Success] Email sent to ${recipient}, id: ${response.data?.id}`);
      outbox.status = 'sent';
      outbox.resendMessageId = response.data?.id || 'delivered';
      outbox.sentAt = new Date();
    }
    await outbox.save();
    return outbox;
  } catch (err) {
    console.warn(`[Resend Exception] Error sending to ${recipient}: ${err.message}`);
    outbox.status = 'failed';
    outbox.lastError = err.message;
    await outbox.save();
    return outbox;
  }
};
