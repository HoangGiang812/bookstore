import { Order } from '../../models/Order.js';
import { Book } from '../../models/Book.js';
import { Transaction } from '../../models/Transaction.js';
import { User } from '../../models/User.js';
import { RMA } from '../../models/RMA.js';

const normalize = (str) => String(str || '').toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function pushHistory(o, type, by = 'admin', note = '', extra = {}) {
  o.history = Array.isArray(o.history) ? o.history : [];
  const ts = new Date();
  o.history.unshift({ ts, at: ts, type, by, note, ...extra });
}

async function updateSoldCounts(items) {
  if (!items || !items.length) return;

  const operations = items.map((item) => ({
    updateOne: {
      filter: { _id: item.bookId || item._id }, 
      // Cộng dồn số lượng mua vào soldCount
      update: { $inc: { soldCount: Number(item.qty || item.quantity || 0) } }, 
    },
  }));

  if (operations.length > 0) {
    await Book.bulkWrite(operations);
  }
}

/** ========== Ghi chú nội bộ đơn hàng ========== */
export const addOrderNote = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body || {};
  const note = {
    ts: new Date(),
    by: req.user?.name || req.user?.email || 'admin',
    text: String(text || '').trim(),
  };

  const order = await Order.findByIdAndUpdate(
    id,
    { $push: { notes: { $each: [note], $position: 0 } } },
    { new: true }
  ).lean();

  if (!order) return res.status(404).json({ message: 'order_not_found' });
  return res.json(order);
};

/** ========== Duyệt huỷ đơn do khách yêu cầu ========== */
export const approveCancel = async (req, res) => {
  const { id } = req.params;
  const { note = '' } = req.body || {};
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  const isRequested =
    o.status === 'cancel_requested' ||
    (o.cancelRequest && o.cancelRequest.requested);

  if (!isRequested) {
    return res.status(400).json({ message: 'order_not_in_cancel_request_state' });
  }

  // Đổi trạng thái -> cancelled
  o.status = 'cancelled';
  o.cancelledAt = new Date();

  // Ghi cờ phê duyệt vào subdoc cancellation
  o.cancellation = {
    ...(o.cancellation || {}),
    approved: true,
    approvedBy: req.user?._id,
    approvedAt: new Date(),
  };

  // Clear cờ yêu cầu huỷ
  o.cancelRequest = { requested: false };

  pushHistory(
    o,
    'cancel_approved',
    req.user?.name || req.user?.email || 'admin',
    note || 'Admin approved cancel'
  );

  // Hoàn kho (đơn đã trừ kho khi tạo)
  try {
    for (const it of (o.items || [])) {
      if (it?.bookId && Number.isFinite(Number(it.qty))) {
        await Book.findByIdAndUpdate(
          it.bookId,
          { $inc: { stock: Number(it.qty) } },
          { strict: false }
        );
      }
    }
  } catch { /* ignore */ }

  await o.save();
  return res.json(o.toObject());
};

/** ========== Từ chối huỷ đơn do khách yêu cầu ========== */
export const rejectCancel = async (req, res) => {
  const { id } = req.params;
  const { reason = '' } = req.body || {};
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  const isRequested =
    o.status === 'cancel_requested' ||
    (o.cancelRequest && o.cancelRequest.requested);

  if (!isRequested) {
    return res.status(400).json({ message: 'order_not_in_cancel_request_state' });
  }

  // Trả về trạng thái trước: đã thanh toán → processing, ngược lại → pending
  const paid = String(o.payment?.status || '').toLowerCase() === 'paid' || !!o.payment?.capturedAt;
  o.status = paid ? 'processing' : 'pending';

  // Ghi dấu vào cancellation (rejected)
  o.cancellation = {
    ...(o.cancellation || {}),
    rejectedAt: new Date(),
    rejectedBy: req.user?._id,
  };

  // Clear yêu cầu huỷ
  o.cancelRequest = { requested: false, reason: '' };

  pushHistory(
    o,
    'cancel_rejected',
    req.user?.name || req.user?.email || 'admin',
    reason || 'Admin rejected cancel'
  );

  await o.save();
  return res.json(o.toObject());
};

