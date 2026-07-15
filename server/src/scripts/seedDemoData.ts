import '../loadEnv.js';
import { normalizeEiJson } from '../lib/ingest.js';
import { persistLog } from '../lib/persist.js';
import { sampleEiJson } from './fixtures/sampleEiJson.js';

const variantA = sampleEiJson;
const variantB = {
  ...sampleEiJson,
  FightName: 'Dhuum',
  TimeStart: '2026-07-11 20:00:00 -00:00',
  Duration: '2m 45s',
  DurationMS: 165000,
  Success: false,
  Players: [
    {
      Name: 'Torin Blackwell', Account: 'Torin.9999', Profession: 'Scrapper', Group: 1,
      DpsAll: [{ Dps: 19500, PowerDps: 12000, CondiDps: 7500 }],
      Defenses: [{ DamageTaken: 6100, DownCount: 0, DeadCount: 0 }],
      BuffUptimes: [],
    },
    {
      Name: 'Aeris Nightsong', Account: 'Aeris.1111', Profession: 'Soulbeast', Group: 2,
      DpsAll: [{ Dps: 17200, PowerDps: 15000, CondiDps: 2200 }],
      Defenses: [{ DamageTaken: 7400, DownCount: 1, DeadCount: 0 }],
      BuffUptimes: [],
    },
  ],
  Mechanics: [],
};
const variantC = {
  ...sampleEiJson,
  FightName: 'Qadim the Peerless',
  IsCM: true,
  TimeStart: '2026-07-12 19:00:00 -00:00',
  Players: [
    {
      Name: 'Sai Zu', Account: 'SaiZu.1234', Profession: 'Chronomancer', Group: 1,
      DpsAll: [{ Dps: 31000, PowerDps: 10000, CondiDps: 21000 }],
      Defenses: [{ DamageTaken: 3000, DownCount: 0, DeadCount: 0 }],
      BuffUptimes: sampleEiJson.Players[0].BuffUptimes,
    },
  ],
  Mechanics: [],
};

for (const [i, raw] of [variantA, variantB, variantC].entries()) {
  const normalized = normalizeEiJson(raw);
  const log = await persistLog({
    contentHash: `seed-demo-${i}-${Date.now()}`,
    sourceFileName: `seed-${i}.zevtc`,
    rawJson: raw,
    normalized,
  });
  console.log(`seeded log ${i}:`, log.id, normalized.fightName);
}
