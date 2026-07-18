// Pure display helpers shared across pages (colors, zebra striping, medals).

export type UploadStatus = 'queued' | 'uploading' | 'success' | 'failed';

const EVENT_DOT_COLOR: Record<string, string> = {
  info: 'rgba(242,237,226,.4)',
  bad: '#f55d4e',
  good: '#4caf6d',
};

export function eventDotColor(type: string): string {
  return EVENT_DOT_COLOR[type] ?? EVENT_DOT_COLOR.info;
}

// "Sev0".."Sev4" is Elite Insights' own mechanic-severity classification
// (Mechanics[].Severity in its JSON output) — not something invented here.
// Sev0/no-severity reads as neutral; severity climbs through yellow/orange
// into red as the number goes up.
const SEVERITY_COLOR: Record<string, string> = {
  Sev0: 'rgba(242,237,226,.45)',
  Sev1: '#e0c458',
  Sev2: '#e0a058',
  Sev3: '#e07a4a',
  Sev4: '#f55d4e',
};

export function severityColor(severity: string | null): string {
  return (severity && SEVERITY_COLOR[severity]) || SEVERITY_COLOR.Sev0;
}

/** 0..4 so severities can be sorted/ranked without string-comparing "Sev10" vs "Sev2". */
export function severityRank(severity: string | null): number {
  const n = severity ? Number(severity.replace('Sev', '')) : 0;
  return Number.isFinite(n) ? n : 0;
}

/** Low uptime -> dim gold, high uptime -> bright gold fill. */
export function heat(v: number): string {
  const alpha = 0.08 + (v / 100) * 0.85;
  return `rgba(224,180,88,${alpha.toFixed(2)})`;
}

export const STATUS_META: Record<UploadStatus, { label: string; color: string }> = {
  queued: { label: 'Queued', color: '#8a8577' },
  uploading: { label: 'Uploading', color: '#e0b458' },
  success: { label: 'Parsed', color: '#4caf6d' },
  failed: { label: 'Failed', color: '#f55d4e' },
};