/** ========== Hoàn tiền (refund) ghi nhận trong hệ thống ========== */
export const refundOrder = async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body || {};
  const amt = Math.round(Number(amount || 0));

  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ message: 'invalid_amount' });
  }

  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  const totalGrand =
    Number(o.total?.grand) ||
    Math.round(Number(o.subtotal || 0) + Number(o.shippingFee || 0) + Number(o.tax || 0) - Number(o.discount || 0)) ||
    0;

  const refunded = Number(o.payment?.refundTotal || 0);
  const remain = Math.max(0, totalGrand - refunded);

  if (amt > remain) {
    return res.status(400).json({ message: 'refund_exceeds_remaining', remain });
  }

  // cập nhật payment
  o.payment = {
    ...(o.payment || {}),
    refundTotal: refunded + amt,
    status:
      refunded + amt >= totalGrand
        ? 'refunded'
        : (o.payment?.status || 'paid'),
  };

  pushHistory(
    o,
    'refund',
    req.user?.name || req.user?.email || 'admin',
    reason || `Refund ${amt} VND`,
    { amount: amt }
  );

  await o.save();

  // Ghi nhận transaction
  await Transaction.create({
    orderId: o._id,
    userId: o.userId,
    type: 'refund',
    amount: amt,
    status: 'succeeded',
    reason: reason || '',
  });

  // Hoàn kho nếu đơn đã huỷ/hoàn (tuỳ chính sách)
  if (['cancelled', 'returned', 'refunded'].includes(o.status)) {
    try {
      for (const it of (o.items || [])) {
        if (it?.bookId && Number.isFinite(Number(it.qty))) {
          await Book.findByIdAndUpdate(
            it.bookId,
            { $inc: { stock: Number(it.qty) } },
            { strict: false }
          );
        }
      }
    } catch { /* ignore */ }
  }

  return res.json(o.toObject());
};

/** ========== QUY TRÌNH ADMIN: chỉ tới "ĐÃ GIAO" (delivered) ========== */

/** 1) Chuyển sang "Đang xử lý" */
export const markProcessing = async (req, res) => {
  const { id } = req.params;
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  // Cho phép từ pending hoặc cancel_requested (sau khi đã xử lý yêu cầu huỷ)
  if (!['pending', 'cancel_requested'].includes(String(o.status))) {
    return res.status(400).json({ message: 'invalid_state' });
  }

  o.status = 'processing';
  o.processingAt = new Date();
  pushHistory(o, 'process', req.user?.name || 'admin', 'Admin set processing');
  await o.save();
  return res.json(o.toObject());
};

/** 2) Chuyển sang "Đang vận chuyển" */
export const markShipping = async (req, res) => {
  const { id } = req.params;
  const { carrier = null, trackingNo = null } = req.body || {};
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  if (String(o.status) !== 'processing') {
    return res.status(400).json({ message: 'invalid_state' });
  }

  o.status = 'shipping';
  o.shippedAt = new Date();

  // Nếu có field shipping thì lưu thêm thông tin
  o.shipping = {
    ...(o.shipping || {}),
    status: 'shipping',
    carrier: carrier ?? o.shipping?.carrier ?? null,
    trackingNo: trackingNo ?? o.shipping?.trackingNo ?? null,
  };

  pushHistory(o, 'ship', req.user?.name || 'admin', 'Admin set shipping');
  await o.save();
  return res.json(o.toObject());
};

/** 3) Chuyển sang "ĐÃ GIAO" (điểm dừng của admin) */
export const markDelivered = async (req, res) => {
  const { id } = req.params;
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  if (String(o.status) !== 'shipping') {
    return res.status(400).json({ message: 'invalid_state' });
  }

  o.status = 'delivered';
  o.deliveredAt = new Date();

  if (o.shipping) {
    o.shipping = { ...(o.shipping || {}), status: 'delivered' };
  }
  await updateSoldCounts(o.items);
  pushHistory(o, 'deliver', req.user?.name || 'admin', 'Admin marked delivered');
  await o.save();
  return res.json(o.toObject());
};

/**
 * Lưu ý: Trạng thái "completed" sẽ do KH bấm nút "Đã nhận hàng"
 * ở endpoint user: POST /api/orders/mine/:id/confirm
 */

/** ========== Xoá đơn (chỉ khi đã HUỶ hoặc HOÀN THÀNH) ========== */
export const deleteOrder = async (req, res) => {
  const { id } = req.params;
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  const st = String(o.status || '').toLowerCase();
  if (!['cancelled', 'completed'].includes(st)) {
    return res.status(400).json({ message: 'cannot_delete_not_final', status: st });
  }

  await Order.deleteOne({ _id: id });
  // (tuỳ chọn) dọn transaction/ghi chú
  // await Transaction.deleteMany({ order: id });

  return res.json({ ok: 1 });
};

