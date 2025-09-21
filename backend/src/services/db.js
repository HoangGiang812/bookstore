import mongoose from 'mongoose';

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('Missing MONGO_URI in .env');
  process.exit(1);
}
mongoose.set('strictQuery', false);

mongoose.connect(uri, { dbName: uri.split('/').pop() })
  .then(() => console.log('Mongo connected'))
  .catch((e) => { console.error('Mongo connect error', e); process.exit(1); });

export default mongoose;
