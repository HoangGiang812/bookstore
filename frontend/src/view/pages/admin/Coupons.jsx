// src/view/pages/admin/Coupons.jsx
import React, { useState, useEffect } from 'react';
import api from '@/services/api'; //
import { 
  Plus, Edit, Trash2, PauseCircle, PlayCircle, X, 
  Gift, Percent, Tag, XCircle, CheckCircle, Download, Trash
} from 'lucide-react';
import CouponForm from '../../admin/conpons/CouponForm';

// === CÁC HÀM HELPER ===

// Helper từ file gốc của bạn
const formatDate = (dateString) => {
  if (!dateString) return 'Vô thời hạn';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  } catch (e) {
    return 'Ngày không hợp lệ';
  }
};

// Helper từ file gốc của bạn
const formatValue = (coupon) => {
  if (coupon.type === 'percent') {
    return `${coupon.value}%`;
  }
  return `${Number(coupon.value || 0).toLocaleString('vi-VN')} đ`;
};

// Helper từ file CategoryPage.jsx
function flattenCategories(categories, depth = 0) {
  let result = [];
  for (const cat of categories) {
    result.push({
      _id: cat._id,
      name: cat.name,
      displayName: `${'— '.repeat(depth)}${cat.name}`,
    });
    if (cat.children && cat.children.length > 0) {
      result = result.concat(flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

function TabButton({ label, active, onClick, icon: Icon, size = 'large' }) {
  const sizeClasses = size === 'large' 
    ? 'px-6 py-4 font-medium' 
    : 'px-4 py-2 text-sm font-medium';
    
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 ${sizeClasses} transition ${
        active 
          ? 'text-blue-600 border-b-2 border-blue-600' 
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {Icon && <Icon size={18} />}
      {label}
    </button>
  );
}
// === COMPONENT CON 1: QUẢN LÝ MÃ GIẢM GIÁ ===
function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState(null);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/coupons');
      setCoupons(response.items || response || []); 
      setError(null);
    } catch (err) {
      console.error('Không thể tải danh sách coupon:', err);
      setError('Đã xảy ra lỗi khi tải dữ liệu.');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleToggleActive = async (coupon) => {
    const currentStatus = coupon.isActive === undefined ? coupon.active : coupon.isActive;
    const action = currentStatus ? 'pause' : 'resume';
    const endpoint = `/admin/coupons/${coupon._id}/${action}`;
    
    if (!window.confirm(`Bạn có chắc muốn ${action === 'pause' ? 'tạm dừng' : 'kích hoạt lại'} mã ${coupon.code}?`)) {
      return;
    }
    try {
      await api.post(endpoint); 
      fetchCoupons(); 
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Bạn có chắc muốn XÓA vĩnh viễn mã ${coupon.code}?`)) {
      return;
    }
    try {
      await api.delete(`/admin/coupons/${coupon._id}`);
      fetchCoupons();
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleOpenCreateModal = () => {
    setCouponToEdit(null); 
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon) => {
    setCouponToEdit(coupon);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCouponToEdit(null);
  };

  const handleFormSuccess = () => {
    handleCloseModal();
    fetchCoupons(); 
  };

  return (
    <div className="bg-white shadow-sm rounded-lg">
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            <CouponForm
              couponToEdit={couponToEdit}
              onSuccess={handleFormSuccess}
              onCancel={handleCloseModal}
            />
          </div>
        </div>
      )}
      
      {/* Header Bảng */}
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Danh sách Mã Giảm Giá</h2>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Tạo mã mới
        </button>
      </div>

      {/* Bảng */}
      {loading && <div className="p-4 text-center">Đang tải...</div>}
      {error && <div className="p-4 text-center text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã (Code)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sử dụng</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn tối thiểu</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày hết hạn</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    Chưa có mã giảm giá nào.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const isActive = coupon.isActive === undefined ? coupon.active : coupon.isActive;
                  return (
                    <tr key={coupon._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{coupon.code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatValue(coupon)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {coupon.usedCount || 0} / {coupon.usageLimit || '∞'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{Number(coupon.minOrder || 0).toLocaleString('vi-VN')} đ</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(coupon.endAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Đang chạy
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Tạm dừng
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button 
                          onClick={() => handleToggleActive(coupon)}
                          title={isActive ? 'Tạm dừng' : 'Kích hoạt lại'}
                          className={`p-1 rounded ${isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                          {isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(coupon)} 
                          className="p-1 text-blue-600 hover:text-blue-900"
                          title="Sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon)} 
                          className="p-1 text-red-600 hover:text-red-900"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PromotionManager() {
  const [promoTab, setPromoTab] = useState('apply'); // 'apply' hoặc 'revert'

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      {/* Tabs con: Áp dụng | Gỡ bỏ */}
      <div className="flex border-b mb-6">
        <TabButton
          label="Áp dụng Khuyến mãi"
          active={promoTab === 'apply'}
          onClick={() => setPromoTab('apply')}
          icon={Download}
          size="small"
        />
        <TabButton
          label="Gỡ bỏ Khuyến mãi"
          active={promoTab === 'revert'}
          onClick={() => setPromoTab('revert')}
          icon={Trash}
          size="small"
        />
      </div>

      {/* Nội dung tab con */}
      {promoTab === 'apply' ? <ApplyPromotionForm /> : <RevertPromotionForm />}
    </div>
  );
}

// === FORM CHO TAB "ÁP DỤNG" ===
function ApplyPromotionForm() {
  // State cho form
  const [value, setValue] = useState(10);
  const [scope, setScope] = useState('all_products');
  
  // State cho dữ liệu
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  
  // State cho giá trị được chọn
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Tải danh mục hoặc sách khi scope thay đổi
  useEffect(() => {
    if (scope === 'category' && categories.length === 0) {
      setLoading(true);
      api.get('/categories/tree').then(res => { //
        const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
        setCategories(flattenCategories(items));
      }).catch(e => setError('Không thể tải danh mục')).finally(() => setLoading(false));
    }
    else if (scope === 'specific_products' && products.length === 0) {
      setLoading(true);
      api.get('/books').then(res => { //
        setProducts(res.items || res);
      }).catch(e => setError('Không thể tải danh sách sản phẩm')).finally(() => setLoading(false));
    }
  }, [scope, categories.length, products.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    let payload = {
      type: 'percentage', // API chỉ hỗ trợ %
      value: Number(value),
      scope,
    };
    
    // Gán payload phạm vi
    if (scope === 'specific_products') {
      if (selectedProductIds.length === 0) {
        setError('Bạn phải chọn ít nhất một sản phẩm.');
        setLoading(false); return;
      }
      payload.productIds = selectedProductIds;
    } else if (scope === 'category') {
      if (!selectedCategoryId) {
        setError('Bạn phải chọn một danh mục.');
        setLoading(false); return;
      }
      payload.categoryId = selectedCategoryId;
    }

    try {
      const res = await api.post('/admin/promotions/apply', payload); //
      setResult(res.message);
    } catch (e) {
      setError(e.message || 'Thao tác thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <p className="text-sm text-gray-600">
        Chọn phạm vi sản phẩm, sau đó nhập % giảm giá. Hành động này sẽ **cập nhật % giảm giá** cho các sản phẩm được chọn.
      </p>
      
      {/* Bước 1: Chọn phạm vi (giống code cũ) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phạm vi áp dụng</label>
        <select value={scope} onChange={e => setScope(e.target.value)} className="input w-full">
          <option value="all_products">Toàn bộ cửa hàng</option>
          <option value="category">Theo Danh mục</option>
          <option value="specific_products">Theo Sản phẩm cụ thể</option>
        </select>
      </div>

      {scope === 'category' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn danh mục</label>
          <select value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)} className="input w-full" required>
            <option value="">-- Chọn danh mục --</option>
            {categories.map(cat => (<option key={cat._id} value={cat._id}>{cat.displayName}</option>))}
          </select>
        </div>
      )}
      
      {scope === 'specific_products' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn sản phẩm (Giữ Ctrl/Cmd)</label>
          <select multiple value={selectedProductIds} onChange={e => setSelectedProductIds(Array.from(e.target.selectedOptions, option => option.value))} className="input w-full h-48">
            {products.map(book => (<option key={book._id} value={book._id}>{book.title}</option>))}
          </select>
        </div>
      )}

      {/* Bước 2: Nhập % */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phần trăm giảm giá (Nhập 10 cho 10%)
        </label>
        <input type="number" value={value} onChange={e => setValue(e.target.value)} className="input w-full" required />
      </div>

      {/* Nút bấm và Kết quả */}
      <div className="pt-2">
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Đang áp dụng...' : 'Áp dụng Khuyến Mãi'}
        </button>
        {result && <div className="p-3 mt-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2"><CheckCircle size={16} /> {result}</div>}
        {error && <div className="p-3 mt-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"><XCircle size={16} /> {error}</div>}
      </div>
    </form>
  );
}

// === FORM CHO TAB "GỠ BỎ" ===
function RevertPromotionForm() {
  // State cho form
  const [scope, setScope] = useState('all_products');
  
  // State cho dữ liệu
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  
  // State cho giá trị được chọn
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Tải danh mục hoặc sách khi scope thay đổi
  useEffect(() => {
    // Logic y hệt ApplyForm
    if (scope === 'category' && categories.length === 0) {
      setLoading(true);
      api.get('/categories/tree').then(res => {
        const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
        setCategories(flattenCategories(items));
      }).catch(e => setError('Không thể tải danh mục')).finally(() => setLoading(false));
    }
    else if (scope === 'specific_products' && products.length === 0) {
      setLoading(true);
      api.get('/books').then(res => {
        setProducts(res.items || res);
      }).catch(e => setError('Không thể tải danh sách sản phẩm')).finally(() => setLoading(false));
    }
  }, [scope, categories.length, products.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    let payload = { scope };
    
    // Gán payload phạm vi
    if (scope === 'specific_products') {
      if (selectedProductIds.length === 0) {
        setError('Bạn phải chọn ít nhất một sản phẩm.');
        setLoading(false); return;
      }
      payload.productIds = selectedProductIds;
    } else if (scope === 'category') {
      if (!selectedCategoryId) {
        setError('Bạn phải chọn một danh mục.');
        setLoading(false); return;
      }
      payload.categoryId = selectedCategoryId;
    }

    try {
      const res = await api.post('/admin/promotions/revert', payload); //
      setResult(res.message);
    } catch (e) {
      setError(e.message || 'Thao tác thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <p className="text-sm text-gray-600">
        Hành động này sẽ **gỡ bỏ khuyến mãi** (đặt % giảm giá về 0) cho các sản phẩm trong phạm vi bạn chọn.
      </p>
      
      {/* Bước 1: Chọn phạm vi (giống hệt ApplyForm) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phạm vi gỡ bỏ</label>
        <select value={scope} onChange={e => setScope(e.target.value)} className="input w-full">
          <option value="all_products">Toàn bộ cửa hàng</option>
          <option value="category">Theo Danh mục</option>
          <option value="specific_products">Theo Sản phẩm cụ thể</option>
        </select>
      </div>

      {scope === 'category' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn danh mục</label>
          <select value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)} className="input w-full" required>
            <option value="">-- Chọn danh mục --</option>
            {categories.map(cat => (<option key={cat._id} value={cat._id}>{cat.displayName}</option>))}
          </select>
        </div>
      )}
      
      {scope === 'specific_products' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn sản phẩm (Giữ Ctrl/Cmd)</label>
          <select multiple value={selectedProductIds} onChange={e => setSelectedProductIds(Array.from(e.target.selectedOptions, option => option.value))} className="input w-full h-48">
            {products.map(book => (<option key={book._id} value={book._id}>{book.title}</option>))}
          </select>
        </div>
      )}

      {/* Nút bấm và Kết quả */}
      <div className="pt-2">
        <button type="submit" className="btn bg-red-100 text-red-700 hover:bg-red-200 w-full" disabled={loading}>
          {loading ? 'Đang gỡ bỏ...' : 'Gỡ bỏ Khuyến mãi (theo phạm vi)'}
        </button>
        {result && <div className="p-3 mt-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2"><CheckCircle size={16} /> {result}</div>}
        {error && <div className="p-3 mt-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"><XCircle size={16} /> {error}</div>}
      </div>
    </form>
  );
}


/**
 * COMPONENT CHA (Container)
 * Dùng Tabs để chuyển đổi
 */
export default function CouponsAndPromotionsPage() {
  const [activeTab, setActiveTab] = useState('coupons'); // Mặc định là 'coupons'

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Khuyến mãi & Mã giảm giá</h2>
      </div>

      {/* Thanh Tabs chính */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b">
          <TabButton
            label="Mã Giảm Giá (Coupons)"
            active={activeTab === 'coupons'}
            onClick={() => setActiveTab('coupons')}
            icon={Tag}
          />
          <TabButton
            label="Khuyến Mãi Hàng Loạt"
            active={activeTab === 'promotions'}
            onClick={() => setActiveTab('promotions')}
            icon={Percent}
          />
        </div>
      </div>

      {/* Nội dung Tab */}
      <div>
        {activeTab === 'coupons' && <CouponManager />}
        {activeTab === 'promotions' && <PromotionManager />}
      </div>
    </div>
  );
}