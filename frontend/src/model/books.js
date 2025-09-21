export const CATEGORIES = ['Khoa học','Phát triển bản thân','Văn học','Kỹ năng sống'];
export const FORMATS = ['Bìa mềm','Bìa cứng','Ebook'];
export const PUBLISHERS = ['NXB Trẻ','NXB Thế Giới','NXB Văn Học','NXB Tổng Hợp TP.HCM'];
export const AUTHORS = ['Yuval Noah Harari','James Clear','Paulo Coelho','Dale Carnegie'];
export const COLLECTIONS = [
  {id:'best-2024', name:'Best 2024', description:'Những tựa sách nổi bật năm 2024', bookIds:[1,4]},
  {id:'habit-mastery', name:'Thói quen đột phá', description:'Sách về thói quen & năng suất', bookIds:[2]}
];

export const BOOKS = [
  {id:1,title:'Sapiens: Lược Sử Loài Người',author:'Yuval Noah Harari',price:299000,originalPrice:399000,discount:25,rating:4.5,reviewCount:256,image:'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',category:'Khoa học',publisher:'NXB Trẻ',publishYear:2024,isbn:'978-604-2-15847-3',pages:512,format:'Bìa mềm',language:'Tiếng Việt',description:'Một cuốn sách đột phá về lịch sử loài người',inStock:true,stockQuantity:15,soldCount:2341},
  {id:2,title:'Atomic Habits',author:'James Clear',price:189000,originalPrice:250000,discount:24,rating:4.8,reviewCount:523,image:'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',category:'Phát triển bản thân',publisher:'NXB Thế Giới',publishYear:2023,isbn:'978-604-2-25847-4',pages:320,format:'Bìa cứng',language:'Tiếng Việt',description:'Hướng dẫn xây dựng thói quen tích cực',inStock:true,stockQuantity:23,soldCount:1876},
  {id:3,title:'Nhà Giả Kim',author:'Paulo Coelho',price:145000,originalPrice:200000,discount:27,rating:4.2,reviewCount:187,image:'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop',category:'Văn học',publisher:'NXB Văn Học',publishYear:2023,isbn:'978-604-2-35847-5',pages:280,format:'Bìa mềm',language:'Tiếng Việt',description:'Hành trình của Santiago',inStock:true,stockQuantity:8,soldCount:1234},
  {id:4,title:'Đắc Nhân Tâm',author:'Dale Carnegie',price:120000,originalPrice:160000,discount:25,rating:4.6,reviewCount:342,image:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',category:'Kỹ năng sống',publisher:'NXB Tổng Hợp TP.HCM',publishYear:2024,isbn:'978-604-2-45847-6',pages:368,format:'Bìa mềm',language:'Tiếng Việt',description:'Nghệ thuật giao tiếp và ứng xử',inStock:true,stockQuantity:32,soldCount:3456}
];

export const SAMPLE_REVIEWS = [
  {id:'r1',bookId:1,userId:'seed_u1',userName:'Nguyễn Văn A',userAvatar:'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',rating:5,title:'Cuốn sách tuyệt vời',content:'Rất hay và bổ ích',images:[],date:'2024-01-15',helpful:12,verified:true},
  {id:'r2',bookId:1,userId:'seed_u2',userName:'Trần Thị B',userAvatar:'https://images.unsplash.com/photo-1494790108755-2616b332c133?w=150&h=150&fit=crop&crop=face',rating:4,title:'Khá hay',content:'Nội dung tốt',images:[],date:'2024-01-10',helpful:8,verified:true}
];
