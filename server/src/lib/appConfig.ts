import { prisma } from '../db.js';

// Feature switches, read at request time so an admin flip takes effect
// without a redeploy. A short TTL cache keeps the hot paths (every upload,
// every OAuth callback) from hitting the config table on each request
// while still picking up changes within a few seconds.

export const CONFIG_DEFAULTS = {
  // 'true' pauses new log uploads (maintenance mode); parsing of already
  // accepted jobs continues.
  uploadsPaused: 'false',
  // 'true' blocks brand-new Discord accounts from registering; existing
  // users keep signing in.
  inviteOnly: 'false',
  // Minutes before raid start that new groups default their Discord
  // reminder to.
  defaultReminderMins: '60',
} as const;

export type ConfigKey = keyof typeof CONFIG_DEFAULTS;

const CACHE_TTL_MS = 5_000;
let cache: { values: Record<string, string>; fetchedAt: number } | null = null;

async function readAll(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.values;
  const rows = await prisma.appConfig.findMany();
  const values: Record<string, string> = {};
  for (const row of rows) values[row.key] = row.value;
  cache = { values, fetchedAt: Date.now() };
  return values;
}

export async function getConfig(key: ConfigKey): Promise<string> {
  const values = await readAll();
  return values[key] ?? CONFIG_DEFAULTS[key];
}

export async function getConfigBool(key: ConfigKey): Promise<boolean> {
  return (await getConfig(key)) === 'true';
}

export async function getConfigInt(key: ConfigKey): Promise<number> {
  const parsed = Number(await getConfig(key));
  return Number.isFinite(parsed) ? parsed : Number(CONFIG_DEFAULTS[key]);
}

export async function setConfig(key: ConfigKey, value: string): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  cache = null;
}

export async function getAllConfig(): Promise<Record<ConfigKey, string>> {
  const values = await readAll();
  const out = {} as Record<ConfigKey, string>;
  for (const key of Object.keys(CONFIG_DEFAULTS) as ConfigKey[]) {
    out[key] = values[key] ?? CONFIG_DEFAULTS[key];
  }
  return out;
}
