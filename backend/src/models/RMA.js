import mongoose from 'mongoose';
const RMASchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['return', 'exchange', 'refund'] },
  status: { type: String, enum: ['requested', 'approved', 'rejected', 'processed'], default: 'requested' },
  items: [{ bookId: mongoose.Types.ObjectId, qty: Number, reason: String }]
}, { timestamps: true, collection: 'rmas' });
export const RMA = mongoose.model('RMA', RMASchema);
