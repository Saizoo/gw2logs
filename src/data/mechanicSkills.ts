// Maps a boss's Elite Insights mechanic names to the in-game skill/ability they
// represent, so the log's Mechanics tab can show a hover explainer. EI mechanic
// names are short labels (e.g. "Green", "Seeker Fixate") — there's no
// programmatic path from those to a GW2 skill, so this is a hand-curated table.
//
// Matching is keyword-based and conservative: an entry fires only when one of
// its distinctive `match` keywords appears in the mechanic name, so a wrong
// tooltip is avoided in favour of simply showing none. Keys are the canonical
// fight name (see server bossMeta canonicalFightName).
//
// Starting with Vale Guardian; extend one boss at a time.
export interface MechanicSkill {
  /** In-game skill / ability name. */
  skill: string;
  /** Plain-language description of what it does and how to handle it. */
  description: string;
  /** GW2 wiki link for the full details. */
  wiki: string;
  /** Distinctive keywords matched (normalised) against the EI mechanic name. */
  match: string[];
}

const VALE_GUARDIAN_WIKI = 'https://wiki.guildwars2.com/wiki/Vale_Guardian';

export const BOSS_MECHANIC_SKILLS: Record<string, MechanicSkill[]> = {
  'Vale Guardian': [
    {
      skill: 'Green Circle',
      description:
        'A shrinking green AoE. Enough players must stand inside before it closes, or the whole squad takes heavy magic damage.',
      wiki: VALE_GUARDIAN_WIKI,
      match: ['green'],
    },
    {
      skill: 'Unstable Magic Spike (Blue Teleport)',
      description:
        'Blue circles spawn under players near the boss. Anyone still on one when it expires is teleported to a random spot in the arena.',
      wiki: VALE_GUARDIAN_WIKI,
      match: ['teleport'],
    },
    {
      skill: 'Seekers',
      description:
        'Slow-moving adds that fixate a player and pulse heavy damage in a radius. Kite them away from the squad; they die to cleave.',
      wiki: 'https://wiki.guildwars2.com/wiki/Seeker',
      match: ['seeker', 'fixate'],
    },
    {
      skill: 'Magic Storm',
      description:
        'Arena-wide pulsing magic damage the boss unleashes at the start of a split phase, and if a coloured guardian is left alive too long.',
      wiki: VALE_GUARDIAN_WIKI,
      match: ['storm'],
    },
    {
      skill: 'Distributed Magic',
      description:
        "The Blue Guardian's split-phase attack — a shared magic hit a few players must soak. Soaking grants Blue Pylon Power, which must be stripped with boon removal.",
      wiki: VALE_GUARDIAN_WIKI,
      match: ['distributed', 'pylon'],
    },
  ],
};

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// The skill behind a boss's mechanic name, or null when there's no curated
// match (the common case for now — only Vale Guardian is mapped).
export function findMechanicSkill(boss: string, mechanicName: string): MechanicSkill | null {
  const list = BOSS_MECHANIC_SKILLS[boss];
  if (!list) return null;
  const n = normalize(mechanicName);
  for (const entry of list) {
    if (entry.match.some((k) => n.includes(normalize(k)))) return entry;
  }
  return null;
}
