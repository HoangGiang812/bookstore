// backend/src/controllers/shipperController.js
import { Order } from '../models/Order.js';
import { Book } from '../models/Book.js';
import { User } from '../models/User.js';
import { RMA } from '../models/RMA.js';

// Helper ghi log
const logShip = (o, status, note) => {
    o.shipping = o.shipping || {};
    o.shipping.logs = o.shipping.logs || [];
    o.shipping.logs.push({ status, note, at: new Date() });
    o.shipping.status = status; 
};

const pushHistory = (o, type, by, note) => {
    o.history = o.history || [];
    o.history.unshift({ at: new Date(), type, by, note });
};

// 1. Lấy task (Bao gồm cả đơn đang giao lại)
export const getMyTasks = async (req, res) => {
    try {
        const tasks = await Order.find({ 
            'shipping.shipperId': req.user._id,
        })
        .populate('userId', 'name email phone')
        .sort({ updatedAt: -1 })
        .lean();
        res.json(tasks);
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// 2. Lấy hàng
export const pickupOrder = async (req, res) => {
    try {
        const o = await Order.findOne({ _id: req.params.id, 'shipping.shipperId': req.user._id });
        if (!o) return res.status(404).json({ message: 'Not found' });

        o.status = 'shipping';
        o.shippedAt = new Date();
        
        // Init object nếu chưa có
        o.shipping = o.shipping || {};
        o.shipping.pickedAt = new Date();
        o.shipping.attempts = 0; 

        logShip(o, 'picked', 'Shipper đã lấy hàng');
        pushHistory(o, 'shipping', 'shipper', 'Đang đi giao');
        await o.save();
        res.json({ ok: 1 });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// 3. Giao thành công
export const completeDelivery = async (req, res) => {
    try {
        const { proofImage } = req.body;
        const o = await Order.findOne({ _id: req.params.id, 'shipping.shipperId': req.user._id });
        if (!o) return res.status(404).json({ message: 'Not found' });

        o.status = 'delivered';
        o.deliveredAt = new Date();
        
        // Lưu ảnh bằng chứng
        o.shipping = o.shipping || {};
        if (proofImage) o.shipping.proofImage = proofImage;

        if (o.payment.method === 'cod' && o.payment.status === 'unpaid') {
            o.payment.status = 'paid';
            o.payment.capturedAt = new Date();
            pushHistory(o, 'paid', 'shipper', 'Shipper thu tiền COD');
        }

        logShip(o, 'delivered', 'Giao thành công');
        pushHistory(o, 'delivered', 'shipper', 'Giao hàng thành công');
        await o.save();
        res.json({ ok: 1 });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// 4. Báo cáo Giao Thất Bại
export const reportFailed = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, stopDelivery } = req.body; 
        
        const o = await Order.findOne({ _id: id, 'shipping.shipperId': req.user._id });
        if (!o) return res.status(404).json({ message: 'Not found' });

        o.shipping = o.shipping || {};
        o.shipping.attempts = (o.shipping.attempts || 0) + 1;
        o.shipping.lastAttempt = new Date();
        
        const currentTry = o.shipping.attempts;
        const maxTry = 3; 

        let newStatus = 'delivery_failed';
        let logNote = `Giao thất bại lần ${currentTry}: ${reason}`;

        // Nếu khách từ chối hoặc quá 3 lần -> Hoàn kho
        if (stopDelivery || currentTry >= maxTry) {
            newStatus = 'returned';
            logNote = stopDelivery 
                ? `Khách từ chối nhận: ${reason} -> Hoàn kho`
                : `Giao thất bại quá ${maxTry} lần -> Hoàn kho`;
        }

        o.status = newStatus;
        logShip(o, newStatus, logNote);
        pushHistory(o, newStatus, 'shipper', logNote);

        await o.save();
        res.json({ ok: 1, status: newStatus });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// 5. Giao lại
export const retryDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const o = await Order.findOne({ _id: id, 'shipping.shipperId': req.user._id });
        
        if (!o) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        
        if (o.status !== 'delivery_failed') {
            return res.status(400).json({ message: 'Đơn hàng không ở trạng thái thất bại' });
        }

        o.status = 'shipping';
        o.updatedAt = new Date(); 
        
        const tryCount = (o.shipping?.attempts || 0) + 1;
        const note = `Shipper thực hiện giao lại lần ${tryCount}`;
        
        o.shipping = o.shipping || {};
        o.shipping.logs = o.shipping.logs || [];
        o.shipping.logs.push({ status: 'retry', note, at: new Date() });
        
        pushHistory(o, 'shipping', 'shipper', note);

        await o.save();
        res.json({ ok: 1, status: 'shipping' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// 6. ✅ XÁC NHẬN TRẢ KHO (Code đã sửa lỗi import)
export const confirmReturn = async (req, res) => {
    try {
        const { id } = req.params;
        // Chỉ tìm đơn returned của shipper đó
        const o = await Order.findOne({ 
            _id: id, 
            'shipping.shipperId': req.user._id, 
            status: 'returned' 
        });
        
        if (!o) return res.status(404).json({ message: 'Không tìm thấy đơn cần trả kho hoặc trạng thái sai' });

        // Cộng tồn kho
        if (o.items && o.items.length > 0) {
            const operations = o.items.map((item) => ({
                updateOne: {
                    filter: { _id: item.bookId },
                    update: { $inc: { stock: Number(item.qty || 1), soldCount: -Number(item.qty || 1) } }
                }
            }));
            // Kiểm tra an toàn trước khi chạy
            if (operations.length > 0) {
                await Book.bulkWrite(operations);
            }
        }

        // Đổi trạng thái -> cancelled
        o.status = 'cancelled';
        
        // Log
        const note = 'Shipper đã trả hàng về kho -> Đơn hủy';
        
        o.shipping = o.shipping || {};
        o.shipping.logs = o.shipping.logs || [];
        o.shipping.logs.push({ status: 'returned_to_warehouse', note, at: new Date() });
        
        pushHistory(o, 'cancelled', 'shipper', note);

        await o.save();
        res.json({ ok: 1, status: 'cancelled' });
    } catch (e) {
        console.error("Lỗi trả kho:", e); // Log lỗi ra terminal server để dễ debug
        res.status(500).json({ message: e.message || 'Lỗi server khi trả kho' });
    }
};

export const getMyRMATasks = async (req, res) => {
    try {
        const rmas = await RMA.find({ 
            returnShipperId: req.user._id,
            status: { $in: ['picking', 'picked'] }
        })
        .populate('userId', 'name phone addresses') // Lấy thông tin khách
        .populate({
            path: 'orderId',
            select: 'code items shippingAddress', // Lấy items để Shipper biết lấy sách gì
            populate: { path: 'items.bookId', select: 'title image' } // Populate sâu vào sách
        })
        .sort({ updatedAt: -1 })
        .lean();
        res.json(rmas);
    } catch (e) { res.status(500).json({ message: e.message }); }
};

export const pickupRMA = async (req, res) => {
    try {
        const rma = await RMA.findOne({ _id: req.params.id, returnShipperId: req.user._id });
        if (!rma) return res.status(404).json({ message: 'RMA not found' });

        rma.status = 'picked';
        rma.pickedAt = new Date();
        await rma.save();
        
        // Đồng bộ trạng thái sang Order để khách thấy
        await Order.findByIdAndUpdate(rma.orderId, { rmaStatus: 'picked' });

        res.json({ ok: 1, status: 'picked' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

export const dropoffRMA = async (req, res) => {
    try {
        const rma = await RMA.findOne({ _id: req.params.id, returnShipperId: req.user._id });
        if (!rma) return res.status(404).json({ message: 'RMA not found' });

        rma.status = 'returned_to_warehouse';
        await rma.save();

        // Đồng bộ trạng thái sang Order
        await Order.findByIdAndUpdate(rma.orderId, { rmaStatus: 'returned_to_warehouse' });

        res.json({ ok: 1, status: 'returned_to_warehouse' });
    } catch (e) { 
        console.error("Dropoff Error:", e); // Log lỗi ra console server
        res.status(500).json({ message: e.message }); 
    }
};