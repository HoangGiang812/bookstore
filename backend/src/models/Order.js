import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  title: String,
  price: Number,
  qty: Number,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  code: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'processing', 'shipping', 'completed', 'canceled', 'refunded'], default: 'pending' },
  items: [OrderItemSchema],
  subtotal: Number,
  shippingFee: Number,
  tax: Number,
  discount: Number,
  total: {
    sub: Number,
    grand: Number
  },
  shippingAddress: Object,
  payment: Object,
  couponCode: String,
  notesInternal: [String]
}, { timestamps: true, collection: 'orders' });

export const Order = mongoose.model('Order', OrderSchema);
