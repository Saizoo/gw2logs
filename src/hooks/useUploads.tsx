import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { UploadStatus } from '../data/derived';

// One upload in the session-wide queue. Lives above the router so it keeps
// running (and keeps reporting progress in the nav) after the user leaves the
// Upload page — the whole point of hoisting this out of UploadPage's local
// state.
export interface UploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  status: UploadStatus;
  logId?: string;
  error?: string;
  groupName?: string;
}

interface SubmitOptions {
  groupId?: string;
  groupName?: string;
  private?: boolean;
}

interface UploadContextValue {
  items: UploadItem[];
  submitFiles: (files: FileList | File[], opts?: SubmitOptions) => void;
  clearFinished: () => void;
  activeCount: number; // queued + uploading right now
  failedCount: number;
  // Progress of the current run (resets whenever uploads start from idle) —
  // powers the nav ring's fill. runTotal is 0 when nothing is in flight.
  runDone: number;
  runTotal: number;
}

const UploadContext = createContext<UploadContextValue | null>(null);

// Each upload holds its HTTP connection open for the whole server-side parse.
// Firing every dropped file at once saturates the browser's ~6 connections-
// per-host limit and freezes the rest of the site. The server only parses two
// at a time anyway, so a pool of 2 loses no throughput while leaving
// connections free for normal browsing.
const UPLOAD_CONCURRENCY = 2;

function isFinished(s: UploadStatus): boolean {
  return s === 'success' || s === 'failed';
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const pending = useRef<{ id: string; file: File; groupId?: string; private?: boolean }[]>([]);
  const active = useRef(0);
  // Ids belonging to the current run — the ring's denominator. Reset whenever
  // a batch arrives while nothing is in flight, so the ring measures "this
  // burst", not every log uploaded all session.
  const runIds = useRef<Set<string>>(new Set());

  const pump = useCallback(() => {
    while (active.current < UPLOAD_CONCURRENCY && pending.current.length > 0) {
      const next = pending.current.shift()!;
      active.current += 1;
      setItems((q) => q.map((qi) => (qi.id === next.id ? { ...qi, status: 'uploading' } : qi)));
      api
        .upload(next.file, { groupId: next.groupId || undefined, private: next.private })
        .then((result) => {
          setItems((q) => q.map((qi) => (qi.id === next.id ? { ...qi, status: 'success', logId: result.logId } : qi)));
        })
        .catch((err: unknown) => {
          setItems((q) =>
            q.map((qi) =>
              qi.id === next.id ? { ...qi, status: 'failed', error: err instanceof Error ? err.message : 'Upload failed' } : qi,
            ),
          );
        })
        .finally(() => {
          active.current -= 1;
          pump();
        });
    }
  }, []);

  const submitFiles = useCallback(
    (files: FileList | File[], opts?: SubmitOptions) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      // Fresh burst from an idle pool → start a new run so the ring restarts
      // at 0% rather than jumping to near-full behind already-finished items.
      if (active.current === 0 && pending.current.length === 0) runIds.current = new Set();

      const newItems: UploadItem[] = arr.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        fileName: file.name,
        fileSize: file.size,
        status: 'queued',
        groupName: opts?.groupName,
      }));
      for (const it of newItems) runIds.current.add(it.id);
      setItems((q) => [...newItems, ...q]);
      pending.current.push(...newItems.map((it, i) => ({ id: it.id, file: arr[i], groupId: opts?.groupId, private: opts?.private })));
      pump();
    },
    [pump],
  );

  const clearFinished = useCallback(() => {
    setItems((q) => q.filter((i) => !isFinished(i.status)));
    for (const id of [...runIds.current]) runIds.current.delete(id);
  }, []);

  const value = useMemo<UploadContextValue>(() => {
    const activeCount = items.filter((i) => i.status === 'queued' || i.status === 'uploading').length;
    const failedCount = items.filter((i) => i.status === 'failed').length;
    const runItems = items.filter((i) => runIds.current.has(i.id));
    return {
      items,
      submitFiles,
      clearFinished,
      activeCount,
      failedCount,
      runDone: runItems.filter((i) => isFinished(i.status)).length,
      runTotal: runItems.length,
    };
  }, [items, submitFiles, clearFinished]);

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUploads(): UploadContextValue {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUploads must be used within an UploadProvider');
  return ctx;
}
