import mongoose from 'mongoose';

const AuthorSchema = new mongoose.Schema({
  name: String,
  fullName: String,
  displayName: String,
  avatar: String,
  photoUrl: String,
}, { timestamps: true });

const Author = mongoose.models.Author || mongoose.model('Author', AuthorSchema);

export { Author };        
export default Author;     
