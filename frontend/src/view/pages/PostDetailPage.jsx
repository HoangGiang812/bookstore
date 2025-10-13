// File: src/view/pages/PostDetailPage.jsx (ĐÃ NÂNG CẤP GIAO DIỆN)

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPostBySlug, fetchRelatedPosts } from '../../services/posts';
import { ChevronLeft, Share2, Tag, Clock, Facebook, Twitter } from 'lucide-react';

// ... (Component RelatedPostCard giữ nguyên) ...
const RelatedPostCard = ({ post }) => (
    <Link to={`/articles/${post.slug}`} className="group block">
      <img src={post.featuredImage} alt={post.title} className="w-full h-40 object-cover rounded-lg mb-4 group-hover:opacity-90 transition-opacity" />
      <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">{post.title}</h3>
      <p className="text-sm text-gray-500 mt-1">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p>
    </Link>
);

const PostDetailPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ... (Phần logic useEffect giữ nguyên) ...
    const loadData = async () => {
      if (!slug) return;
      setIsLoading(true);
      try {
        const [postData, relatedData] = await Promise.all([ fetchPostBySlug(slug), fetchRelatedPosts(slug) ]);
        setPost(postData);
        setRelatedPosts(relatedData);
        document.title = postData?.title || "Bài viết - BookStore";
      } catch (error) {
        console.error(`Không thể tải dữ liệu cho bài viết: ${slug}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [slug]);


  if (isLoading) {
    return <div className="text-center py-40">Đang tải bài viết...</div>;
  }
  if (!post) {
    return <div className="text-center py-40 text-red-600">Không tìm thấy bài viết.</div>;
  }
  
  const postUrl = window.location.href;
  const shareText = encodeURIComponent(`Đọc bài viết thú vị này: ${post.title}`);

  return (
    <div className="bg-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* ... (Phần tiêu đề, tác giả, ảnh bìa giữ nguyên) ... */}
          <Link to="/articles" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8 font-semibold">
            <ChevronLeft size={20} /> Quay lại danh sách
          </Link>
          <h1 className="text-4xl lg:text-5xl font-extrabold mb-6 text-gray-900 leading-tight">{post.title}</h1>
          <div className="flex items-center flex-wrap gap-x-6 gap-y-3 text-sm text-gray-500 mb-8 border-y py-4">
            <div className="flex items-center gap-3">
              <img src={post.author?.avatar || '/avatar.png'} alt={post.author?.name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="font-semibold text-gray-700">{post.author?.name || 'Admin'}</p>
                <p>{new Date(post.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
          {post.featuredImage && (
            <img src={post.featuredImage} alt={post.title} className="w-full rounded-xl mb-8 aspect-video object-cover" />
          )}

          {/* === THAY ĐỔI DUY NHẤT VÀ QUAN TRỌNG NHẤT LÀ Ở ĐÂY === */}
          {/* Thêm class "prose lg:prose-xl" để tự động làm đẹp nội dung */}
          <article 
            className="prose lg:prose-xl max-w-none mb-12" 
            dangerouslySetInnerHTML={{ __html: post.content }} 
          />

          {/* ... (Phần tags, social share, related posts giữ nguyên) ... */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex items-center flex-wrap gap-3 mb-8">
              <Tag className="w-5 h-5 text-gray-500" />
              {post.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">{tag}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 border-t pt-6">
            <Share2 className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-700">Chia sẻ bài viết:</span>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-blue-100 text-blue-600 transition-colors"><Facebook className="w-6 h-6" /></a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${shareText}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-sky-100 text-sky-500 transition-colors"><Twitter className="w-6 h-6" /></a>
          </div>
          {relatedPosts.length > 0 && (
            <div className="mt-16 border-t pt-10">
              <h2 className="text-3xl font-bold mb-6">Bài Viết Liên Quan</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {relatedPosts.map(related => ( <RelatedPostCard key={related._id} post={related} /> ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;