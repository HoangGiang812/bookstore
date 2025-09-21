import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,                // vd: smtp.gmail.com
  port: Number(process.env.SMTP_PORT || 587), // 587 = STARTTLS, 465 = SSL
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  // pool: true,                              // (tùy chọn) bật connection pool
});

// (tùy chọn) kiểm tra cấu hình ngay khi khởi động server
transporter.verify()
  .then(() => console.log("[mail] SMTP OK"))
  .catch(err => console.error("[mail] SMTP FAIL:", err?.message || err));

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@example.com";
  // thêm text fallback để tránh vào spam
  const plain = text || html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return transporter.sendMail({ from, to, subject, html, text: plain });
}

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

export function orderConfirmationTemplate(order) {
  return `
    <h2>Đặt hàng thành công #${order.code}</h2>
    <p>Cảm ơn bạn đã mua hàng.</p>
    <p>Tổng tiền: <b>${order.total?.grand}</b></p>
  `;
}
