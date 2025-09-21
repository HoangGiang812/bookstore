import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // đếm ngược resend OTP 
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const strong = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;

  async function requestOtp(e) {
    e?.preventDefault();
    setErr(""); setMsg("");
    if (!email) return setErr("Vui lòng nhập email");

    setLoading(true);
    try {
      await api.post("/auth/request-reset", { email, method: "otp" });
      setSent(true);
      setStep(2);
      setMsg("Nếu email tồn tại, OTP đã được gửi. Kiểm tra hộp thư (cả spam).");
      setCooldown(60);
    } catch (e) {
      setErr(e?.response?.data?.message || "Có lỗi xảy ra khi gửi OTP");
    } finally {
      setLoading(false);
    }
  }

  async function resetByOtp(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    if (!otp || otp.length !== 6) return setErr("OTP phải gồm 6 số");
    if (!newPassword) return setErr("Vui lòng nhập mật khẩu mới");
    if (newPassword !== confirm) return setErr("Xác nhận mật khẩu chưa khớp");
    if (!strong.test(newPassword))
      return setErr("Mật khẩu cần ≥8 ký tự, có chữ hoa, thường và số");

    setLoading(true);
    try {
      await api.post("/auth/reset", { email, otp, newPassword });
      setMsg("Đổi mật khẩu thành công! Bạn có thể đăng nhập lại.");
    } catch (e) {
      setErr(e?.response?.data?.message || "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (cooldown > 0) return;
    await requestOtp(); // gửi lại y như lần đầu
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-bold mb-2">Quên mật khẩu</h2>
        <p className="text-sm text-gray-600 mb-4">
          Nhập email để nhận mã OTP 6 số, sau đó nhập OTP và mật khẩu mới.
        </p>

        {msg && <div className="mb-3 text-green-700 bg-green-50 border border-green-200 rounded p-3">{msg}</div>}
        {err && <div className="mb-3 text-red-700 bg-red-50 border border-red-200 rounded p-3">{err}</div>}

        {step === 1 && (
          <form onSubmit={requestOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-purple-500"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-60"
            >
              {loading ? "Đang gửi..." : "Gửi mã OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={resetByOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full border rounded px-3 py-2 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mã OTP (6 số)</label>
              <input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full border rounded px-3 py-2 tracking-[0.3em] font-mono text-lg"
                placeholder="______"
                required
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={loading || cooldown > 0}
                  className="text-sm text-purple-600 hover:underline disabled:text-gray-400"
                >
                  Gửi lại OTP {cooldown > 0 ? `(${cooldown}s)` : ""}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="••••••••"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                ≥8 ký tự, có chữ hoa, chữ thường và số.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Xác nhận mật khẩu</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-60"
            >
              {loading ? "Đang đổi..." : "Đổi mật khẩu"}
            </button>
          </form>
        )}

        <div className="mt-4">
          <Link to="/login" className="text-sm text-purple-600 hover:underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
