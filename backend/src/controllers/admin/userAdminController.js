import { User } from '../../models/User.js';
import { sendMail, resetLinkTemplate } from '../../utils/email.js';
import crypto from 'crypto';

const RESET_EXPIRES_MS = Number(process.env.PASSWORD_RESET_TTL_MS || 1000 * 60 * 30);

// Hàm lấy danh sách người dùng (cho trang Admin)
export const listUsers = async (req, res) => {
  try {
    const { role } = req.query; 
    const filter = {};
    
    // Debug log: Xem backend nhận được gì
    // console.log("Listing users with filter role:", role);

    if (role) {
        // Lọc user có role nằm trong mảng roles HOẶC role đơn lẻ
        // Sử dụng $in để bắt cả trường hợp roles=['shipper', 'staff']
        filter.$or = [
            { roles: role },       // Tìm trong mảng
            { roles: { $in: [role] } }, // Tìm trong mảng (cách 2 cho chắc)
            { role: role }         // Tìm role đơn (legacy)
        ];
    }

    const users = await User.find(filter)
      .select('-passwordHash -resetOtp')
      .sort({ createdAt: -1 })
      .lean();

    // Map dữ liệu chuẩn hóa
    const cleanedUsers = users.map(u => ({
      ...u,
      roles: Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : ['user'])
    }));

    res.json({ items: cleanedUsers, total: cleanedUsers.length });
  } catch (error) {
    console.error('Lỗi listUsers:', error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// Hàm khoá/mở khoá (sửa lỗi 'active' thành 'isActive')
export const lockUnlockUser = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body; // Dùng 'isActive' như trong Model 'User.js'

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive phải là true hoặc false' });
  }

  try {
    const u = await User.findByIdAndUpdate(
      id,
      { isActive: isActive }, // Cập nhật đúng trường
      { new: true }
    ).select('-passwordHash -resetOtp').lean();

    if (!u) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    res.json(u);
  } catch (error) {
    console.error('Lỗi lockUnlockUser:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái người dùng' });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, phone, roles, dob, gender } = req.body; 

  if (!name || !Array.isArray(roles) || !roles.length) {
    return res.status(400).json({ message: 'Tên và Vai trò (roles) là bắt buộc.' });
  }

  const validRoles = roles.filter(r => ['user', 'staff', 'admin', 'shipper'].includes(r));
  
  if (validRoles.length === 0) {
    return res.status(400).json({ message: 'Phải có ít nhất một vai trò hợp lệ.' });
  }

  let mainRole = 'user';
  if (validRoles.includes('admin')) mainRole = 'admin';
  else if (validRoles.includes('staff')) mainRole = 'staff';
  else if (validRoles.includes('shipper')) mainRole = 'shipper';

  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          name: name,
          phone: phone,
          roles: validRoles,
          role: mainRole,
          gender: gender,
          dob: dob,
        }
      },
      { new: true }
    ).select('-passwordHash -resetOtp').lean();

    if (!updatedUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    updatedUser.roles = Array.isArray(updatedUser.roles) ? updatedUser.roles : [updatedUser.role];
    
    res.json(updatedUser);

  } catch (error) {
    console.error('Lỗi updateUser:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật người dùng' });
  }
};

export const adminTriggerReset = async (req, res) => {
  const { id } = req.params; // ID của user cần reset

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Lấy logic từ 'authController'
    const token = crypto.randomUUID();
    user.resetOtp = token;
    user.resetOtpExpires = new Date(Date.now() + RESET_EXPIRES_MS);
    await user.save();

    // Lấy link trang chủ của bạn (FE)
    const appOrigin = process.env.APP_ORIGIN || 'http://localhost:5173';
    const link = `${appOrigin}/reset-password?token=${token}&email=${user.email}`;

    await sendMail({
      to: user.email,
      subject: 'Yêu cầu đặt lại mật khẩu (từ Admin)',
      html: resetLinkTemplate(link),
    });

    res.json({ message: `Đã gửi email đặt lại mật khẩu tới ${user.email}` });

  } catch (error) {
    console.error('Lỗi adminTriggerReset:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi gửi email' });
  }
};