import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { STATUS_META } from '../data/derived';
import { useUploads } from '../hooks/useUploads';
import { Card, SectionLabel } from '../components/atoms';
import { Select } from '../components/Select';
import { EmptyState } from '../components/QueryStates';

export default function UploadPage() {
  const { user } = useCurrentUser();
  const { data: myGroups } = useApiQuery(() => (user ? api.myGroups() : Promise.resolve([])), [user]);
  const [groupId, setGroupId] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The upload queue + concurrency pool live in the app-wide UploadProvider so
  // parsing keeps running (and keeps reporting in the nav) after the user
  // leaves this page. This page just feeds files in and renders the shared
  // queue.
  const { items: queue, submitFiles: submit, clearFinished } = useUploads();

  const submitFiles = useCallback(
    (files: FileList | File[]) => {
      const groupName = groupId ? myGroups?.find((g) => g.id === groupId)?.name : undefined;
      submit(files, { groupId: groupId || undefined, groupName, private: isPrivate });
    },
    [submit, groupId, myGroups, isPrivate],
  );
  const hasFinished = queue.some((i) => i.status === 'success' || i.status === 'failed');

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
            <Select
              ariaLabel="Attach to group"
              value={groupId}
              onChange={setGroupId}
              options={[
                { value: '', label: "Don't attach to a group" },
                ...myGroups.map((g) => ({ value: g.id, label: g.name })),
              ]}
              style={{ width: '100%' }}
            />
          </label>
        </div>
      )}

      {user && (
        <div style={{ maxWidth: 960, marginBottom: 16 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }}
            />
            <span style={{ font: '600 13px var(--font-sans)' }}>Make these logs private</span>
          </label>
          <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-55)', marginTop: 4, maxWidth: 560, lineHeight: 1.5 }}>
            Private logs stay off the public site — only you, admins, and any group you attach them to can open them. You can flip this on the log page later, and the parses inside still count toward rankings.
          </div>
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
            borderRadius: 0,
            padding: '40px 28px',
            textAlign: 'center',
            background: dragOver ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'color-mix(in srgb, var(--color-accent) 5%, transparent)',
            cursor: 'pointer',
            transition: 'border-color .18s ease, background .18s ease, transform .18s ease',
            transform: dragOver ? 'scale(1.008)' : 'none',
          }}
        >
          <div
            style={{
              width: 52, height: 52, borderRadius: 0, background: 'var(--gold-dim)',
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
              color: 'var(--gold-fg)', borderRadius: 0, font: '700 12.5px var(--font-sans)',
            }}
          >
            Choose files
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel>Processing queue</SectionLabel>
          {hasFinished && (
            <button
              type="button"
              onClick={clearFinished}
              style={{ font: '600 11px var(--font-sans)', color: 'var(--text-55)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Clear finished
            </button>
          )}
        </div>
        {queue.length === 0 && <EmptyState>Nothing uploaded yet this session.</EmptyState>}
        {queue.length > 0 && (
          <Card style={{ overflow: 'hidden' }}>
            {queue.map((item, i) => {
              const meta = STATUS_META[item.status];
              const sizeLabel = `${(item.fileSize / 1024).toFixed(0)} KB`;
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: i === queue.length - 1 ? 'none' : '1px solid var(--border-faint)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{item.fileName}</div>
                    <span style={{ font: '700 10px var(--font-sans)', padding: '2px 9px', borderRadius: 0, color: '#14120f', background: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>{sizeLabel}</div>
                    <div style={{ font: '500 11px var(--font-mono)', color: 'var(--text-55)' }}>
                      {item.status === 'queued' && 'Waiting…'}
                      {item.status === 'uploading' && 'Uploading & parsing…'}
                      {item.status === 'failed' && item.error}
                      {item.status === 'success' && item.logId && <Link to={`/logs/${item.logId}`} style={{ color: 'var(--gold)', fontWeight: 700 }}>View log →</Link>}
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
