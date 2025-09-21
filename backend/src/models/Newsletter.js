import mongoose from 'mongoose';
const NewsletterSchema = new mongoose.Schema({
  email: String,
  isActive: Boolean
}, { timestamps: true, collection: 'newsletters' });
export const Newsletter = mongoose.model('Newsletter', NewsletterSchema);
