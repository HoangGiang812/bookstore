// backend/src/models/Order.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

/* ===== Sub-schemas ===== */
const CancelRequestSchema = new Schema({
  requested:   { type: Boolean, default: false },
  reason:      { type: String, default: '' },
  byUser:      { type: Schema.Types.ObjectId, ref: 'User' },
  requestedAt: { type: Date }
}, { _id: false });

const RefundSchema = new Schema({
  ok:     { type: Boolean, default: false },
  amount: { type: Number, default: 0 },
  txnId:  { type: String, default: '' }
}, { _id: false });

const CancellationSchema = new Schema({
  approved:   { type: Boolean, default: false },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },
  refund:     { type: RefundSchema, default: () => ({}) }
}, { _id: false });

const StatusHistorySchema = new Schema({
  at:   { type: Date, default: Date.now },
  by:   { type: String, default: 'system' }, // email / name / 'system'
  type: { type: String, default: '' },       // create|paid|process|ship|deliver|cancel_requested|cancel|...
  note: { type: String, default: '' },
  amount: Number
}, { _id: false });

/* ===== Main schema ===== */
const OrderSchema = new Schema({
  code:  { type: String, index: true },
  userId:{ type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },

  idempotencyKey: { type: String, index: true },

  items: [{
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    title:  { type: String, default: '' },
    image:  { type: String, default: '' },
    price:  { type: Number, required: true },
    qty:    { type: Number, required: true, min: 1 },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' }
  }],

  subtotal:     { type: Number, default: 0 },
  shippingFee:  { type: Number, default: 0 },
  tax:          { type: Number, default: 0 },
  discount:     { type: Number, default: 0 },
  total: {
    sub:   { type: Number, default: 0 },
    grand: { type: Number, default: 0 }
  },

  pricing: {
    subtotal:   { type: Number, default: 0 },
    shipping:   { type: Number, default: 0 }, // alias shippingFee
    tax:        { type: Number, default: 0 },
    discount:   { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 }
  },

  shippingAddress: {
    label: String,
    receiver: String,
    phone: String,
    province: String,
    district: String,
    ward: String,
    detail: String,
    isDefault: Boolean
  },

  payment: {
    method:     { type: String, default: 'cod' },
    status:     { type: String, default: 'unpaid' }, // unpaid|paid|refunded
    capturedAt: Date,
    refundTotal:{ type: Number, default: 0 }
  },

  couponCode: { type: String, default: null },

  status: {
    type: String,
    enum: ['pending','processing','shipping','completed','cancel_requested','cancelled'],
    default: 'pending',
    index: true
  },

  placedAt:     Date,
  paidAt:       Date,
  processingAt: Date,
  shippedAt:    Date,
  deliveredAt:  Date,
  cancelledAt:  Date,

  cancelRequest: { type: CancelRequestSchema, default: () => ({ requested: false }) },
  cancellation:  { type: CancellationSchema,  default: () => ({ approved: false }) },

  history:       { type: [StatusHistorySchema], default: [] },
  statusHistory: { type: [StatusHistorySchema], default: [] },

  notes: [{
    ts:   { type: Date, default: Date.now },
    by:   { type: String, default: 'system' },
    text: { type: String, default: '' }
  }],

  attachments: [{ type: String }]
}, { timestamps: true, collection: 'orders' });

/* ===== Indexes ===== */
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ code: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });

/* ===== Helpers ===== */
OrderSchema.methods.pushStatus = function (type, by = 'system', note = '', amount) {
  this.history.unshift({ at: new Date(), by, type, note, amount });
};

/* ===== Model & exports ===== */
const Order = mongoose.model('Order', OrderSchema);
export default Order;   // default export
export { Order };       // named export (để các file import { Order } chạy bình thường)
