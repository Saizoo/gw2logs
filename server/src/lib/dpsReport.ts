import { request, FormData } from 'undici';

const DPS_REPORT_BASE = 'https://dps.report';
const USER_AGENT = 'gw2logs/1.0 (+https://github.com/Saizoo/gw2logs)';

export interface DpsReportUploadResult {
  id: string;
  permalink: string;
  encounter?: { boss?: string; success?: boolean; isCm?: boolean };
}

export async function uploadToDpsReport(
  fileBuffer: Buffer,
  fileName: string,
): Promise<DpsReportUploadResult> {
  const form = new FormData();
  form.append('file', new Blob([fileBuffer]), fileName);

  const res = await request(`${DPS_REPORT_BASE}/uploadContent?json=1&generator=ei`, {
    method: 'POST',
    body: form,
    headers: { 'user-agent': USER_AGENT },
  });

  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new Error(`dps.report upload failed (${res.statusCode}): ${text.slice(0, 500)}`);
  }

  return (await res.body.json()) as DpsReportUploadResult;
}

/**
 * Full Elite Insights JSON, shape unverified against a live response — this
 * sandbox has no route to dps.report. Every access below is defensive
 * (optional chaining + fallback) so an unexpected/renamed field degrades to
 * a zero/empty value instead of failing ingestion; rawEiJson is always
 * persisted so nothing is lost if a mapping needs correcting later.
 */
export type RawEiJson = Record<string, any>;

export async function fetchEiJson(permalink: string): Promise<RawEiJson> {
  const res = await request(
    `${DPS_REPORT_BASE}/getJson?permalink=${encodeURIComponent(permalink)}`,
    { headers: { 'user-agent': USER_AGENT } },
  );
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new Error(`dps.report getJson failed (${res.statusCode}): ${text.slice(0, 500)}`);
  }
  return (await res.body.json()) as RawEiJson;
}

/**
 * dps.report is a third-party service that occasionally returns transient
 * 5xx errors (their own outages, not ours) — retry with backoff before
 * giving up so a brief blip doesn't fail the whole upload.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 4, baseDelayMs = 2000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
      }
    }
  }
  throw lastErr;
}
