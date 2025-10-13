// File: src/view/pages/BlogPage.jsx (ĐÃ SỬA LỖI GIAO DIỆN LẦN CUỐI)

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { fetchPosts } from '../../services/posts';

// ===== COMPONENT POSTCARD ĐÃ ĐƯỢC SỬA LẠI =====
const PostCard = ({ post }) => {
  return (
    <Link to={`/articles/${post.slug}`} className="group flex flex-col bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="aspect-w-16 aspect-h-9">
        <img 
          src={post.featuredImage} 
          alt={post.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-6 flex flex-col flex-1">
        {/* <<< SỬA 1: Thêm chiều cao cố định (h-14) cho tiêu đề >>> */}
        {/* Chiều cao này tương đương 2 dòng text-xl, đảm bảo các tiêu đề luôn chiếm không gian như nhau */}
        <h2 className="h-14 text-xl font-bold mb-2 text-gray-800 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2">{post.title}</h2>
        
        {/* <<< SỬA 2: Thêm chiều cao cố định (h-[72px]) cho đoạn tóm tắt >>> */}
        {/* Chiều cao này tương đương 3 dòng text-base, đảm bảo các đoạn tóm tắt luôn chiếm không gian như nhau */}
        <p className="h-[72px] text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
        
        <div className="flex items-center gap-3 text-sm text-gray-500 border-t pt-4 mt-auto">
          <img src={post.author?.avatar || '/avatar.png'} alt={post.author?.name} className="w-8 h-8 rounded-full object-cover" />
          <span>{post.author?.name || 'Admin'}</span>
          <span>•</span>
          <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
        </div>
      </div>
    </Link>
  );
};

// ===== PHẦN CÒN LẠI CỦA FILE GIỮ NGUYÊN =====
const BlogPage = ({/* ...props... */}) => {
  const [allPosts, setAllPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const base_url = "/articles"; 

  const POSTS_PER_PAGE = 6; 
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    document.title = "Bài viết - BookStore";
    const loadPosts = async () => {
      try {
        const data = await fetchPosts();
        setAllPosts(data);
      } catch (error) {
        console.error("Không thể tải danh sách bài viết.");
      } finally {
        setIsLoading(false);
      }
    };
    loadPosts();
  }, []);

  const currentPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return allPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [allPosts, currentPage]);

  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);

  const handlePageChange = (page) => {
    navigate(`${base_url}?page=${page}`);
  };

  if (isLoading) {
    return <div className="text-center py-24">Đang tải danh sách bài viết...</div>;
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold mb-2">Góc Tri Thức</h1>
          <p className="text-lg text-gray-600">Khám phá những câu chuyện, kiến thức và chia sẻ từ BookStore.</p>
        </div>

        {currentPosts.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {currentPosts.map(post => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`h-10 w-10 rounded-lg border font-semibold transition-colors ${
                      currentPage === pageNumber
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-500">Chưa có bài viết nào.</p>
        )}
      </div>
    </div>
  );
};

export default BlogPage;