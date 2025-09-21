// src/view/pages/auth/ResetPassword.jsx
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      alert("Mật khẩu nhập lại không khớp");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset", { token, newPassword: password });
      alert("Đổi mật khẩu thành công, hãy đăng nhập lại");
      nav("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Đặt lại mật khẩu</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Mật khẩu mới</label>
            <input
              type="password"
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Nhập lại mật khẩu</label>
            <input
              type="password"
              className="input w-full"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}
