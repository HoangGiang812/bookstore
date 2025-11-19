import React, { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const fmtMoney = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
};

export default function PaymentsTab({ searchTerm }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        // Gọi API chúng ta đã tạo ở Bước 1
        const res = await api.get('/admin/transactions');
        setTransactions(res.items || []);
        setError(null);
      } catch (err) {
        setError('Không thể tải lịch sử giao dịch: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  // Lọc danh sách dựa trên thanh tìm kiếm
  const filteredTransactions = useMemo(() => {
    if (!searchTerm) {
      return transactions;
    }
    const lowerSearch = searchTerm.toLowerCase();
    return transactions.filter(t => {
      const orderCode = t.orderId?.code || '';
      const userName = t.userId?.name || '';
      const userEmail = t.userId?.email || '';
      return (
        orderCode.includes(lowerSearch) ||
        userName.toLowerCase().includes(lowerSearch) ||
        userEmail.toLowerCase().includes(lowerSearch)
      );
    });
  }, [transactions, searchTerm]);

  if (loading) return <div className="p-4">Đang tải lịch sử giao dịch...</div>;
  if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-md">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Thanh toán & Hoàn tiền</h2>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số tiền</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn hàng</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lý do</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransactions.map((t) => (
              <tr key={t._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{fmtDate(t.createdAt)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {t.type === 'charge' ? (
                    <span className="inline-flex items-center gap-1.5 text-green-700">
                      <ArrowUpRight size={16} /> Thanh toán
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-red-700">
                      <ArrowDownLeft size={16} /> Hoàn tiền
                    </span>
                  )}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${t.type === 'charge' ? 'text-green-700' : 'text-red-700'}`}>
                  {t.type === 'refund' ? '-' : ''}{fmtMoney(t.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  #{t.orderId?.code || String(t.orderId).slice(-6)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {t.userId?.name || t.userId?.email || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.reason || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'Không tìm thấy giao dịch nào.' : 'Chưa có giao dịch nào.'}
          </div>
        )}
      </div>
    </div>
  );
}