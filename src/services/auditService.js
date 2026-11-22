import { AuditLog } from '../models/AuditLog.js';

export const logAudit = async ({
  actor = null,
  actorPhone = 'system',
  actorRole = 'system',
  action,
  targetType,
  targetId = null,
  reason = null,
  beforeSnapshot = null,
  afterSnapshot = null,
  req = null,
}) => {
  try {
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || '';
    const userAgent = req?.headers?.['user-agent'] || '';

    return await AuditLog.create({
      actor: actor?._id || actor || null,
      actorPhone: actor?.phone || actorPhone,
      actorRole: actor?.role || actorRole,
      action,
      targetType,
      targetId: targetId ? targetId.toString() : null,
      reason,
      beforeSnapshot,
      afterSnapshot,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err.message);
    // Audit logging failure should not break critical transactions
    return null;
  }
};
