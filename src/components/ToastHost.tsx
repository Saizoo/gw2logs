import { useEffect, useState } from 'react';
import { dismissToast, subscribeToasts, type ToastMessage } from '../lib/toast';

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340 }}>
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          style={{
            display: 'block',
            textAlign: 'left',
            width: '100%',
            cursor: 'pointer',
            padding: '12px 16px',
            borderRadius: 10,
            font: '600 12.5px var(--font-sans)',
            lineHeight: 1.4,
            background: t.tone === 'success' ? 'oklch(0.19 0.03 145 / 96%)' : 'oklch(0.2 0.04 25 / 96%)',
            color: t.tone === 'success' ? 'var(--good)' : 'var(--bad)',
            border: `1px solid ${t.tone === 'success' ? 'var(--good)' : 'var(--bad)'}`,
            boxShadow: '0 8px 24px rgba(0,0,0,.35)',
            animation: 'fadeIn 0.2s ease both',
          }}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
