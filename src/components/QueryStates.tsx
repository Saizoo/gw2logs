import type { ReactNode } from 'react';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{ padding: '60px 28px', textAlign: 'center', font: '500 13px var(--font-sans)', color: 'var(--text-40)' }}>
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ padding: '60px 28px', textAlign: 'center', font: '500 13px var(--font-sans)', color: 'var(--bad)' }}>
      {message}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '60px 28px', textAlign: 'center', font: '500 13px var(--font-sans)', color: 'var(--text-40)' }}>
      {children}
    </div>
  );
}
