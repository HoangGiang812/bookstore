import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import './services/db.js';
import './utils/patchJson.js';
import { notFound, errorHandler } from './middlewares/error.js';
import { attachUserFromToken } from './middlewares/auth.js';

// Import routes
import bookRoutes from './routes/books.js';
import authorRoutes from './routes/authors.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import publicRoutes from './routes/public.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';
import wishlistRoutes from './routes/wishlist.js';
import newsletterRoutes from './routes/newsletter.js';
import contactRoutes from './routes/contact.js';
import adminRoutes from './routes/admin/index.js';
import categoriesRouter from "./routes/categories.js";
import uploadRouter from "./routes/uploads.js";
import path from 'node:path';
import users from './routes/users.js';
import postRoutes from './routes/posts.js';


const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true })); // Cho phép frontend
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (_, res) => res.json({ ok: true }));

// --- Các route CÔNG KHAI (không cần đăng nhập) ---
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/authors', authorRoutes);
app.use("/api/categories", categoriesRouter);

app.use('/api/posts', postRoutes);

app.use(attachUserFromToken);

// --- Các route CẦN BẢO VỆ (phải đăng nhập) ---
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/upload", uploadRouter);
app.use('/api', users);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));