import React, { useState } from 'react';

export default function AddNote({ onAdd }) {
  const [note, setNote] = useState('');
  const submit = () => {
    const v = note.trim();
    if (!v) return;
    onAdd?.(v);
    setNote('');
  };
  return (
    <div className="flex gap-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="flex-1 border rounded-lg px-3 py-2"
        placeholder="Thêm ghi chú..."
      />
      <button onClick={submit} className="px-3 py-2 bg-blue-600 text-white rounded-lg">
        Thêm
      </button>
    </div>
  );
}
