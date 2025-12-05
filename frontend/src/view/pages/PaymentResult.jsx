import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '@/services/api'; // Đường dẫn api của bạn
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function PaymentResult() {
    const [params] = useSearchParams();
    const nav = useNavigate();
    const [status, setStatus] = useState('checking'); // checking | success | failed

    useEffect(() => {
        const verify = async () => {
            try {
                // Lấy tất cả tham số trên URL mà Momo gửi về
                const payload = Object.fromEntries([...params]);
                
                // Gọi Backend để kiểm tra chữ ký và update đơn hàng
                const res = await api.post('/api/payments/momo/verify', payload);
                
                if (res.status === 'success') {
                    setStatus('success');
                } else {
                    setStatus('failed');
                }
            } catch (e) {
                console.error(e);
                setStatus('failed');
            }
        };

        // Chỉ gọi verify nếu có params trả về từ Momo
        if (params.get('partnerCode')) {
            verify();
        } else {
            setStatus('failed');
        }
    }, [params]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
            <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-gray-100">
                {status === 'checking' && (
                    <div className="py-10">
                        <Loader size={48} className="animate-spin text-blue-600 mx-auto mb-4"/>
                        <h2 className="text-xl font-bold text-gray-800">Đang xử lý thanh toán...</h2>
                        <p className="text-gray-500 mt-2">Vui lòng đợi trong giây lát.</p>
                    </div>
                )}
                
                {status === 'success' && (
                    <div className="py-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={40} className="text-green-600"/>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Thanh toán thành công!</h2>
                        <p className="text-gray-500 mb-8">Đơn hàng của bạn đã được xác nhận và đang chờ xử lý.</p>
                        <button onClick={() => nav('/orders')} className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200">
                            Xem đơn hàng của tôi
                        </button>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="py-6">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle size={40} className="text-red-600"/>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Thanh toán thất bại</h2>
                        <p className="text-gray-500 mb-8">Giao dịch bị hủy hoặc có lỗi xảy ra trong quá trình thanh toán.</p>
                        <div className="flex gap-3">
                            <button onClick={() => nav('/cart')} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">
                                Về giỏ hàng
                            </button>
                            <button onClick={() => nav('/')} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                                Về trang chủ
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}