/** ========== CẬP NHẬT TRẠNG THÁI THANH TOÁN (paid ⇄ unpaid) ========== */
export const setPaymentStatus = async (req, res) => {
  const { id } = req.params;
  const wanted = String(req.body?.status || '').toLowerCase();

  if (!['paid', 'unpaid'].includes(wanted)) {
    return res.status(400).json({ message: 'invalid_payment_status' });
  }

  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  if (String(o.payment?.status).toLowerCase() === 'refunded') {
    return res.status(400).json({ message: 'payment_refunded_locked' });
  }

  // Lấy trạng thái cũ
  const oldStatus = String(o.payment?.status || 'unpaid').toLowerCase();

  // Cập nhật Order
  o.payment = { ...(o.payment || {}), status: wanted };
  if (wanted === 'paid') o.payment.capturedAt = new Date();
  
  // Ghi log lịch sử đơn hàng
  pushHistory(o, 'payment_status', req.user?.name || 'admin', `Admin set ${wanted}`);
  await o.save();

  // ✅ [MỚI] TỰ ĐỘNG TẠO TRANSACTION NẾU ĐÃ THANH TOÁN
  try {
      const wanted = req.body.status; // 'paid' hoặc 'unpaid'
      // Chỉ tạo transaction nếu chuyển sang 'paid' (Thu tiền)
      if (wanted === 'paid') {
          // Kiểm tra xem đã có transaction charge cho đơn này chưa để tránh trùng
          const exist = await Transaction.findOne({ orderId: o._id, type: 'charge' });
          if (!exist) {
              await Transaction.create({
                  orderId: o._id,
                  userId: o.userId,
                  type: 'charge',
                  amount: Number(o.total?.grand || o.pricing?.grandTotal || 0),
                  method: o.payment?.method || 'manual',
                  status: 'succeeded',
                  reason: 'Admin xác nhận thanh toán',
                  at: new Date()
              });
          }
      }
  } catch (err) {
      console.error("Lỗi tạo transaction:", err);
  }
  return res.json(o.toObject());
};

export const assignShipper = async (req, res) => {
  const { id } = req.params;
  const { shipperId } = req.body;

  try {
    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (o.shipping && o.shipping.shipperId && String(o.shipping.shipperId) !== shipperId) {
        // Populate tên shipper để báo lỗi rõ ràng (Optional)
        await o.populate('shipping.shipperId', 'name');
        const currentShipperName = o.shipping.shipperId?.name || 'người khác';
        
        return res.status(409).json({ 
            message: `Chậm một bước! Đơn này vừa được nhận bởi ${currentShipperName}. Vui lòng tải lại trang.` 
        });
    }
    if (!['processing', 'ready_to_pick'].includes(o.status)) {
        return res.status(400).json({ 
            message: `Không thể gán Shipper vì đơn đang ở trạng thái: ${o.status}` 
        });
    }

    // 2. Tìm Shipper (Bỏ qua check role phức tạp để tránh lỗi, chỉ cần tìm thấy user là được)
    const shipper = await User.findById(shipperId);
    if (!shipper) return res.status(404).json({ message: 'Không tìm thấy nhân viên Shipper' });

    // 3. Cập nhật thông tin (Trực tiếp, không cần check status cũ quá gắt gao)
    o.status = 'assigned';
    
    // Khởi tạo object shipping nếu chưa có
    if (!o.shipping) o.shipping = {};

    // Gán dữ liệu
    o.shipping.shipperId = shipper._id;
    o.shipping.assignedAt = new Date();
    o.shipping.status = 'pending_confirmation';
    o.shipping.method = 'INTERNAL'; 
    o.shipping.carrier = null;
    o.shipping.trackingCode = null;

    // Thêm log vào mảng logs (nếu mảng chưa có thì tạo mới)
    const newLog = { status: 'assigned', note: `Gán cho: ${shipper.name}`, at: new Date() };
    if (Array.isArray(o.shipping.logs)) {
        o.shipping.logs.push(newLog);
    } else {
        o.shipping.logs = [newLog];
    }

    // Ghi lịch sử chung của đơn hàng
    o.history.unshift({
        at: new Date(),
        type: 'assign_ship',
        by: req.user?.name || 'admin',
        note: `Đã gán cho shipper: ${shipper.name}`
    });

    // 4. Lưu
    await o.save();
    
    res.json(o.toObject());
  } catch (e) {
    console.error("Lỗi gán Shipper:", e); // Log lỗi ra console server để dễ debug
    res.status(500).json({ message: e.message || 'Lỗi server khi gán shipper' });
  }
};

