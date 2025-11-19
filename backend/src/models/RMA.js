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
  
  type: { 
    type: String, 
    enum: ['return', 'exchange'],
    default: 'return' 
  },
  status: { 
    type: String, 
    enum: ['requested', 'approved', 'rejected', 'processed', 'cancelled'],
    default: 'requested' 
  },
  
  items: [RMAItemSchema], 
  
  images: [{ type: String }],
  customerNote: { type: String },
  adminNote: { type: String }

}, { timestamps: true, collection: 'rmas' });

export const RMA = mongoose.model('RMA', RMASchema);