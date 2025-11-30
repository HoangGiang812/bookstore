import { Setting } from '../../models/Setting.js'; // Import đúng đường dẫn model

// --- HÀM CHO KHÁCH (PUBLIC) ---
export const getHomepageLayout = async (req, res) => {
  try {
    const layoutSetting = await Setting.findOne({ key: 'homepage_layout' }).lean();
    const defaultLayout = [
      { id: 'def-1', type: 'banner' },
      { id: 'def-2', type: 'special-list', title: 'Sách Mới Phát Hành', groupType: 'new' },
      { id: 'def-3', type: 'special-list', title: 'Sách Bán Chạy Nhất', groupType: 'bestseller' },
    ];
    res.json(layoutSetting ? layoutSetting.value : defaultLayout);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// --- HÀM CHO ADMIN (QUẢN LÝ) ---

// GET /api/admin/settings/:key
export const getSetting = async (req, res) => {
  try {
    const item = await Setting.findOne({ key: req.params.key });
    // Trả về value trực tiếp (nếu null trả về null để FE xử lý default)
    res.json(item ? item.value : null);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// POST /api/admin/settings/:key
export const updateSetting = async (req, res) => {
  try {
    const { value } = req.body; // FE gửi { value: [...] }
    const item = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { value },
      { new: true, upsert: true } // upsert: chưa có thì tạo mới
    );
    res.json(item.value);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};