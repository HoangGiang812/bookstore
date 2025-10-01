// src/utils/email.js
import nodemailer from "nodemailer";

/**
 * Tạo transporter. Nếu chưa cấu hình SMTP, vẫn tạo object nhưng
 * KHÔNG gọi verify và sendMail() sẽ tự bỏ qua.
 */
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,                           // ví dụ: smtp.gmail.com
  port: Number(process.env.SMTP_PORT || 587),            // 587 = STARTTLS, 465 = SSL
  secure: Number(process.env.SMTP_PORT) === 465,         // true nếu dùng 465
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
  // pool: true,                                         // (tùy chọn) bật connection pool
});

// Chỉ verify khi có host để tránh log lỗi khi dev/chưa cấu hình
if (process.env.SMTP_HOST) {
  transporter
    .verify()
    .then(() => console.log("[mail] SMTP OK"))
    .catch((err) => console.error("[mail] SMTP FAIL:", err?.message || err));
}

/**
 * Gửi email (best-effort).
 * Nếu CHƯA cấu hình SMTP_HOST thì hàm này sẽ NO-OP (không gửi, cũng không throw).
 */
export async function sendMail({ to, subject, html, text }) {
  if (!process.env.SMTP_HOST) return; // chưa cấu hình → bỏ qua, không lỗi

  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    "no-reply@example.com";

  // Thêm plain text fallback để hạn chế vào spam
  const plain =
    text ||
    (typeof html === "string"
      ? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : undefined);

  return transporter.sendMail({ from, to, subject, html, text: plain });
}

/** ---------- Templates tiện dụng ---------- */

export function otpTemplate(otp) {
  return `
    <h2>Mã OTP khôi phục mật khẩu</h2>
    <p>Mã OTP của bạn là: <b style="font-size:22px;letter-spacing:4px">${otp}</b></p>
    <p>Có hiệu lực trong 10 phút.</p>
  `;
}

export function resetLinkTemplate(link) {
  return `
    <h2>Đặt lại mật khẩu</h2>
    <p>Nhấn vào liên kết sau để đặt lại mật khẩu:</p>
    <p><a href="${link}">${link}</a></p>
    <p>Link hết hạn sau 30 phút.</p>
  `;
}

function formatVND(n) {
  const v = Number(n || 0);
  // Dùng toLocaleString để hiển thị đẹp, fallback khi môi trường không hỗ trợ
  try {
    return v.toLocaleString("vi-VN") + "₫";
  } catch {
    return `${v}₫`;
  }
}

export function orderConfirmationTemplate(order) {
  const lines =
    Array.isArray(order?.items) && order.items.length
      ? order.items
          .map(
            (it) =>
              `<li>${it.title || "Sản phẩm"} x ${it.qty} = <b>${formatVND(
                (it.price || 0) * (it.qty || 1)
              )}</b></li>`
          )
          .join("")
      : "<li>(Không có sản phẩm)</li>";

  const grand =
    order?.total?.grand ??
    order?.pricing?.grandTotal ??
    order?.pricing?.total ??
    0;

  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#111">
      <h2 style="margin:0 0 12px">Đặt hàng thành công #${order?.code || ""}</h2>
      <p>Cảm ơn bạn đã mua hàng tại cửa hàng của chúng tôi.</p>
      <h3 style="margin:16px 0 8px">Sản phẩm</h3>
      <ul>${lines}</ul>
      <p style="margin:12px 0">Tổng tiền thanh toán: <b>${formatVND(grand)}</b></p>

      ${
        order?.shippingAddress
          ? `<h3 style="margin:16px 0 8px">Địa chỉ giao hàng</h3>
             <p style="margin:0">${order.shippingAddress?.receiver || ""}</p>
             <p style="margin:0">${order.shippingAddress?.phone || ""}</p>
             <p style="margin:0">${[
               order.shippingAddress?.detail,
               order.shippingAddress?.ward,
               order.shippingAddress?.district,
               order.shippingAddress?.province,
             ]
               .filter(Boolean)
               .join(", ")}</p>`
          : ""
      }

      <p style="margin-top:20px">Nếu bạn không thực hiện đơn hàng này, vui lòng phản hồi lại email để được hỗ trợ.</p>
      <p style="color:#666;margin-top:8px">Đây là email tự động, vui lòng không trả lời trực tiếp.</p>
    </div>
  `;
}
