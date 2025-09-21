import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import './services/db.js';
import './utils/patchJson.js'; // Date JSON
import { notFound, errorHandler } from './middlewares/error.js';
import { attachUserFromToken } from './middlewares/auth.js';
import bookRoutes from './routes/books.js';
import authorRoutes from './routes/authors.js';
// routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import publicRoutes from './routes/public.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';
import wishlistRoutes from './routes/wishlist.js';
import newsletterRoutes from './routes/newsletter.js';
import contactRoutes from './routes/contact.js';
import adminRoutes from './routes/admin/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import categoriesRouter from "./routes/categories.js";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(attachUserFromToken);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/books', bookRoutes);    
app.use('/api/authors', authorRoutes);
app.use("/api/categories", categoriesRouter);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));
