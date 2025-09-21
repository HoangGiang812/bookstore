import mongoose from 'mongoose';
const PageSchema = new mongoose.Schema({
  slug: { type: String, unique: true },
  title: String,
  html: String,
  published: Boolean
}, { collection: 'pages' });
export const Page = mongoose.model('Page', PageSchema);
