import { RMA } from '../../models/RMA.js';
import { Order } from '../../models/Order.js';
import { Transaction } from '../../models/Transaction.js';
import { Book } from '../../models/Book.js';

// GET /api/admin/rma
export const listRMA = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) {
      filter.status = status;
    }
    
    const rmas = await RMA.find(filter)
      .populate({
        path: 'orderId',
        select: 'code total pricing discount items',
        populate: {
           path: 'items.bookId',
           select: 'title price'
        }
      })
      .populate('userId', 'name email phone avatarUrl avatar')
      .sort({ createdAt: -1 })
      .lean();
      
    res.json({ items: rmas });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// PATCH /api/admin/rma/:id
// ✅ HÀM QUAN TRỌNG: Cập nhật trạng thái RMA & Đồng bộ Đơn hàng
export const updateRMAStatus = async (req, res) => {
  try {
    const { status, reason, refundProof, shipperId } = req.body; // Lấy thêm các field này
    
    const rma = await RMA.findById(req.params.id);
    if (!rma) return res.status(404).json({ message: 'RMA not found' });

    // 1. Logic Gán Shipper (Khi Admin duyệt đơn -> approved)
    if (status === 'approved') {
        if (shipperId) {
            rma.returnShipperId = shipperId;
            rma.status = 'assigned';
        } else {
            rma.status = 'approved'; 
        }
    }
    
    // 2. Logic Admin Hoàn tiền (processed/refunded)
    else if (status === 'processed') {
        // Bắt buộc phải có ảnh bằng chứng chuyển khoản nếu là trả hàng
        if (rma.type === 'return' && !refundProof && !rma.refundProof) {
            return res.status(400).json({ message: 'Vui lòng upload ảnh bằng chứng chuyển khoản (UNC).' });
        }
        if (refundProof) rma.refundProof = refundProof;
        
        rma.status = 'refunded';
      // Khi Admin chọn "Đánh dấu hoàn tất" (đã nhận hàng/đã hoàn tiền)
      
      const order = await Order.findById(rma.orderId);
      if (order) {
        
        // 1. Cập nhật trạng thái Đơn hàng -> 'refunded'
        // (Sẽ thành công vì chúng ta đã sửa Model ở Bước 1)
        order.status = 'refunded'; 
        order.payment.status = 'refunded';
        
        // Tính tổng tiền hoàn (tạm tính bằng tổng đơn hàng)
        // (Sau này bạn có thể nâng cấp để hoàn 1 phần dựa trên rma.items)
        const refundAmount = Number(order.total?.grand) || 0;
        order.payment.refundTotal = (order.payment.refundTotal || 0) + refundAmount;
        
        await order.save();

        // 2. Tạo Giao dịch Hoàn tiền (cho trang "Thanh toán & Hoàn tiền")
        await Transaction.create({
          orderId: order._id,
          userId: order.userId,
          type: 'refund', // Loại giao dịch: Hoàn tiền
          amount: refundAmount,
          status: 'succeeded',
          reason: `Processed RMA for Order #${order.code || order._id}`,
        });

        // 3. Hoàn kho (Trả sách vào kho)
        if (rma.items && rma.items.length > 0) {
          for (const item of rma.items) {
             if (item.bookId && item.qty > 0) {
               await Book.findByIdAndUpdate(
                 item.bookId, 
                 { $inc: { stock: item.qty } } 
               );
             }
          }
        }
      }
    }
    
    else {
        rma.status = status;
    }

    if (reason) rma.adminNote = reason;
    await rma.save();
    
    res.json(rma);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};