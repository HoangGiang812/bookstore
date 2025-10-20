import React, { useState } from 'react';

export default function RefundBox({ onRefund }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const submit = () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    onRefund?.(amt, reason);
    setAmount('');
    setReason('');
  };

  return (
    <div className="mt-4 border-t pt-4">
      <div className="text-sm font-medium mb-2">Hoàn tiền</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          type="number"
          min={0}
          className="border rounded-lg px-3 py-2"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Số tiền"
        />
        <input
          className="border rounded-lg px-3 py-2"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do"
        />
        <button onClick={submit} className="px-3 py-2 bg-orange-600 text-white rounded-lg">
          Tạo hoàn tiền
        </button>
      </div>
    </div>
  );
}
