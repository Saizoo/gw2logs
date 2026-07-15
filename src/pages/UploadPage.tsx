import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { STATUS_META, type UploadStatus } from '../data/derived';
import { Card, SectionLabel } from '../components/atoms';
import { EmptyState } from '../components/QueryStates';

interface QueueItem {
  id: string;
  file: File;
  status: UploadStatus;
  logId?: string;
  error?: string;
}

export default function UploadPage() {
  const { user } = useCurrentUser();
  const { data: myGroups } = useApiQuery(() => (user ? api.myGroups() : Promise.resolve([])), [user]);
  const [groupId, setGroupId] = useState('');

  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitFiles = useCallback(
    (files: FileList | File[]) => {
      const items: QueueItem[] = Array.from(files).map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        status: 'uploading',
      }));
      setQueue((q) => [...items, ...q]);

      for (const item of items) {
        api
          .upload(item.file, groupId || undefined)
          .then((result) => {
            setQueue((q) =>
              q.map((qi) => (qi.id === item.id ? { ...qi, status: 'success', logId: result.logId } : qi)),
            );
          })
          .catch((err: unknown) => {
            setQueue((q) =>
              q.map((qi) =>
                qi.id === item.id
                  ? { ...qi, status: 'failed', error: err instanceof Error ? err.message : 'Upload failed' }
                  : qi,
              ),
            );
          });
      }
    },
    [groupId],
  );

  return (
    <div>
      <div style={{ font: '800 22px var(--font-sans)', marginBottom: 4 }}>Upload logs</div>
      <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-60)', marginBottom: 20 }}>
        Drag in .zevtc, .evtc, or .zip files — parsed in the background, no need to stay on this page.
      </div>

      {user && myGroups && myGroups.length > 0 && (
        <div style={{ maxWidth: 960, marginBottom: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 320 }}>
            <span style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Attach to group (optional)
            </span>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} style={selectStyle}>
              <option value="">Don't attach to a group</option>
              {myGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div style={{ maxWidth: 960 }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) submitFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--gold)' : 'var(--gold-dim)'}`,
            borderRadius: 18,
            padding: '40px 28px',
            textAlign: 'center',
            background: dragOver ? 'oklch(0.7 0.15 85 / 8%)' : 'oklch(0.7 0.15 85 / 4%)',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 52, height: 52, borderRadius: 12, background: 'var(--gold-dim)',
              margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{ width: 20, height: 24, border: '2px solid var(--gold)', borderBottom: 'none', borderRadius: '3px 3px 0 0' }} />
          </div>
          <div style={{ font: '700 15px var(--font-sans)', color: 'var(--text)' }}>Drag .zevtc or .zip files here</div>
          <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)', marginTop: 6 }}>
            or click to browse · multiple files supported · parsed locally in the background
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".zevtc,.zip,.evtc"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.length) submitFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <div
            style={{
              display: 'inline-block', marginTop: 16, padding: '9px 20px', background: 'var(--gold-grad)',
              color: 'var(--gold-fg)', borderRadius: 10, font: '700 12.5px var(--font-sans)',
            }}
          >
            Choose files
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, marginTop: 24 }}>
        <SectionLabel>Processing queue</SectionLabel>
        {queue.length === 0 && <EmptyState>Nothing uploaded yet this session.</EmptyState>}
        {queue.length > 0 && (
          <Card style={{ overflow: 'hidden' }}>
            {queue.map((item, i) => {
              const meta = STATUS_META[item.status];
              const sizeLabel = `${(item.file.size / 1024).toFixed(0)} KB`;
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: i === queue.length - 1 ? 'none' : '1px solid var(--border-faint)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{item.file.name}</div>
                    <span style={{ font: '700 10px var(--font-sans)', padding: '2px 9px', borderRadius: 20, color: '#14120f', background: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>{sizeLabel}</div>
                    <div style={{ font: '500 11px var(--font-mono)', color: 'var(--text-55)' }}>
                      {item.status === 'uploading' && 'Uploading & parsing…'}
                      {item.status === 'failed' && item.error}
                      {item.status === 'success' && item.logId && <Link to={`/logs/${item.logId}`} style={{ color: 'var(--gold)' }}>View log →</Link>}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}

const selectStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: 12.5,
  padding: '8px 12px',
  borderRadius: 8,
  fontFamily: 'var(--font-sans)',
} as const;
