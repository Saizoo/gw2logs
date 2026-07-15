// Pure display helpers shared across pages (colors, zebra striping, medals).

export type UploadStatus = 'uploading' | 'success' | 'failed';

export function mechColor(n: number): string {
  return n > 0 ? '#f55d4e' : 'rgba(242,237,226,.3)';
}

const EVENT_DOT_COLOR: Record<string, string> = {
  info: 'rgba(242,237,226,.4)',
  bad: '#f55d4e',
  good: '#4caf6d',
};

export function eventDotColor(type: string): string {
  return EVENT_DOT_COLOR[type] ?? EVENT_DOT_COLOR.info;
}

/** Low uptime -> dim gold, high uptime -> bright gold fill. */
export function heat(v: number): string {
  const alpha = 0.08 + (v / 100) * 0.85;
  return `rgba(224,180,88,${alpha.toFixed(2)})`;
}

export const STATUS_META: Record<UploadStatus, { label: string; color: string }> = {
  uploading: { label: 'Uploading', color: '#e0b458' },
  success: { label: 'Parsed', color: '#4caf6d' },
  failed: { label: 'Failed', color: '#f55d4e' },
};
