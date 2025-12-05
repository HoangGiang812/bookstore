import crypto from 'crypto';
import axios from 'axios';
import { Order } from '../../models/Order.js';

// Lấy config từ .env
const config = {
    partnerCode: process.env.MOMO_PARTNER_CODE,
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    endpoint: process.env.MOMO_ENDPOINT,
    redirectUrl: process.env.MOMO_REDIRECT_URL,
    ipnUrl: process.env.MOMO_IPN_URL
};

// 1. TẠO LINK THANH TOÁN (Gửi request sang Momo)
export const createMomoPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

        // Momo yêu cầu số tiền là String (VND không có thập phân)
        const amount = String(Math.round(order.total?.grand || 0)); 
        
        // Tạo mã giao dịch duy nhất (Momo không cho trùng requestId)
        const requestId = `${orderId}_${new Date().getTime()}`;
        const orderInfo = `Thanh toan don hang ${order.code}`;
        const requestType = "captureWallet";
        const extraData = ""; 

        // --- TẠO CHỮ KÝ (SIGNATURE) ---
        // Quan trọng: Phải đúng thứ tự Alphabe các tham số
        const rawSignature = `accessKey=${config.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${config.ipnUrl}&orderId=${requestId}&orderInfo=${orderInfo}&partnerCode=${config.partnerCode}&redirectUrl=${config.redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

        // Mã hóa HMAC SHA256
        const signature = crypto.createHmac('sha256', config.secretKey)
            .update(rawSignature)
            .digest('hex');

        // Body gửi sang Momo
        const requestBody = {
            partnerCode: config.partnerCode,
            accessKey: config.accessKey,
            requestId: requestId,
            amount: amount,
            orderId: requestId,
            orderInfo: orderInfo,
            redirectUrl: config.redirectUrl,
            ipnUrl: config.ipnUrl,
            extraData: extraData,
            requestType: requestType,
            signature: signature,
            lang: 'vi'
        };

        // Gọi API Momo
        const response = await axios.post(config.endpoint, requestBody);
        
        // Trả về link thanh toán (payUrl) cho Frontend
        return res.json({ payUrl: response.data.payUrl });

    } catch (error) {
        console.error('Momo Create Error:', error?.response?.data || error.message);
        return res.status(500).json({ message: 'Lỗi tạo thanh toán Momo' });
    }
};

// 2. XÁC THỰC KẾT QUẢ (Khi User quay lại Web)
export const verifyMomoPayment = async (req, res) => {
    try {
        const { orderId, resultCode, signature, ...others } = req.body;

        // Nếu resultCode = 0 nghĩa là Thành công
        if (String(resultCode) === '0') {
            // Tách lấy ID gốc từ chuỗi "ID_Timestamp"
            const realOrderId = orderId.split('_')[0]; 
            
            const order = await Order.findById(realOrderId);
            
            // Cập nhật trạng thái đơn hàng thành ĐÃ THANH TOÁN
            if (order && order.payment.status !== 'paid') {
                order.payment.status = 'paid';
                order.payment.method = 'momo';
                order.payment.capturedAt = new Date();
                
                // Nếu đơn đang pending -> chuyển sang processing luôn
                if (order.status === 'pending') {
                    order.status = 'processing';
                }
                
                await order.save();
            }
            return res.json({ status: 'success', orderId: realOrderId });
        } else {
            return res.json({ status: 'failed', message: 'Thanh toán thất bại hoặc bị hủy' });
        }

    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Lỗi xác thực thanh toán' });
    }
}