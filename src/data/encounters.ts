// Real raid/strike encounter catalog, ported verbatim from the previous
// Hero-Panel raid planner (guide links, tags, notes, damage-preference
// reasoning). Only the 9 original Heart of Thorns bosses have curated
// "special roles" data (`read: true` in ENC_INFO) — everything else is a
// deliberate stub. Do not invent roles/notes for the stubbed encounters.

export interface EncounterEntry {
  id: string;
  name: string;
  guide: string;
  tag: string;
  notes: string[];
}

export interface WingEntry {
  id: string;
  name: string;
  encs: EncounterEntry[];
}

export interface ExpansionEntry {
  id: string;
  name: string;
  logo: string;
  strikesOnly?: boolean;
  wings: WingEntry[];
}

const G = 'https://snowcrows.com/guides/raids/';
const STRIKE_GUIDE = 'https://snowcrows.com/guides/strikes';

export const EXPANSIONS: ExpansionEntry[] = [
  {
    id: 'hot',
    name: 'Heart of Thorns',
    logo: 'heartofthorns',
    wings: [
      {
        id: 'w1',
        name: 'W1 · Spirit Vale',
        encs: [
          {
            id: 'vg',
            name: 'Vale Guardian',
            guide: G + 'spirit-vale/vale-guardian',
            tag: 'Wing 1 opener and a clean DPS check with split phases. Bring reliable CC for the seekers and assign players to the green teleport circles.',
            notes: [
              'Assign three players to greens before each split or the squad takes heavy damage.',
              'Save CC for the seekers during splits.',
              'Otherwise a pure damage check — bring comfortable, sustainable builds.',
            ],
          },
          {
            id: 'gorse',
            name: 'Gorseval',
            guide: G + 'spirit-vale/gorseval',
            tag: 'Burst-and-break fight. Heavy crowd control breaks the spectral cage and skips phases.',
            notes: [
              'Stack enough CC to break the cage before it closes.',
              'Use updrafts to skip phases — lift together.',
              'Burn hard through breakbar windows.',
            ],
          },
          {
            id: 'sab',
            name: 'Sabetha',
            guide: G + 'spirit-vale/sabetha',
            tag: 'Timed burn with rotating platforms, cannons and bomb kiting. A coordination check.',
            notes: [
              'Assign cannon-killers and a dedicated kiter pre-pull.',
              'Flak and bombs punish bad positioning — ranged flex helps.',
              'Phase before the platform timer expires.',
            ],
          },
        ],
      },
      {
        id: 'w2',
        name: 'W2 · Salvation Pass',
        encs: [
          {
            id: 'sloth',
            name: 'Slothasor',
            guide: G + 'salvation-pass/slothasor',
            tag: 'Mushroom-and-poison fight with a tofu-kiting mechanic and shake breakbars.',
            notes: [
              'Rotate the tofu (aggro) between players on a set order.',
              'Break every shake bar fast to avoid a wipe.',
              'Spread poison away from the group.',
            ],
          },
          {
            id: 'trio',
            name: 'Bandit Trio',
            guide: G + 'salvation-pass/bandit-trio',
            tag: 'Wave-defence encounter against Berg, Zane and Narella with adds and sabotage.',
            notes: [
              'Split DPS to handle adds and the three bosses.',
              'Manage the oils and sappers before they reach the prisoners.',
              'Burn Narella through her shield window.',
            ],
          },
          {
            id: 'matt',
            name: 'Matthias Gabrel',
            guide: G + 'salvation-pass/matthias-gabrel',
            tag: 'Escalating fight cycling through four conditions with a sacrifice and reflect mechanic.',
            notes: [
              'Free sacrificed players quickly.',
              "Don't reflect during the wrong phase.",
              'Manage corruption stacks by moving through the well.',
            ],
          },
        ],
      },
      {
        id: 'w3',
        name: 'W3 · Stronghold of the Faithful',
        encs: [
          {
            id: 'escort',
            name: 'Escort',
            guide: G + 'stronghold-faithful/siege-the-stronghold',
            tag: 'Objective event escorting the McLeod construct with mobile adds and Glenna mechanics.',
            notes: [
              'Protect Glenna and clear adds along the path.',
              'Tag the bloodstone nodes to weaken the wall.',
              'Pure coordination, low DPS check.',
            ],
          },
          {
            id: 'kc',
            name: 'Keep Construct',
            guide: G + 'stronghold-faithful/keep-construct',
            tag: 'Phase-driven fight with orbs, statue rifts and a burn check inside the circle.',
            notes: [
              'Push white and red orbs into the construct correctly.',
              'Run the rift pattern without clipping statues.',
              'Stack and burn during the compromised phase.',
            ],
          },
          {
            id: 'xera',
            name: 'Xera',
            guide: G + 'stronghold-faithful/xera',
            tag: 'Two-phase fight across a gauntlet with shards, gravity wells and a tight enrage.',
            notes: [
              'Soak the buttons to bridge the gap.',
              'Kill shards on time before the second phase.',
              'Watch gravity-well placement during the burn.',
            ],
          },
        ],
      },
      {
        id: 'w4',
        name: 'W4 · Bastion of the Penitent',
        encs: [
          {
            id: 'cairn',
            name: 'Cairn the Indomitable',
            guide: G + 'bastion-penitent/cairn-the-indomitable',
            tag: 'Open-arena DPS check with dodge-timed greens and displacement orbs.',
            notes: [
              'Agree on green-circle dodge timing.',
              'No CC requirement — bring your highest comfortable damage.',
              'Ranged flex helps during spreads.',
            ],
          },
          {
            id: 'mo',
            name: 'Mursaat Overseer',
            guide: G + 'bastion-penitent/mursaat-overseer',
            tag: 'Grid-management fight: claim tiles, soak protect, handle dieflitches.',
            notes: [
              'Keep the protect tile up at all times.',
              'Assign players to kill jade soldiers and dieflitches.',
              'A short, sharp DPS check once tiles are handled.',
            ],
          },
          {
            id: 'sam',
            name: 'Samarog',
            guide: G + 'bastion-penitent/samarog',
            tag: 'Add-and-fixate fight with Guldhem and Rigom, plus a swallow/spear mechanic.',
            notes: [
              'Break Guldhem and Rigom before they reach the boss.',
              'Handle fixates and the prisoner spear.',
              'CC the big breakbars on time.',
            ],
          },
          {
            id: 'deimos',
            name: 'Deimos',
            guide: G + 'bastion-penitent/deimos',
            tag: 'Escalating add-and-burst fight with the oil/hand mechanic at low percentages.',
            notes: [
              'Set up an oil-soaker rotation for the final phase.',
              'Call Mind Crush and Saul kiting clearly.',
              'Steady boon uptime carries the long back half.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'pof',
    name: 'Path of Fire',
    logo: 'pathoffire',
    wings: [
      {
        id: 'w5',
        name: 'W5 · Hall of Chains',
        encs: [
          {
            id: 'sh',
            name: 'Soulless Horror',
            guide: G + 'hall-chains/soulless-horror',
            tag: 'Donut-arena fight dodging spinning scythes with a tight enrage timer.',
            notes: [
              'Rotate around the room with the scythes, never clipping the wall.',
              'Soak golems and break on time.',
              'One of the tighter DPS checks in older wings.',
            ],
          },
          {
            id: 'river',
            name: 'River of Souls',
            guide: G + 'hall-chains/river-of-souls',
            tag: 'Escort-the-Desmina event down the river, managing spirits and hostile orbs.',
            notes: [
              'Keep Desmina moving and shielded.',
              'Kill enervators and friendly-soul thieves.',
              'Coordinate light/dark soul handling.',
            ],
          },
          {
            id: 'statues',
            name: 'Statues of Grenth',
            guide: G + 'hall-chains/statues-of-grenth',
            tag: 'Two-statue event: Eyes (Eparch) and the Hands/Broken King with light orbs.',
            notes: [
              'Collect and bank light orbs to damage the eyes.',
              'Manage the well and hostile spirits.',
              'Coordination over raw damage.',
            ],
          },
          {
            id: 'dhuum',
            name: 'Dhuum',
            guide: G + 'hall-chains/dhuum',
            tag: 'The wing finale — green soaking, messengers, reaping and a strict enrage.',
            notes: [
              'Soak greens with the right number of players.',
              'Kill messengers fast and bank globes for the final burn.',
              'Break the cage at 10% to finish him.',
            ],
          },
        ],
      },
      {
        id: 'w6',
        name: 'W6 · Mythwright Gambit',
        encs: [
          {
            id: 'ca',
            name: 'Conjured Amalgamate',
            guide: G + 'mythwright-gambit/conjured-amalgamate',
            tag: 'Sword-and-shield gimmick fight with collected fragments and arms to break.',
            notes: [
              'Assign sword and shield runners.',
              'Break the arms and manage the pylons.',
              'Mostly a mechanics check, modest DPS need.',
            ],
          },
          {
            id: 'largos',
            name: 'Twin Largos',
            guide: G + 'mythwright-gambit/twin-largos',
            tag: 'Two-boss fight (Nikare & Kenut) that must be brought down close together.',
            notes: [
              'Balance damage so both die within seconds of each other.',
              'Handle the aura, tornado and bubble mechanics.',
              'Split or stack per your strategy.',
            ],
          },
          {
            id: 'qadim',
            name: 'Qadim',
            guide: G + 'mythwright-gambit/qadim',
            tag: 'Multi-platform fight riding hydra, wyvern and destroyer, then a lamp interior burn.',
            notes: [
              'Assign pyre keepers and handle each pet platform.',
              "Break the wyvern's defiance fast.",
              "Sustain damage on the lamp's interior.",
            ],
          },
        ],
      },
      {
        id: 'w7',
        name: 'W7 · The Key of Ahdashim',
        encs: [
          {
            id: 'adina',
            name: 'Cardinal Adina',
            guide: G + 'key-ahdashim/cardinal-adina',
            tag: 'Hand-and-pillar fight. Positioning around shattered pillars beats raw damage.',
            notes: [
              'Drop pillars cleanly to break line of sight from the eye.',
              'Reach hands spawning around the arena.',
              'Mobility-rich DPS eases repositioning.',
            ],
          },
          {
            id: 'sabir',
            name: 'Cardinal Sabir',
            guide: G + 'key-ahdashim/cardinal-sabir',
            tag: 'Lightning fight with arms, knockback tornados and a rotating safe zone.',
            notes: [
              'Break the arms before they wipe the platform.',
              'Dodge the rotating shockwaves.',
              'Use the bubble to negate knockback during burns.',
            ],
          },
          {
            id: 'qtp',
            name: 'Qadim the Peerless',
            guide: G + 'key-ahdashim/qadim-the-peerless',
            tag: 'The endgame coordination fight: pylons, orbs, lightning and a strict DPS check.',
            notes: [
              'Rotate pylon-kiters and orb-pushers on a strict cadence.',
              'Pick builds you can pilot cleanly under pressure over the absolute top bench.',
              'Two healers and full boon coverage are standard for progression.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ibs',
    name: 'The Icebrood Saga',
    logo: 'theicebroodsaga',
    strikesOnly: true,
    wings: [
      {
        id: 'shiverpeaks',
        name: 'Shiverpeaks Pass',
        encs: [
          {
            id: 'icebrood',
            name: 'Legendary Icebrood Construct',
            guide: STRIKE_GUIDE,
            tag: 'Short single-boss strike: a construct that splits damage between elementals you must control.',
            notes: [
              'Spread the damage evenly across the elemental forms.',
              'Break the construct quickly when its bar appears.',
              'A gentle introduction to strike-style encounters.',
            ],
          },
        ],
      },
      {
        id: 'fraenir',
        name: 'Fraenir of Jormag',
        encs: [
          {
            id: 'fraenir',
            name: 'Fraenir of Jormag',
            guide: STRIKE_GUIDE,
            tag: 'Two-stage strike: the Fraenir, then an Icebrood Construct with a frozen-shard mechanic.',
            notes: [
              'Break the Fraenir during the icebrood-shield phase.',
              'Dodge the frozen shards in the construct stage.',
              'Steady cleave handles the adds.',
            ],
          },
        ],
      },
      {
        id: 'boneskinner',
        name: 'Boneskinner',
        encs: [
          {
            id: 'boneskinner',
            name: 'Boneskinner',
            guide: STRIKE_GUIDE,
            tag: 'Darkness-and-torches strike. Keep light sources up or the squad melts to fear and damage.',
            notes: [
              'Keep torches lit to hold back the darkness.',
              'Bring strong healing and aegis for the heavy pressure.',
              'Spread aggro — the boss fixates and cleaves hard.',
            ],
          },
        ],
      },
      {
        id: 'whisper',
        name: 'Whisper of Jormag',
        encs: [
          {
            id: 'whisper',
            name: 'Whisper of Jormag',
            guide: STRIKE_GUIDE,
            tag: 'Single-boss strike with a doppelganger and a sustained burn. Featured in the quickplay pool.',
            notes: [
              'Handle the doppelganger phase without feeding it damage.',
              'Manage the frost wells and spreads.',
              'A clean DPS-and-positioning check.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'eod',
    name: 'End of Dragons',
    logo: 'endofdragons',
    strikesOnly: true,
    wings: [
      {
        id: 'ah',
        name: 'Aetherblade Hideout',
        encs: [
          {
            id: 'maitrin',
            name: 'Mai Trin & Echo of Scarlet Briar',
            guide: 'https://snowcrows.com/guides/strikes/aetherblade-hideout',
            tag: 'Two-phase strike: Mai Trin, then the Echo of Scarlet Briar with a shared health pool and lightning.',
            notes: [
              "Bait and dodge Mai Trin's cannon barrages.",
              'In the Scarlet phase, manage the lightning circles and adds.',
              'CM adds a strict enrage — bring a clean rotation.',
            ],
          },
        ],
      },
      {
        id: 'xjj',
        name: 'Xunlai Jade Junkyard',
        encs: [
          {
            id: 'ankka',
            name: 'Ankka',
            guide: 'https://snowcrows.com/guides/strikes/xunlai-jade-junkyard',
            tag: 'Single-boss strike with three hands, a possession mechanic and zones to cleanse.',
            notes: [
              'Move between the three areas as the boss shifts.',
              'Cleanse possession before it spreads.',
              'Kill the hands and manage the sickness stacks.',
            ],
          },
        ],
      },
      {
        id: 'ko',
        name: 'Kaineng Overlook',
        encs: [
          {
            id: 'li',
            name: 'Minister Li',
            guide: 'https://snowcrows.com/guides/strikes/kaineng-overlook',
            tag: 'Multi-add strike against Minister Li and her lieutenants, with tower and platform mechanics.',
            notes: [
              'Burn the lieutenants in the planned order.',
              'Handle the sniper, mech rider and tower mechanics.',
              'CM punishes loose breakbar timing.',
            ],
          },
        ],
      },
      {
        id: 'ht',
        name: 'Harvest Temple',
        encs: [
          {
            id: 'dragonvoid',
            name: 'The Dragonvoid',
            guide: 'https://snowcrows.com/guides/strikes/harvest-temple',
            tag: 'The EoD finale strike: a multi-dragon gauntlet ending in the Dragonvoid, with greens and orbs.',
            notes: [
              'Assign green-soakers for each purification.',
              'Bring strong ranged options for the dragon phases.',
              "Pace your cooldowns — it's a long encounter.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'soto',
    name: 'Secrets of the Obscure',
    logo: 'secretsoftheobscure',
    strikesOnly: true,
    wings: [
      {
        id: 'co',
        name: 'Cosmic Observatory',
        encs: [
          {
            id: 'dagda',
            name: 'Dagda',
            guide: 'https://snowcrows.com/guides/strikes/cosmic-observatory',
            tag: 'Single-boss strike with expanding cosmic AoE and a tight space-management theme. In the quickplay pool.',
            notes: [
              'Manage shrinking safe space as the cosmic rings grow.',
              'Soak the green circles and spread the spreads.',
              'CM is a sharp coordination and DPS check.',
            ],
          },
        ],
      },
      {
        id: 'tof',
        name: 'Temple of Febe',
        encs: [
          {
            id: 'cerus',
            name: 'Cerus',
            guide: 'https://snowcrows.com/guides/strikes/temple-of-febe',
            tag: 'Pinnacle SotO encounter — the first with a Legendary mode. Cerus tests positioning, soaks and burst.',
            notes: [
              'Coordinate the despair/soak mechanics carefully.',
              'LM and CM add heavy mechanical density — drill them.',
              'Bring a clean rotation and reliable boon coverage.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'jw',
    name: 'Janthir Wilds',
    logo: 'janthirwilds',
    wings: [
      {
        id: 'w8',
        name: 'W8 · Mount Balrior',
        encs: [
          {
            id: 'greer',
            name: 'Greer, the Blightbringer',
            guide: 'https://snowcrows.com/guides/raids/mount-balrior/greer',
            tag: 'Wing 8 opener: a blight-and-add fight with green soaks and spreading corruption.',
            notes: [
              'Soak greens and clear blight before it spreads.',
              "Manage the adds and the boss's poison fields.",
              'Break on time during the defiance windows.',
            ],
          },
          {
            id: 'decima',
            name: 'Decima, the Stormsinger',
            guide: 'https://snowcrows.com/guides/raids/mount-balrior/decima',
            tag: 'Lightning-themed fight with conduits, orbs and arena-wide storm mechanics.',
            notes: [
              'Route the lightning through the conduits correctly.',
              'Handle the orb soaks and spreads.',
              'CM tightens the storm timing significantly.',
            ],
          },
          {
            id: 'ura',
            name: 'Ura, the Steamshrieker',
            guide: 'https://snowcrows.com/guides/raids/mount-balrior/ura',
            tag: 'The wing finale, with a Legendary mode: steam, geysers and a punishing enrage.',
            notes: [
              'Position around the geysers and steam vents.',
              'LM and CM raise the mechanical and DPS demands.',
              'Full boon coverage and two healers are standard for progression.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'voe',
    name: 'Visions of Eternity',
    logo: 'visionsofeternity',
    wings: [
      {
        id: 'gg',
        name: "Guardian's Glade",
        encs: [
          {
            id: 'kela',
            name: 'Kela, Seneschal of Waves',
            guide: 'https://snowcrows.com/guides/raids',
            tag: 'The first Visions of Eternity raid encounter (Feb 2026), with a challenge mode. A wave-and-tide themed fight.',
            notes: [
              'Manage the wave mechanics and arena flooding.',
              'Soak and spread per the tide cycle.',
              'CM (released Feb 24, 2026) adds extra mechanics — check the latest guide.',
            ],
          },
        ],
      },
    ],
  },
];

export const WINGS: WingEntry[] = EXPANSIONS.flatMap((x) => x.wings);

export function findEncounter(encId: string): { encounter: EncounterEntry; wing: WingEntry; expansion: ExpansionEntry } | null {
  for (const expansion of EXPANSIONS) {
    for (const wing of expansion.wings) {
      const encounter = wing.encs.find((e) => e.id === encId);
      if (encounter) return { encounter, wing, expansion };
    }
  }
  return null;
}

export interface DamagePref {
  pref: 'power' | 'condi' | 'either';
  reason: string;
}

// Only HoT/PoF raid bosses have curated damage-preference guidance —
// strikes and W8/VoE bosses have none in the source material.
export const DMG_PREF: Record<string, DamagePref> = {
  vg: { pref: 'either', reason: 'Long, steady phases suit both; condi ramps cleanly, power bursts the splits.' },
  gorse: { pref: 'power', reason: 'Frequent phasing and breakbar windows favour upfront power burst over condi ramp.' },
  sab: { pref: 'either', reason: 'Timed phases with adds — power burns platforms fast, condi handles sustained cleave.' },
  sloth: { pref: 'power', reason: 'Phase transitions and breakbars reward burst; long condi ramp is partly wasted.' },
  trio: { pref: 'either', reason: 'Multi-target add management — bring whatever cleaves your assigned lane best.' },
  matt: { pref: 'condi', reason: 'Long single-target uptime with few hard phases lets condi ramp pay off.' },
  escort: { pref: 'either', reason: 'Low DPS check and lots of adds — flexible, take what your group already runs.' },
  kc: { pref: 'power', reason: 'Hard phase gates and a burn window favour power burst to push percentages.' },
  xera: { pref: 'power', reason: 'Tight enrage with phase splits and movement — power burst beats interrupted condi ramp.' },
  cairn: { pref: 'condi', reason: 'Pure tank-and-spank with near-constant uptime — ideal for condi ramp.' },
  mo: { pref: 'condi', reason: 'Stationary single-target burn once tiles are handled suits condi well.' },
  sam: { pref: 'condi', reason: 'Long fixed phases with sustained uptime let condi builds shine.' },
  deimos: { pref: 'condi', reason: 'Long fight with a sustained back half rewards condi ramp once it\'s rolling.' },
  sh: { pref: 'condi', reason: 'Continuous single-target uptime around the donut favours condi pressure.' },
  river: { pref: 'either', reason: 'Escort event with moving targets — flexible; bring mobile, ranged-capable DPS.' },
  statues: { pref: 'either', reason: 'Controlled DPS across mini-bosses — either works, coordination matters more.' },
  dhuum: { pref: 'power', reason: 'Burst windows, greens and a strict final-phase check reward power spikes.' },
  ca: { pref: 'power', reason: 'Short burst windows on shields/arms favour power over slow condi ramp.' },
  largos: { pref: 'power', reason: 'Two bosses to bring down in sync — power burst balances the kill timing.' },
  qadim: { pref: 'either', reason: 'Multi-platform pet damage plus a lamp burn — flexible to your roster.' },
  adina: { pref: 'condi', reason: 'Mostly stationary single-target once pillars are placed — strong for condi.' },
  sabir: { pref: 'power', reason: 'Arm breaks and movement-heavy phases favour burst over condi ramp.' },
  qtp: { pref: 'either', reason: 'Strict check, but value comfort and uptime — take what you pilot cleanly under pressure.' },
};

export const DMG_VERIFIED: Record<string, string> = {
  vg: 'Guide requires at least two Condition DPS for the Red Guardian (very high toughness add).',
  kc: "Guide states this is a power DPS fight — Keep Construct's toughness is 687 (vs. Mursaat Overseer's 1374).",
};

export interface EncounterInfo {
  read: boolean;
  roles?: string[];
  mast?: string[];
  mount?: string[];
}

// Only the 9 original HoT bosses have curated "special roles / masteries /
// mounts" data — everything else is a deliberate {read:false} stub from
// the source material. Do not fabricate content for the stubbed entries.
export const ENC_INFO: Record<string, EncounterInfo> = {
  vg: { read: true, roles: ['Tank (Toughness)', '2+ Condition DPS for the Red Guardian (high-toughness add)', 'Optional: a player for Seeker control'], mast: [], mount: [] },
  gorse: { read: true, roles: ['Tank (Toughness — low pressure)', 'Two subgroups for split phases, or soft-CC to slow the Charged Souls'], mast: ['Updraft Use (to reach the arena)'], mount: [] },
  sab: { read: true, roles: ['Tank (Toughness)', 'Players to kick cannons', 'A dedicated bomb-kiter'], mast: [], mount: [] },
  sloth: { read: true, roles: ['4 mushroom-eaters (assigned DPS)', 'Optional: 1–4 backup mushroom-eaters'], mast: [], mount: [] },
  trio: { read: true, roles: ['Saboteur-handler (CC + Nuhoch Stealth Detection)', 'Mortar-handler (lots of CC)'], mast: ['Nuhoch Stealth Detection (to see Saboteurs)', 'Glider Basics (to reach the ground)', 'Explosive Launch (helpful for Mortars, not required)'], mount: [] },
  matt: { read: true, roles: ["2+ reflect-users to remove Matthias's Blood Shield"], mast: ['Forsaken Thicket Waters'], mount: [] },
  escort: { read: true, roles: ['1 escort / babysitter (usually a healer) to move Glenna', "Tower-capturer(s) — often a 'tower Chronomancer'", '1 back-warg-killer (soft-CC DPS)'], mast: ['Forsaken Thicket Waters & Bouncing Mushrooms (Tower 1)', 'Ley Line Gliding (tower-capturers)', 'Forsaken Magic (Bloodstone Turrets)'], mount: [] },
  kc: { read: true, roles: ['1 tank (highest Toughness) to move KC to the statue', '1 core-pusher (medium-speed, non-projectile weapon)'], mast: [], mount: [] },
  xera: { read: true, roles: ['1 tank (highest Toughness)'], mast: ['Ley Line Gliding'], mount: [] },
  cairn: { read: false },
  mo: { read: false },
  sam: { read: false },
  deimos: { read: false },
  sh: { read: false },
  river: { read: false },
  statues: { read: false },
  dhuum: { read: false },
  ca: { read: false },
  largos: { read: false },
  qadim: { read: false },
  adina: { read: false },
  sabir: { read: false },
  qtp: { read: false },
};
