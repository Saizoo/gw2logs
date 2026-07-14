import { useState } from 'react';
import { Logo } from '../components/atoms';
import { UPLOAD_QUEUE } from '../data/gw2-data';
import { STATUS_META } from '../data/derived';

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 28px', background: 'var(--bg-header)', borderBottom: '1px solid var(--border)',
        }}
      >
        <Logo />
        <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-50)' }}>Upload logs</div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 28px 0' }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
          style={{
            border: `2px dashed ${dragOver ? 'var(--gold)' : 'rgba(224,180,88,.35)'}`,
            borderRadius: 12,
            padding: '40px 28px',
            textAlign: 'center',
            background: dragOver ? 'rgba(224,180,88,.08)' : 'rgba(224,180,88,.04)',
          }}
        >
          <div
            style={{
              width: 52, height: 52, borderRadius: 12, background: 'rgba(224,180,88,.15)',
              margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{ width: 20, height: 24, border: '2px solid var(--gold)', borderBottom: 'none', borderRadius: '3px 3px 0 0' }} />
          </div>
          <div style={{ font: '700 15px var(--font-sans)', color: 'var(--text)' }}>Drag .zevtc or .zip files here</div>
          <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-45)', marginTop: 6 }}>
            or click to browse · multiple files supported · processed automatically in the background
          </div>
          <label>
            <input type="file" multiple accept=".zevtc,.zip" style={{ display: 'none' }} />
            <div
              style={{
                display: 'inline-block', marginTop: 16, padding: '9px 20px', background: 'var(--gold)',
                color: '#14120f', borderRadius: 6, font: '700 13px var(--font-sans)', cursor: 'pointer',
              }}
            >
              Choose files
            </div>
          </label>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 28px 40px' }}>
        <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
          Processing queue
        </div>
        {UPLOAD_QUEUE.map((u) => {
          const meta = STATUS_META[u.status];
          return (
            <div key={u.file} style={{ padding: '14px 16px', background: 'var(--bg-row)', border: '1px solid var(--border-soft)', borderRadius: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{u.file}</div>
                <span style={{ font: '700 10px var(--font-sans)', padding: '2px 9px', borderRadius: 20, color: '#14120f', background: meta.color }}>
                  {meta.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-45)' }}>
                  {u.boss} · {u.size}
                </div>
                <div style={{ font: '500 11px var(--font-mono)', color: 'var(--text-40)' }}>{u.detail}</div>
              </div>
              {u.progress != null && (
                <div style={{ height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 3, marginTop: 8 }}>
                  <div style={{ height: 5, width: `${u.progress}%`, background: 'var(--gold)', borderRadius: 3 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
