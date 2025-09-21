import mongoose from 'mongoose';
const AuditLogSchema = new mongoose.Schema({
  actorId: mongoose.Types.ObjectId,
  actorRole: String,
  action: String,
  resource: String,
  ip: String,
  ua: String,
  at: { type: Date, default: Date.now }
}, { collection: 'audit_logs' });
export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
