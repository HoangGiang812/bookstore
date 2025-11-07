import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { useAuth } from '@/store/useAuth';
import { Edit2, X, KeySquare, CheckCircle } from 'lucide-react';

// Component Switch (để bật/tắt)
const ToggleSwitch = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
      checked ? 'bg-green-500' : 'bg-gray-300'
    }`}
    aria-label={checked ? "Hoạt động" : "Đã khoá"}
  >
    <span
      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const EditUserModal = ({ user, onClose, onSave }) => {
  // Đảm bảo formData.dob là một object
  const [formData, setFormData] = useState({
    ...user,
    dob: user.dob || { d: '', m: '', y: '' }, 
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Cập nhật state khi form thay đổi
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Cập nhật state cho Ngày sinh (d, m, y)
  const handleDobChange = (e) => {
    const { name, value } = e.target; // name sẽ là 'd', 'm', hoặc 'y'
    setFormData(prev => ({
      ...prev,
      dob: { ...prev.dob, [name]: value }
    }));
  };

  // Xử lý khi tick vào checkbox (roles)
  const handleRoleChange = (role) => {
    const currentRoles = formData.roles || [];
    let newRoles;
    if (currentRoles.includes(role)) {
      newRoles = currentRoles.filter(r => r !== role);
    } else {
      newRoles = [...currentRoles, role];
    }
    if (newRoles.length === 0) newRoles = ['user'];
    
    setFormData(prev => ({ ...prev, roles: newRoles }));
  };

  // Lưu thông tin
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData); // Gọi API (định nghĩa ở component cha)
    } catch (err) {
      // Lỗi đã được xử lý ở component cha
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ MỚI: Xử lý gửi email reset
  const handleTriggerReset = async () => {
    if (!window.confirm(`Gửi email đặt lại mật khẩu cho ${user.email}?`)) return;
    setIsSendingReset(true);
    setResetSuccess(false);
    try {
      // Gọi API (Bước 2)
      await api.post(`/admin/users/${user._id}/trigger-reset`);
      setResetSuccess(true); // Hiển thị thông báo thành công
    } catch (err) {
      alert("Lỗi! " + (err.response?.data?.message || err.message));
    } finally {
      setIsSendingReset(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold">Chi tiết người dùng</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Hàng 1: Email (không sửa) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            
            {/* Hàng 2: Tên và Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Tên</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Hàng 3: Giới tính và Ngày sinh */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Giới tính</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender || 'Nam'}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option>Nam</option>
                  <option>Nữ</option>
                  <option>Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ngày sinh (D / M / Y)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    name="d"
                    maxLength="2"
                    placeholder="DD"
                    value={formData.dob.d || ''}
                    onChange={handleDobChange}
                    className="w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    name="m"
                    maxLength="2"
                    placeholder="MM"
                    value={formData.dob.m || ''}
                    onChange={handleDobChange}
                    className="w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    name="y"
                    maxLength="4"
                    placeholder="YYYY"
                    value={formData.dob.y || ''}
                    onChange={handleDobChange}
                    className="w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Hàng 4: Vai trò (Roles) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Vai trò (Roles)</label>
              <div className="mt-2 flex flex-wrap gap-4">
                {['user', 'staff', 'admin'].map(role => (
                  <label key={role} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.roles.includes(role)}
                      onChange={() => handleRoleChange(role)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Hàng 5: Reset mật khẩu */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={handleTriggerReset}
                  disabled={isSendingReset || resetSuccess}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                >
                  <KeySquare size={18} className="mr-2" />
                  {isSendingReset && 'Đang gửi...'}
                  {resetSuccess && 'Đã gửi thành công!'}
                  {!isSendingReset && !resetSuccess && 'Gửi email đặt lại mật khẩu'}
                </button>
                {resetSuccess && (
                  <span className="ml-3 inline-flex items-center text-green-600">
                    <CheckCircle size={16} className="mr-1"/> Vui lòng bảo user kiểm tra email.
                  </span>
                )}
              </div>
            </div>

          </div>
          
          {/* Nút Save/Cancel ở footer */}
          <div className="flex justify-end p-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ✅ COMPONENT CHÍNH (Đã cập nhật lại)
export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles?.includes('admin');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.items || []);
      setError(null);
    } catch (err) {
      console.error("Lỗi khi tải danh sách người dùng:", err);
      setError("Không thể tải dữ liệu. " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Xử lý Khóa/Mở
  const handleToggleLock = async (user) => {
    const newIsActiveState = !user.isActive;
    if (user._id === currentUser._id) {
      alert("Bạn không thể tự khoá tài khoản của mình.");
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn ${newIsActiveState ? 'MỞ KHOÁ' : 'KHOÁ'} tài khoản ${user.email}?`)) {
      return;
    }
    try {
      await api.patch(`/admin/users/${user._id}/lock`, { isActive: newIsActiveState });
      setUsers(users.map(u => u._id === user._id ? { ...u, isActive: newIsActiveState } : u));
      alert(`Đã ${newIsActiveState ? 'mở khoá' : 'khoá'} tài khoản thành công!`);
    } catch (err) {
      console.error("Lỗi khi khoá/mở khoá:", err);
      alert("Đã xảy ra lỗi. " + (err.response?.data?.message || err.message));
    }
  };

  // Mở Modal khi bấm nút Sửa
  const handleEditClick = (user) => {
    // Đảm bảo dữ liệu truyền vào Modal là "sạch"
    const userToEdit = {
      ...user,
      roles: Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : ['user']),
      dob: user.dob || { d: '', m: '', y: '' }
    };
    setEditingUser(userToEdit);
    setIsModalOpen(true);
  };

  // Đóng Modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  // Gọi API để lưu
  const handleSaveUser = async (updatedUserData) => {
    try {
      const res = await api.patch(`/admin/users/${updatedUserData._id}`, {
        name: updatedUserData.name,
        phone: updatedUserData.phone,
        roles: updatedUserData.roles,
        gender: updatedUserData.gender,
        dob: updatedUserData.dob
      });
      
      setUsers(users.map(u => (u._id === updatedUserData._id ? res : u)));
      alert("Cập nhật thành công!");
      handleCloseModal(); 

    } catch (err) {
      console.error("Lỗi khi cập nhật user:", err);
      alert("Lỗi! " + (err.response?.data?.message || err.message));
      throw err; // Ném lỗi để Modal biết và không tự đóng
    }
  };


  if (loading) return <div className="p-4">Đang tải danh sách người dùng...</div>;
  if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-md">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Người dùng & Phân quyền</h2>
      
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email / Phone</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user._id}>
                {/* Các cột Tên, Email, Vai trò, Trạng thái (Giữ nguyên) */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name || '(Chưa có tên)'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                  <div className="text-sm text-gray-500">{user.phone || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(user.roles || []).map(role => (
                    <span key={role} className="mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                      {role}
                    </span>
                  ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.isActive ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Hoạt động
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Đã khoá
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {isAdmin ? (
                    <div className="flex justify-end items-center space-x-3">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Sửa chi tiết"
                      >
                        <Edit2 size={18} />
                      </button>
                      <ToggleSwitch
                        checked={user.isActive}
                        onChange={() => handleToggleLock(user)}
                      />
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs italic">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Render Modal */}
      {isModalOpen && editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={handleCloseModal}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
}