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
  at:     { type: Date, default: Date.now },
  ts:     { type: Date }, // để giữ tương thích các chỗ push {ts: ...}
  by:     { type: String, default: 'system' }, // email / name / 'system'
  type:   { type: String, default: '' },       // create|paid|process|ship|deliver|cancel_requested|cancel|completed|...
  note:   { type: String, default: '' },
  amount: Number
}, { _id: false });

/* ===== Item & Address ===== */
const OrderItemSchema = new Schema({
  bookId:     { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
  title:      { type: String, default: '' },
  image:      { type: String, default: '' },
  price:      { type: Number, required: true },
  qty:        { type: Number, required: true, min: 1 },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category' }
}, { _id: false });

const AddressSchema = new Schema({
  label:    String,
  receiver: String,
  phone:    String,
  province: String,
  district: String,
  ward:     String,
  detail:   String,
  isDefault:Boolean
}, { _id: false });

/* ===== Shipping subdoc (để theo dõi vận đơn) ===== */
const ShippingSchema = new Schema({
  method:       { type: String, default: 'STANDARD' },
  carrier:      { type: String, default: null },
  trackingNo:   { type: String, default: null },
  status:       { type: String, default: 'pending' }, // mirror/trạng thái vận chuyển
  estimatedDays:{ type: Number, default: null }
}, { _id: false });

/* ===== Main schema ===== */
const OrderSchema = new Schema({
  code:  { type: String, index: true }, // mã đơn của bạn (có thể unique ở nơi khác)
  userId:{ type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },

  idempotencyKey: { type: String, index: true },

  items:         { type: [OrderItemSchema], default: [] },

  // Tổng tiền (giữ cả 2 dạng: total + pricing để tương thích)
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

  shippingAddress: { type: AddressSchema },

  // NEW: shipping info
  shipping: { type: ShippingSchema, default: () => ({}) },

  // Thanh toán
  payment: {
    method:     { type: String, default: 'cod' },      // cod|vnpay|momo|bank
    status:     { type: String, default: 'unpaid' },   // unpaid|paid|refunded
    provider:   { type: String },                      // vnpay|momo|bank
    intentId:   { type: String },                      // TxnRef/orderId của cổng
    capturedAt: { type: Date },
    refundTotal:{ type: Number, default: 0 },
    raw:        { type: Schema.Types.Mixed }           // log từ cổng (tùy chọn)
  },

  couponCode: { type: String, default: null },

  // === Trạng thái vận hành (đã thêm 'delivered')
  status: {
    type: String,
    enum: ['pending','processing','shipping','delivered','completed','cancel_requested','cancelled', 'refunded'], 
    default: 'pending',
    index: true
  },

  // Mốc thời gian
  placedAt:     Date,
  paidAt:       Date,
  processingAt: Date,
  shippedAt:    Date,
  deliveredAt:  Date,
  completedAt:  Date,
  cancelledAt:  Date,

  // Buyer protection: auto-complete sau N ngày nếu không khiếu nại
  protection: {
    windowDays: { type: Number, default: 3 },
    expiresAt:  { type: Date }
  },

  // Huỷ/hoàn
  cancelRequest: { type: CancelRequestSchema, default: () => ({ requested: false }) },
  cancellation:  { type: CancellationSchema,  default: () => ({ approved: false }) },

  // Lịch sử/audit
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
OrderSchema.index({ 'payment.intentId': 1 }, { sparse: true });

/* ===== Helpers ===== */
OrderSchema.methods.pushStatus = function (type, by = 'system', note = '', amount) {
  const ts = new Date();
  this.history = Array.isArray(this.history) ? this.history : [];
  this.history.unshift({ at: ts, ts, by, type, note, amount });
};

/* ===== Model & exports ===== */
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export default Order;   // default export
export { Order };       // named export (để các file import { Order } chạy bình thường)
