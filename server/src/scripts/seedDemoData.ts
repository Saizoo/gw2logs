import '../loadEnv.js';
import { normalizeEiJson } from '../lib/ingest.js';
import { persistLog } from '../lib/persist.js';
import { sampleEiJson } from './fixtures/sampleEiJson.js';

const variantA = sampleEiJson;
const variantB = {
  ...sampleEiJson,
  fightName: 'Dhuum',
  timeStart: '2026-07-11 20:00:00 -00:00',
  duration: '2m 45s',
  durationMS: 165000,
  success: false,
  players: [
    { name: 'Torin Blackwell', account: 'Torin.9999', profession: 'Scrapper', group: 1 },
    { name: 'Aeris Nightsong', account: 'Aeris.1111', profession: 'Soulbeast', group: 2 },
  ],
  dpsAll: [[{ dps: 19500, powerDps: 12000, condiDps: 7500 }], [{ dps: 17200, powerDps: 15000, condiDps: 2200 }]],
};
const variantC = {
  ...sampleEiJson,
  fightName: 'Qadim the Peerless',
  isCM: true,
  timeStart: '2026-07-12 19:00:00 -00:00',
  players: [{ name: 'Sai Zu', account: 'SaiZu.1234', profession: 'Chronomancer', group: 1 }],
  dpsAll: [[{ dps: 31000, powerDps: 10000, condiDps: 21000 }]],
  defenses: [[{ damageTaken: 3000, downCount: 0, deadCount: 0 }]],
  buffUptimes: sampleEiJson.buffUptimes.map((b: any) => ({ ...b, buffData: [b.buffData[0]] })),
  mechanics: [],
};

for (const [i, raw] of [variantA, variantB, variantC].entries()) {
  const normalized = normalizeEiJson(raw);
  const permalink = `seed-e2e-${i}-${Date.now()}`;
  const log = await persistLog({
    permalink,
    dpsReportId: permalink,
    sourceFileName: `seed-${i}.zevtc`,
    rawJson: raw,
    normalized,
  });
  console.log(`seeded log ${i}:`, log.id, normalized.fightName);
}
