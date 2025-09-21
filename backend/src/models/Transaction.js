import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type:      { type: String, enum: ['charge', 'refund', 'adjustment'], required: true }, // refund cho hoàn tiền
    amount:    { type: Number, required: true, min: 0 },
    currency:  { type: String, default: 'VND' },
    method:    { type: String, default: 'manual' },    // momo/stripe/cod/manual...
    status:    { type: String, enum: ['pending','succeeded','failed','canceled'], default: 'succeeded' },
    reason:    { type: String },
    metadata:  { type: mongoose.Schema.Types.Mixed },   // lưu raw từ cổng thanh toán nếu có
  },
  { timestamps: true }
);

export const Transaction = mongoose.model('Transaction', TransactionSchema);
