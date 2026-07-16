// Shaped to match Elite Insights' actual JSON output schema, verified
// against the GW2EIJSON source (JsonLog/JsonActor/JsonPlayer/JsonStatistics/
// JsonBuffsUptime/JsonMechanics in baaron4/GW2-Elite-Insights-Parser@master).
import type { RawEiJson } from '../../lib/ingest.js';

export const sampleEiJson: RawEiJson = {
  FightName: 'Dhuum',
  TriggerID: 15429,
  IsCM: true,
  Success: true,
  Duration: '2m 31s',
  DurationMS: 151000,
  TimeStart: '2026-07-10 21:14:00 -00:00',
  Players: [
    {
      Name: 'Sai Zu',
      Account: 'SaiZu.1234',
      Profession: 'Chronomancer',
      Group: 1,
      DpsAll: [{ Dps: 26800, PowerDps: 9380, CondiDps: 17420 }],
      Defenses: [{ DamageTaken: 4200, DownCount: 0, DeadCount: 0 }],
      BuffUptimes: [
        { Id: 1187, BuffData: [{ Uptime: 95 }] },
        { Id: 30328, BuffData: [{ Uptime: 30 }] },
        { Id: 740, BuffData: [{ Uptime: 25 }] },
        { Id: 725, BuffData: [{ Uptime: 100 }] },
        { Id: 717, BuffData: [{ Uptime: 70 }] },
        { Id: 743, BuffData: [{ Uptime: 12 }] },
        { Id: 1122, BuffData: [{ Uptime: 8 }] },
      ],
      // Chronomancer generating alacrity for its own subgroup, with no
      // healing addon data captured — should classify as boon_dps. Group
      // buff entries carry `Generation` (share of subgroup uptime this
      // player is responsible for), not `Uptime` — confirmed against a
      // real EI 3.25 JSON export, where BuffData[0] has no Uptime key at
      // all on a GroupBuffs entry.
      GroupBuffs: [
        { Id: 1187, BuffData: [{ Generation: 4 }] },
        { Id: 30328, BuffData: [{ Generation: 88 }] },
      ],
    },
    {
      Name: 'Moira Ashfall',
      Account: 'Moira.5678',
      Profession: 'Firebrand',
      Group: 2,
      DpsAll: [{ Dps: 21200, PowerDps: 14840, CondiDps: 6360 }],
      Defenses: [{ DamageTaken: 5720, DownCount: 1, DeadCount: 1 }],
      DeathRecap: [
        {
          DeathTime: 120500,
          ToDown: [{ Id: 12345, IndirectDamage: false, Src: 'Dhuum', Damage: 8000, Time: 119800 }],
          ToKill: [
            { Id: 12345, IndirectDamage: false, Src: 'Dhuum', Damage: 4000, Time: 120100 },
            { Id: 67890, IndirectDamage: true, Src: 'Dhuum', Damage: 6000, Time: 120500 },
          ],
        },
      ],
      BuffUptimes: [
        { Id: 1187, BuffData: [{ Uptime: 91 }] },
        { Id: 30328, BuffData: [{ Uptime: 20 }] },
        { Id: 740, BuffData: [{ Uptime: 25 }] },
        { Id: 725, BuffData: [{ Uptime: 95 }] },
        { Id: 717, BuffData: [{ Uptime: 60 }] },
        { Id: 743, BuffData: [{ Uptime: 15 }] },
        { Id: 1122, BuffData: [{ Uptime: 6 }] },
      ],
      // Heal Firebrand generating quickness for its own subgroup, with
      // healing-addon data captured showing sustained high outgoing
      // healing — should classify as boon_heal.
      GroupBuffs: [
        { Id: 1187, BuffData: [{ Generation: 92 }] },
        { Id: 30328, BuffData: [{ Generation: 2 }] },
      ],
      EXTHealingStats: {
        OutgoingHealing: [{ Hps: 3400, Healing: 513400 }],
      },
    },
    {
      Name: 'Torvald Rune',
      Account: 'Torvald.4321',
      Profession: 'Renegade',
      Group: 3,
      DpsAll: [{ Dps: 8100, PowerDps: 5200, CondiDps: 2900 }],
      Defenses: [{ DamageTaken: 2100, DownCount: 0, DeadCount: 0 }],
      BuffUptimes: [
        { Id: 1187, BuffData: [{ Uptime: 20 }] },
        { Id: 30328, BuffData: [{ Uptime: 90 }] },
        { Id: 740, BuffData: [{ Uptime: 10 }] },
        { Id: 725, BuffData: [{ Uptime: 60 }] },
        { Id: 717, BuffData: [{ Uptime: 80 }] },
        { Id: 743, BuffData: [{ Uptime: 20 }] },
        { Id: 1122, BuffData: [{ Uptime: 12 }] },
      ],
      // Heal Renegade generating alacrity for its own subgroup, but this
      // particular kill barely needed healing so measured outgoing HPS
      // rounds down near zero — should still classify as boon_heal on the
      // gear-derived Healing Power score alone, confirmed against a real
      // log with two known healers whose measured output that pull was
      // likewise near zero.
      GroupBuffs: [
        { Id: 1187, BuffData: [{ Generation: 3 }] },
        { Id: 30328, BuffData: [{ Generation: 76 }] },
      ],
      EXTHealingStats: {
        OutgoingHealing: [{ Hps: 40, Healing: 6040 }],
      },
      Healing: 10,
    },
  ],
  Mechanics: [
    {
      Name: 'Green Hit',
      Severity: 'Sev2',
      MechanicsData: [{ Time: 78000, Actor: 'Moira Ashfall' }],
    },
    {
      Name: 'Shackled',
      Severity: 'Sev4',
      MechanicsData: [{ Time: 100000, Actor: 'Sai Zu' }],
    },
  ],
};
