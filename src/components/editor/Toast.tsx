'use client';


import { useState, useEffect, useCallback } from 'react';

type ToastType = 'default' | 'yellow';

let _showToast: (msg: string, dur?: number, type?: ToastType) => void = () => {};

export function toast(msg: string, dur = 1800, type: ToastType = 'default') {
  _showToast(msg, dur, type);
}

export default function Toast() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<ToastType>('default');

  const show = useCallback((msg: string, dur = 1800, t: ToastType = 'default') => {
    setMessage(msg);
    setType(t);
    setVisible(true);
    setTimeout(() => setVisible(false), dur);
  }, []);

  useEffect(() => {
    _showToast = show;
  }, [show]);

  if (!visible) return null;

  if (type === 'yellow') {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-yellow-400 text-yellow-900 font-semibold text-sm px-5 py-2.5 rounded-full shadow-lg pointer-events-none select-none whitespace-pre-line text-center">
        {message}
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-gray-800 text-white text-sm rounded-lg shadow-lg transition-opacity">
      {message}
    </div>
  );
}
