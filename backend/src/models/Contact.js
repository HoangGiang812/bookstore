import mongoose from 'mongoose';
const ContactSchema = new mongoose.Schema({
  name: String, email: String, subject: String, message: String, status: { type: String, default: 'new' }
}, { timestamps: true, collection: 'contacts' });
export const Contact = mongoose.model('Contact', ContactSchema);
