import { Transaction } from '../../models/Transaction.js';

// GET /api/admin/transactions
export const listTransactions = async (req, res) => { // <-- Đây là 'named export'
  try {
    const transactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .populate('userId', 'name email phone avatarUrl avatar') // Thêm avatarUrl và avatar
      .populate('orderId', 'code')
      .lean();
      
    res.json({ items: transactions });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};