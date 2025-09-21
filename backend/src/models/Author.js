import mongoose from 'mongoose';

const AuthorSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    fullName: { type: String, trim: true },
    displayName: { type: String, trim: true },
    avatar: { type: String, default: null },
    photoUrl: { type: String, default: null },
  },
  { timestamps: true }
);

const Author = mongoose.models.Author || mongoose.model('Author', AuthorSchema);

export { Author };
export default Author;
