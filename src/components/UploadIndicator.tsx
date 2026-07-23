import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUploads } from '../hooks/useUploads';
import { STATUS_META } from '../data/derived';

// The nav's Upload control. Idle, it's the familiar gold "+ Upload" button.
// While logs are parsing in the background it swaps the "+" for a live
// progress ring (and a count badge), and hovering — or focusing — reveals a
// popover with every file's status, so the uploader can wander the site and
// still see their queue drain.
export function UploadIndicator() {
  const { items, activeCount, failedCount, runDone, runTotal, clearFinished } = useUploads();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover with a small close delay so moving the pointer from the button down
  // into the popover doesn't dismiss it. Focus-within keeps it keyboard- and
  // touch-reachable.
  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const busy = activeCount > 0;
  const finishedCount = items.filter((i) => i.status === 'success' || i.status === 'failed').length;
  const progress = runTotal > 0 ? runDone / runTotal : 0;
  const hasPopover = items.length > 0;

  return (
    <div
      ref={boxRef}
      style={{ position: 'relative', flex: 'none' }}
      onMouseEnter={hasPopover ? show : undefined}
      onMouseLeave={hasPopover ? hideSoon : undefined}
      onFocus={hasPopover ? show : undefined}
      onBlur={(e) => { if (!boxRef.current?.contains(e.relatedTarget as Node)) hideSoon(); }}
    >
      <Link
        to="/upload"
        data-tour="upload"
        className="u-btn-gold"
        aria-label={busy ? `Uploads in progress: ${runDone} of ${runTotal} done` : 'Upload logs'}
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '9px 16px 9px 11px',
          borderRadius: 0,
          font: '700 12.5px var(--font-sans)',
          whiteSpace: 'nowrap',
          background: 'var(--gold-grad)',
          color: 'var(--gold-fg)',
          boxShadow: '0 4px 16px color-mix(in srgb, var(--color-accent) 32%, transparent)',
        }}
      >
        {busy ? <ProgressRing progress={progress} count={activeCount} /> : <PlusIcon />}
        {busy ? `${activeCount} uploading` : 'Upload'}
      </Link>

      {open && hasPopover && (
        <div
          onMouseEnter={show}
          onMouseLeave={hideSoon}
          style={{
            position: 'absolute',
            top: 48,
            right: 0,
            width: 320,
            maxWidth: '90vw',
            zIndex: 80,
            background: 'var(--color-surface)',
            border: '1px solid color-mix(in srgb, var(--color-text) 16%, transparent)',
            borderRadius: 0,
            boxShadow: '0 22px 50px -16px rgba(0,0,0,.7)',
            overflow: 'hidden',
            animation: 'fadeIn .16s ease both',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ font: '800 13px var(--font-sans)' }}>
              {busy ? 'Uploading logs' : 'Uploads'}
            </div>
            <div style={{ font: '600 11px var(--font-sans)', color: 'var(--text-55)' }}>
              {busy ? `${runDone}/${runTotal} done` : `${finishedCount} done${failedCount ? ` · ${failedCount} failed` : ''}`}
            </div>
          </div>

          {busy && runTotal > 0 && (
            <div style={{ height: 3, background: 'var(--border-faint)' }}>
              <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: 'var(--gold-grad)', transition: 'width .3s ease' }} />
            </div>
          )}

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {items.map((it) => {
              const meta = STATUS_META[it.status];
              const spinning = it.status === 'uploading';
              return (
                <div
                  key={it.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border-faint)',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8, height: 8, borderRadius: '50%', flex: 'none',
                      background: meta.color,
                      boxShadow: spinning ? `0 0 0 3px ${meta.color}33` : undefined,
                      animation: spinning ? 'pulseDot 1s ease-in-out infinite' : undefined,
                    }}
                  />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', font: '600 12px var(--font-sans)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.fileName}
                    </span>
                    <span style={{ display: 'block', font: '500 10.5px var(--font-mono)', color: 'var(--text-50)', marginTop: 1 }}>
                      {it.status === 'success' && it.logId ? (
                        <Link to={`/logs/${it.logId}`} style={{ color: 'var(--gold)', fontWeight: 700 }}>View log →</Link>
                      ) : it.status === 'failed' ? (
                        <span style={{ color: 'var(--bad)' }}>{it.error ?? 'Failed'}</span>
                      ) : it.status === 'uploading' ? (
                        'Uploading & parsing…'
                      ) : (
                        'Waiting…'
                      )}
                      {it.groupName && it.status !== 'failed' ? ` · ${it.groupName}` : ''}
                    </span>
                  </span>
                  <span style={{ font: '700 9.5px var(--font-sans)', padding: '2px 8px', borderRadius: 0, color: '#14120f', background: meta.color, flex: 'none' }}>
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border-soft)' }}>
            <Link to="/upload" style={{ font: '700 11px var(--font-sans)', color: 'var(--gold)' }}>Open upload page →</Link>
            {finishedCount > 0 && (
              <button
                type="button"
                onClick={clearFinished}
                style={{ marginLeft: 'auto', font: '600 11px var(--font-sans)', color: 'var(--text-55)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Clear finished
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4v16M4 12h16" stroke="var(--gold-fg)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

// Determinate ring: a faint full track with a gold arc sweeping to `progress`.
// The whole ring rotates slowly so it reads as "working" even while a single
// large file sits at the same percentage for a while.
function ProgressRing({ progress, count }: { progress: number; count: number }) {
  const R = 8;
  const C = 2 * Math.PI * R;
  const dash = Math.max(0.04, progress) * C; // never fully empty, so the arc is always visible
  return (
    <span style={{ position: 'relative', width: 16, height: 16, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="16" height="16" viewBox="0 0 20 20" style={{ transform: 'rotate(-90deg)', animation: 'spin 2.4s linear infinite' }} aria-hidden>
        <circle cx="10" cy="10" r={R} fill="none" stroke="color-mix(in srgb, var(--color-text) 15%, transparent)" strokeWidth="2.4" />
        <circle
          cx="10" cy="10" r={R} fill="none" stroke="var(--gold-fg)" strokeWidth="2.4" strokeLinecap="round"
          strokeDasharray={`${dash} ${C - dash}`}
        />
      </svg>
      {count > 0 && (
        <span style={{ position: 'absolute', font: '800 8px var(--font-sans)', color: 'var(--gold-fg)' }}>{count}</span>
      )}
    </span>
  );
}
