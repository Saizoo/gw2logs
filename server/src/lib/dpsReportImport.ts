const DPS_REPORT_BASE = 'https://dps.report';
const USER_AGENT = 'gw2logs/1.0 (+https://github.com/Saizoo/gw2logs)';

export interface DpsReportUploadSummary {
  id: string;
  permalink: string;
  uploadTime: number;
  encounterTime: number;
  encounter?: {
    success?: boolean;
    duration?: number;
    error?: string | null;
    bossId?: number;
  };
}

interface DpsReportUploadsPage {
  uploads: DpsReportUploadSummary[];
  pages: number;
  totalUploads: number;
}

export async function fetchDpsReportUploads(userToken: string, page: number): Promise<DpsReportUploadsPage> {
  const url = `${DPS_REPORT_BASE}/getUploads?userToken=${encodeURIComponent(userToken)}&page=${page}&perPage=100`;
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`dps.report getUploads failed (${res.status})`);
  }
  const body = (await res.json()) as any;
  return {
    uploads: Array.isArray(body.uploads) ? body.uploads : [],
    pages: typeof body.pages === 'number' ? body.pages : 1,
    totalUploads: typeof body.totalUploads === 'number' ? body.totalUploads : (body.uploads?.length ?? 0),
  };
}

export async function fetchDpsReportJson(permalink: string): Promise<Record<string, any>> {
  const url = `${DPS_REPORT_BASE}/getJson?permalink=${encodeURIComponent(permalink)}`;
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`dps.report getJson failed (${res.status})`);
  }
  return res.json() as Promise<Record<string, any>>;
}
