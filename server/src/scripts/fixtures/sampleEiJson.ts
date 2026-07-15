// A hand-built sample shaped like Elite Insights' JSON output, used to
// exercise normalizeEiJson()/persistLog() against a real database without
// network access to dps.report. Field names follow the documented EI JSON
// schema from memory — see the note in lib/dpsReport.ts about verifying
// against one real upload once the server is deployed.
import type { RawEiJson } from '../../lib/dpsReport.js';

export const sampleEiJson: RawEiJson = {
  fightName: 'Dhuum',
  triggerID: 15429,
  isCM: true,
  success: true,
  duration: '2m 31s',
  durationMS: 151000,
  timeStart: '2026-07-10 21:14:00 -00:00',
  players: [
    { name: 'Sai Zu', account: 'SaiZu.1234', profession: 'Chronomancer', group: 1 },
    { name: 'Moira Ashfall', account: 'Moira.5678', profession: 'Firebrand', group: 2 },
  ],
  dpsAll: [
    [{ dps: 26800, powerDps: 9380, condiDps: 17420 }],
    [{ dps: 21200, powerDps: 14840, condiDps: 6360 }],
  ],
  defenses: [
    [{ damageTaken: 4200, downCount: 0, deadCount: 0 }],
    [{ damageTaken: 5720, downCount: 1, deadCount: 0 }],
  ],
  buffUptimes: [
    { id: 1187, name: 'Quickness', buffData: [{ uptime: 95 }, { uptime: 91 }] },
    { id: 30328, name: 'Alacrity', buffData: [{ uptime: 30 }, { uptime: 20 }] },
    { id: 740, name: 'Might', buffData: [{ uptime: 25 }, { uptime: 25 }] },
    { id: 725, name: 'Fury', buffData: [{ uptime: 100 }, { uptime: 95 }] },
    { id: 717, name: 'Protection', buffData: [{ uptime: 70 }, { uptime: 60 }] },
    { id: 743, name: 'Aegis', buffData: [{ uptime: 12 }, { uptime: 15 }] },
    { id: 1122, name: 'Stability', buffData: [{ uptime: 8 }, { uptime: 6 }] },
  ],
  mechanics: [
    {
      name: 'Green Hit',
      data: [{ time: 78000, actor: 'Moira Ashfall' }],
    },
    {
      name: 'Shackled',
      data: [{ time: 100000, actor: 'Sai Zu' }],
    },
  ],
};
