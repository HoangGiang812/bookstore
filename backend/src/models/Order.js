// src/models/Order.js
import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    title: String,
    price: { type: Number, required: true, min: 0 }, // VND
    qty: { type: Number, required: true, min: 1 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  },
  { _id: false }
);

const HistorySchema = new mongoose.Schema(
  {
    ts: { type: Date, default: Date.now },
    type: String, // create | cancel | paid | shipped | delivered | refund ...
    by: String,
    note: String,
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    code: { type: String, index: true },
    idempotencyKey: { type: String, index: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },

    status: {
      type: String,
      enum: ['pending', 'processing', 'shipping', 'completed', 'canceled', 'refunded'],
      default: 'pending',
      index: true,
    },

    items: {
      type: [OrderItemSchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },

    // Tài chính
    subtotal: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: {
      sub: { type: Number, default: 0 },
      grand: { type: Number, default: 0 },
    },

    // Địa chỉ & thanh toán
    shippingAddress: {
      type: Object, // bạn có thể chi tiết hóa schema này nếu muốn
      default: null,
    },
    payment: {
      type: Object, // { method, status, transactionId, capturedAt, ... }
      default: { method: 'cod', status: 'unpaid' },
    },

    couponCode: { type: String, default: null },

    // Ghi chú & lịch sử
    notesInternal: { type: [String], default: [] },
    history: { type: [HistorySchema], default: [] },

    // Mốc thời gian vòng đời đơn
    placedAt: Date,
    confirmedAt: Date,
    paidAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true, collection: 'orders' }
);

// Index hữu ích cho truy vấn
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ 'payment.status': 1, createdAt: -1 });

// Nếu bạn muốn thật chặt chẽ: code có thể unique – cần migration trước khi bật
// OrderSchema.index({ code: 1 }, { unique: true });

export const Order = mongoose.model('Order', OrderSchema);
