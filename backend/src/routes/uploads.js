import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'; // Thư viện thao tác file có sẵn của Node.js

const router = Router();

// 1. Cấu hình Cloudinary (Dùng mã của bạn)
cloudinary.config({
  cloud_name: 'drlekdxbk',
  api_key: '321563961755697',
  api_secret: 'baJ09TGYjrJ2SpZNCtd56puFPD8'
});

// 2. Cấu hình Multer (Lưu tạm vào thư mục 'uploads/' trên server trước khi đẩy lên cloud)
// Bạn cần đảm bảo có thư mục 'uploads' ở root của backend (ngang hàng src)
const upload = multer({ dest: 'uploads/' });

// 3. API Upload Trực Tiếp
router.post("/", upload.single("image"), async (req, res) => {
  try {
    // A. Kiểm tra file
    if (!req.file) {
      return res.status(400).json({ message: "Chưa chọn file nào!" });
    }

    // B. Đẩy file lên Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'bookstore', // Thư mục trên cloud
      use_filename: true
    });

    // C. Xóa file tạm trong thư mục uploads/ để không rác máy
    fs.unlink(req.file.path, (err) => {
        if (err) console.error("Lỗi xóa file tạm:", err);
    });

    // D. Trả về link ảnh online (secure_url là link https)
    res.json({
      path: result.secure_url, 
      filename: result.public_id
    });

  } catch (error) {
    console.error("Upload Failed:", error);
    // Nếu lỗi cũng cố gắng xóa file tạm
    if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ message: "Lỗi upload lên Cloud: " + error.message });
  }
});

export default router;