import mongoose from 'mongoose';
const { Schema } = mongoose;

const RMAItemSchema = new Schema({
  bookId: { type: Schema.Types.ObjectId, ref: 'Book' },
  title: { type: String },
  qty: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true },
}, { _id: false });

const RMASchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  pickupAddress: Object,
  
  type: { type: String, enum: ['return', 'exchange'], default: 'return' },
  
  // Trạng thái vận hành
  status: { 
    type: String,
    enum: ['requested', 'approved','assigned', 'picking', 'picked', 'returned_to_warehouse', 'processed', 'rejected', 'cancelled', 'refunded'],
    default: 'requested' 
  },
  
  items: [RMAItemSchema], 
  images: [{ type: String }],     // Ảnh bằng chứng khách gửi (hàng lỗi)
  customerNote: { type: String },
  adminNote: { type: String },
  isUrgent: { type: Boolean, default: false },

  // --- [MỚI] THÔNG TIN HOÀN TIỀN & SHIPPER ---
  
  // 1. Thông tin ngân hàng khách cung cấp để nhận tiền
  bankInfo: {
      bankName: { type: String },   // VD: MB Bank
      accountNo: { type: String },  // VD: 0987654321
      accountName: { type: String } // VD: NGUYEN VAN A
  },

  // 2. Bằng chứng Admin đã chuyển khoản (Giải quyết tranh chấp)
  refundProof: { type: String }, // Link ảnh chụp màn hình chuyển khoản

  // 3. Shipper đi lấy hàng hoàn
  returnShipperId: { type: Schema.Types.ObjectId, ref: 'User' }, 
  pickedAt: { type: Date } // Thời điểm shipper lấy được hàng hoàn

}, { timestamps: true, collection: 'rmas' });

export const RMA = mongoose.model('RMA', RMASchema);