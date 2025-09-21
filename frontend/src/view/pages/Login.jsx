// src/view/pages/auth/Login.jsx
import { useState } from 'react';
import { Book, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/useAuth';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login({ email: f.email, password: f.password });
        nav('/');
      } else {
        await register({ name: f.name, email: f.email, password: f.password });
        nav('/');
      }
    } catch (err) {
      alert(err?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Book className="w-16 h-16 mx-auto text-purple-600 mb-4" />
          <h2 className="text-3xl font-bold">{isLogin ? 'Đăng nhập' : 'Đăng ký'}</h2>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Chào mừng bạn quay lại!' : 'Tạo tài khoản mới'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-2">Họ và tên *</label>
              <input
                className="input w-full border rounded-lg px-3 py-2"
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              className="input w-full border rounded-lg px-3 py-2"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mật khẩu *</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                className="input w-full border rounded-lg px-3 py-2 pr-10"
                value={f.password}
                onChange={(e) => setF({ ...f, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-2.5 text-gray-500"
                aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          {isLogin && (
            <div className="flex justify-end -mt-1 mb-2">
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
          )}

          <button
            className="btn-primary w-full bg-purple-600 text-white rounded-lg py-2.5 font-medium hover:bg-purple-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
            <button
              onClick={() => setIsLogin((v) => !v)}
              className="ml-2 text-purple-600 font-medium hover:underline"
            >
              {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>
          <div className="mt-3">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