export const confirmRestock = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body; // Ghi chú nhập kho

  try {
    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    // Chỉ cho phép nhập kho khi trạng thái là 'returned' (Shipper đã trả về)
    // Hoặc 'delivery_failed' (Giao thất bại)
    if (!['returned', 'delivery_failed', 'cancelled'].includes(o.status)) {
      return res.status(400).json({ message: 'Đơn hàng không ở trạng thái chờ nhập kho (returned)' });
    }

    // 1. Cộng lại tồn kho (Stock)
    const operations = o.items.map((item) => ({
      updateOne: {
        filter: { _id: item.bookId },
        update: { $inc: { stock: Number(item.qty || 1), soldCount: -Number(item.qty || 1) } }
      }
    }));

    if (operations.length > 0) {
      await Book.bulkWrite(operations);
    }

    // 2. Đổi trạng thái đơn thành 'refunded' (Đã hoàn tiền/huỷ xong)
    o.status = 'refunded'; 
    o.payment.status = 'refunded'; // Đánh dấu tiền cũng đã xử lý
    
    // 3. Ghi log lịch sử
    o.history.unshift({
      at: new Date(),
      type: 'restock',
      by: req.user?.name || 'admin',
      note: note || 'Admin xác nhận đã nhập kho hàng hoàn'
    });

    await o.save();
    return res.json(o.toObject());
  } catch (error) {
    console.error("Restock error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const list = async (req, res) => {
  try {
    const { q, status } = req.query;
    const filter = {};

    // Lọc trạng thái
    if (status && status !== 'all') {
        filter.status = status;
    }

    // Tìm kiếm (Mã đơn, Tên khách, SĐT)
    if (q) {
        const regex = new RegExp(q, 'i');
        filter.$or = [
            { code: regex },
            { 'shippingAddress.receiver': regex },
            { 'shippingAddress.phone': regex },
        ];
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email phone avatarUrl') // Lấy thông tin User
      .populate('shipping.shipperId', 'name phone avatarUrl') // ✅ QUAN TRỌNG: Lấy thông tin Shipper
      .lean();

    res.json({ items: orders, total: orders.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
};

export const getShippersWithLoad = async (req, res) => {
  try {
    const { orderId, rmaId } = req.query; // <--- Nhận thêm rmaId

    // 1. Lấy danh sách Shipper
    const shippers = await User.find({ role: 'shipper', isActive: true })
        .select('name phone avatarUrl email addresses')
        .lean();

    // 2. Xác định Địa chỉ Cần Xử Lý (Target Address)
    let targetAddr = null;

    // Trường hợp A: Gán đơn Giao hàng
    if (orderId) {
        const order = await Order.findById(orderId).select('shippingAddress');
        targetAddr = order?.shippingAddress;
    } 
    // Trường hợp B: Gán đơn Đổi trả (RMA)
    else if (rmaId) {
        const rma = await RMA.findById(rmaId).populate('orderId', 'shippingAddress');
        // Ưu tiên địa chỉ pickup riêng của RMA, nếu không có thì lấy địa chỉ giao của đơn gốc
        targetAddr = rma?.pickupAddress || rma?.orderId?.shippingAddress;
    }

    // 3. Đếm task (Code đếm số lượng đơn shipper đang giữ - Giữ nguyên)
    const activeOrderStatuses = ['assigned', 'ready_to_pick', 'picking', 'picked', 'shipping', 'delivery_failed'];
    const orderCounts = await Order.aggregate([
        { $match: { status: { $in: activeOrderStatuses }, 'shipping.shipperId': { $ne: null } } },
        { $group: { _id: '$shipping.shipperId', count: { $sum: 1 } } }
    ]);
    const activeRMAStatuses = ['assigned', 'approved', 'picking', 'picked'];
    const rmaCounts = await RMA.aggregate([
        { $match: { status: { $in: activeRMAStatuses }, returnShipperId: { $ne: null } } },
        { $group: { _id: '$returnShipperId', count: { $sum: 1 } } }
    ]);

    const taskMap = {};
    orderCounts.forEach(t => { taskMap[String(t._id)] = (taskMap[String(t._id)] || 0) + t.count; });
    rmaCounts.forEach(t => { taskMap[String(t._id)] = (taskMap[String(t._id)] || 0) + t.count; });

    // 4. CHẤM ĐIỂM (MATCHING LOGIC)
    const result = shippers.map(s => {
        const load = taskMap[String(s._id)] || 0;
        let matchScore = 0;
        let matchLabel = '';

        if (targetAddr && s.addresses && s.addresses.length > 0) {
            // Lấy địa chỉ hoạt động của Shipper
            const shipperAddr = s.addresses.find(a => a.isDefault) || s.addresses[0];
            
            const sProv = normalize(shipperAddr.province);
            const sDist = normalize(shipperAddr.district);
            const sWard = normalize(shipperAddr.ward);

            const tProv = normalize(targetAddr.province);
            const tDist = normalize(targetAddr.district);
            const tWard = normalize(targetAddr.ward);

            if (sProv === tProv) {
                matchScore = 1;
                matchLabel = 'Cùng Tỉnh/Thành';
                if (sDist === tDist) {
                    matchScore = 2;
                    matchLabel = 'Tiện đường (Cùng Quận)';
                    if (sWard === tWard) {
                        matchScore = 3;
                        matchLabel = 'Rất gần (Cùng Phường)';
                    }
                }
            }
        }

        return {
            ...s,
            taskCount: load,
            status: load > 5 ? 'busy' : 'ready',
            matchScore,
            matchLabel
        };
    });

    // 5. Sắp xếp: Điểm cao trước -> Ít việc trước
    result.sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return a.taskCount - b.taskCount;
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};