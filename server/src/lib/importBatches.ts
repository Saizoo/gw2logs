interface ImportBatchState {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  done: boolean;
  error?: string;
}

// In-memory only — an import batch is a short-lived, best-effort progress
// indicator for a single browser session watching its own import. Losing
// this on a server restart is an acceptable simplification: the logs
// already persisted stay persisted, only the progress readout resets.
const batches = new Map<string, ImportBatchState>();

export function createBatch(id: string, total: number): void {
  batches.set(id, { total, processed: 0, succeeded: 0, failed: 0, done: false });
}

export function getBatch(id: string): ImportBatchState | undefined {
  return batches.get(id);
}

export function updateBatch(id: string, patch: Partial<ImportBatchState>): void {
  const existing = batches.get(id);
  if (!existing) return;
  Object.assign(existing, patch);
}
