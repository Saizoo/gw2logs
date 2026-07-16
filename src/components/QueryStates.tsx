import type { ReactNode } from 'react';

// Shimmer placeholder standing in for a list/table while it loads. Reads
// as "content is coming" instead of a bare text label, and keeps the page
// from visibly jumping when short content pops in. The label is kept for
// screen readers (and shown quietly below the bars).
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const widths = ['62%', '84%', '73%', '90%', '55%'];
  return (
    <div role="status" aria-label={label} style={{ padding: '28px 4px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {widths.map((w, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="u-skeleton" style={{ width: 36, height: 36, borderRadius: 10, flex: 'none' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div className="u-skeleton" style={{ height: 11, width: w }} />
              <div className="u-skeleton" style={{ height: 8, width: '38%', opacity: 0.7 }} />
            </div>
            <div className="u-skeleton" style={{ width: 52, height: 14, flex: 'none' }} />
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 22, font: '500 11.5px var(--font-sans)', color: 'var(--text-45)' }}>{label}</div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        margin: '32px auto',
        maxWidth: 480,
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        background: 'oklch(0.2 0.04 25 / 45%)',
        border: '1px solid var(--bad-dim)',
        borderRadius: 14,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bad-dim)',
          color: 'var(--bad)',
          font: '800 14px var(--font-sans)',
        }}
      >
        !
      </div>
      <div>
        <div style={{ font: '700 13px var(--font-sans)', color: 'var(--bad)' }}>Something went wrong</div>
        <div style={{ font: '400 12.5px var(--font-sans)', color: 'var(--text-70)', marginTop: 3, lineHeight: 1.5 }}>{message}</div>
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '56px 28px', textAlign: 'center' }}>
      <div
        aria-hidden
        style={{
          width: 44,
          height: 44,
          margin: '0 auto 14px',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-chip)',
          border: '1px solid var(--border)',
          color: 'var(--text-50)',
          font: '400 20px var(--font-sans)',
        }}
      >
        ◇
      </div>
      <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-55)', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}
