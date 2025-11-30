import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, requireRoles } from "../middlewares/auth.js";

const router = Router();

// Thư mục lưu ảnh tĩnh (ví dụ: backend/uploads)
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Cấu hình multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // (Giữ nguyên)
  },
  filename: function (req, file, cb) {
    // Tạo tên file duy nhất
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 2. THÊM: Lọc file (chỉ cho phép ảnh)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter, // Thêm bộ lọc
  limits: { fileSize: 1024 * 1024 * 5 } // Giới hạn 5MB
});

// 3. SỬA: Đổi route từ '/avatar' thành '/'
router.post(
  "/", 
  requireAuth,
  requireRoles('admin', 'staff', 'shipper'),
  upload.single("image"), 
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // 6. SỬA: Trả về { path: ... } để khớp với ImageUploader
    const publicUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({ path: publicUrl });
  },
  // Thêm hàm xử lý lỗi (ví dụ file quá lớn, sai định dạng)
  (error, req, res, next) => {
    res.status(400).json({ message: error.message });
  }
);

export default router;