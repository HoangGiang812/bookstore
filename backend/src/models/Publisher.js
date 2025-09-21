import mongoose from 'mongoose';
const PublisherSchema = new mongoose.Schema({
  name: String, slug: String, description: String, logoUrl: String, active: Boolean
}, { timestamps: true, collection: 'publishers' });
export const Publisher = mongoose.model('Publisher', PublisherSchema);
