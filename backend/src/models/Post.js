// File: backend/src/models/Post.js

import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      required: true,
    },
    featuredImage: {
      type: String,
      required: true,
    },
    // Tham chiếu đến người dùng đã viết bài
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['published', 'draft'],
      default: 'draft',
    },
    tags: [String],
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);

// Thêm index để tìm kiếm và sắp xếp hiệu quả hơn
postSchema.index({ slug: 1 });
postSchema.index({ status: 1, createdAt: -1 });

export const Post = mongoose.model('Post', postSchema);
