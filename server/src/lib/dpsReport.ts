import { request, FormData } from 'undici';

const DPS_REPORT_BASE = 'https://dps.report';

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
  );
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new Error(`dps.report getJson failed (${res.statusCode}): ${text.slice(0, 500)}`);
  }
  return (await res.body.json()) as RawEiJson;
}
