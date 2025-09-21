import { AuditLog } from '../models/AuditLog.js';
export async function adminAudit(req, _res, next) {
  try {
    await AuditLog.create({
      actorId: req.user?._id || null,
      actor: req.user?.name || req.user?.email || null,
      roles: (Array.isArray(req.user?.roles) ? req.user.roles : req.user?.role ? [req.user.role] : []).join(','),
      method: req.method,
      path: req.originalUrl,
      resource: req.baseUrl,
      ip: req.ip,
      ua: req.headers['user-agent'] || '',
      ts: new Date(),
    });
  } catch (_) {
  
  }
  next();
}
