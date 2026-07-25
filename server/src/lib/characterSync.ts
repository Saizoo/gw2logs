import { prisma } from '../db.js';
import {
  fetchCharacterBuildTabs,
  fetchCharacterEquipmentTabs,
  fetchCharacters,
  fetchItems,
  fetchSkills,
  fetchSpecializations,
  fetchTraits,
  fetchTokenInfo,
  type Gw2BuildTab,
  type Gw2EquipmentTab,
  type Gw2Item,
  type Gw2Skill,
  type Gw2Specialization,
  type Gw2Trait,
} from './gw2Api.js';

export class MissingPermissionError extends Error {}

// GW2's ids-list endpoints cap the list length (documented 200); leave headroom.
const ID_BATCH_SIZE = 180;

// --- Display-ready shapes stored on Character.equipmentTabs / .buildTabs ------
// Everything is pre-resolved to name + icon here because the GW2 /v2 API is
// CORS-blocked from the browser — the frontend only ever renders these.

interface ResolvedRef {
  name: string;
  icon: string | null;
}
interface ResolvedItem extends ResolvedRef {
  slot: string;
  rarity: string | null;
  upgrades: ResolvedRef[];
  infusions: ResolvedRef[];
}
export interface ResolvedEquipmentTab {
  tab: number;
  name: string | null;
  isActive: boolean;
  items: ResolvedItem[];
}
interface ResolvedSpec extends ResolvedRef {
  id: number;
  elite: boolean;
  traits: ResolvedRef[];
}
export interface ResolvedBuildTab {
  tab: number;
  name: string | null;
  isActive: boolean;
  profession: string;
  spec: string | null;
  specializations: ResolvedSpec[];
  skills: { heal: ResolvedRef | null; utilities: ResolvedRef[]; elite: ResolvedRef | null };
}

async function resolveInBatches<T extends { id: number }>(ids: number[], fetcher: (batch: number[]) => Promise<T[]>): Promise<Map<number, T>> {
  const out = new Map<number, T>();
  const list = [...new Set(ids)].filter((n) => typeof n === 'number');
  for (let i = 0; i < list.length; i += ID_BATCH_SIZE) {
    try {
      const rows = await fetcher(list.slice(i, i + ID_BATCH_SIZE));
      for (const r of rows) out.set(r.id, r);
    } catch {
      // A bad id (removed from the game, or a beta item) 404s the whole batch;
      // skip it rather than failing the sync. Unresolved ids just render blank.
    }
  }
  return out;
}

function eliteSpecName(specs: ({ id: number } | null)[], specCache: Map<number, Gw2Specialization>): string | null {
  for (const entry of specs) {
    if (!entry?.id) continue;
    const spec = specCache.get(entry.id);
    if (spec?.elite) return spec.name;
  }
  return null;
}

function itemRef(id: number | undefined, items: Map<number, Gw2Item>): ResolvedRef | null {
  if (!id) return null;
  const it = items.get(id);
  return it ? { name: it.name, icon: it.icon ?? null } : null;
}

function buildResolvedEquipment(tabs: Gw2EquipmentTab[], items: Map<number, Gw2Item>): ResolvedEquipmentTab[] {
  return tabs.map((t) => ({
    tab: t.tab,
    name: t.name ?? null,
    isActive: t.is_active,
    items: (t.equipment ?? [])
      .filter((e) => e.slot)
      .map((e) => {
        const it = items.get(e.id);
        return {
          slot: e.slot!,
          name: it?.name ?? '',
          icon: it?.icon ?? null,
          rarity: it?.rarity ?? null,
          upgrades: (e.upgrades ?? []).map((u) => itemRef(u, items)).filter((r): r is ResolvedRef => !!r),
          infusions: (e.infusions ?? []).map((u) => itemRef(u, items)).filter((r): r is ResolvedRef => !!r),
        };
      }),
  }));
}

function buildResolvedBuilds(
  tabs: Gw2BuildTab[],
  profession: string,
  specCache: Map<number, Gw2Specialization>,
  traits: Map<number, Gw2Trait>,
  skills: Map<number, Gw2Skill>,
): ResolvedBuildTab[] {
  const skillRef = (id: number | null | undefined): ResolvedRef | null => {
    if (!id) return null;
    const s = skills.get(id);
    return s ? { name: s.name, icon: s.icon ?? null } : null;
  };
  return tabs.map((t) => {
    const specializations: ResolvedSpec[] = t.build.specializations
      .filter((s): s is { id: number; traits?: (number | null)[] } => !!s?.id)
      .map((s) => {
        const spec = specCache.get(s.id);
        return {
          id: s.id,
          name: spec?.name ?? '',
          icon: spec?.icon ?? null,
          elite: spec?.elite ?? false,
          traits: (s.traits ?? [])
            .filter((n): n is number => !!n)
            .map((n) => {
              const tr = traits.get(n);
              return tr ? { name: tr.name, icon: tr.icon ?? null } : null;
            })
            .filter((r): r is ResolvedRef => !!r),
        };
      });
    return {
      tab: t.tab,
      name: t.build.name ?? null,
      isActive: t.is_active,
      profession: t.build.profession ?? profession,
      spec: eliteSpecName(t.build.specializations, specCache),
      specializations,
      skills: {
        heal: skillRef(t.build.skills?.heal),
        utilities: (t.build.skills?.utilities ?? []).map((u) => skillRef(u)).filter((r): r is ResolvedRef => !!r),
        elite: skillRef(t.build.skills?.elite),
      },
    };
  });
}

/**
 * Wholesale-replaces this user's GW2-sourced characters (source="gw2") with a
 * fresh pull from the GW2 API — manually-added characters are untouched.
 * Alongside the character list this now also pulls every build and equipment
 * tab and resolves gear/trait/skill ids to display name + icon (server-side,
 * since /v2 is CORS-blocked), storing them on the Character for the profile's
 * hero-panel display. The `hidden` opt-out is preserved across re-syncs by
 * character name.
 */
export async function syncCharactersForUser(userId: string, apiKey: string): Promise<number> {
  const tokenInfo = await fetchTokenInfo(apiKey);
  const missing = ['characters', 'builds'].filter((p) => !tokenInfo.permissions.includes(p));
  if (missing.length > 0) {
    throw new MissingPermissionError(`This API key needs the "${missing.join('" and "')}" permission${missing.length > 1 ? 's' : ''} to sync characters.`);
  }

  const characters = await fetchCharacters(apiKey);

  const buildTabsByChar = new Map<string, Gw2BuildTab[]>();
  const equipTabsByChar = new Map<string, Gw2EquipmentTab[]>();
  const specIds = new Set<number>();
  const traitIds = new Set<number>();
  const skillIds = new Set<number>();
  const itemIds = new Set<number>();

  for (const ch of characters) {
    // Per-character try/catch: a character below the level that unlocks build/
    // equipment storage (or a transient error) shouldn't fail the whole sync.
    let bTabs: Gw2BuildTab[] = [];
    let eTabs: Gw2EquipmentTab[] = [];
    try { bTabs = await fetchCharacterBuildTabs(apiKey, ch.name); } catch { bTabs = []; }
    try { eTabs = await fetchCharacterEquipmentTabs(apiKey, ch.name); } catch { eTabs = []; }
    buildTabsByChar.set(ch.name, bTabs);
    equipTabsByChar.set(ch.name, eTabs);

    for (const tab of bTabs) {
      for (const entry of tab.build.specializations) {
        if (!entry?.id) continue;
        specIds.add(entry.id);
        for (const tr of entry.traits ?? []) if (tr) traitIds.add(tr);
      }
      if (tab.build.skills) {
        if (tab.build.skills.heal) skillIds.add(tab.build.skills.heal);
        if (tab.build.skills.elite) skillIds.add(tab.build.skills.elite);
        for (const u of tab.build.skills.utilities ?? []) if (u) skillIds.add(u);
      }
    }
    for (const tab of eTabs) {
      for (const e of tab.equipment ?? []) {
        if (e.id) itemIds.add(e.id);
        for (const u of e.upgrades ?? []) itemIds.add(u);
        for (const inf of e.infusions ?? []) itemIds.add(inf);
      }
    }
  }

  const [specCache, traitCache, skillCache, itemCache] = await Promise.all([
    resolveInBatches<Gw2Specialization>([...specIds], fetchSpecializations),
    resolveInBatches<Gw2Trait>([...traitIds], fetchTraits),
    resolveInBatches<Gw2Skill>([...skillIds], fetchSkills),
    resolveInBatches<Gw2Item>([...itemIds], fetchItems),
  ]);

  // Preserve which characters the user chose to hide across a re-sync.
  const hiddenNames = new Set(
    (await prisma.character.findMany({ where: { userId, source: 'gw2', hidden: true }, select: { name: true } })).map((c) => c.name),
  );

  await prisma.character.deleteMany({ where: { userId, source: 'gw2' } });

  for (const ch of characters) {
    const bTabs = buildTabsByChar.get(ch.name) ?? [];
    const eTabs = equipTabsByChar.get(ch.name) ?? [];
    const activeTab = bTabs.find((t) => t.is_active)?.tab ?? ch.active_build_tab ?? bTabs[0]?.tab ?? 1;

    const resolvedBuilds = buildResolvedBuilds(bTabs, ch.profession, specCache, traitCache, skillCache);
    const resolvedEquip = buildResolvedEquipment(eTabs, itemCache);

    const character = await prisma.character.create({
      data: {
        userId,
        name: ch.name,
        profession: ch.profession,
        race: ch.race,
        level: ch.level,
        source: 'gw2',
        extId: ch.name,
        activeTab,
        hidden: hiddenNames.has(ch.name),
        buildTabs: resolvedBuilds as unknown as object,
        equipmentTabs: resolvedEquip as unknown as object,
      },
    });

    for (const tab of resolvedBuilds) {
      await prisma.characterTemplate.create({
        data: {
          characterId: character.id,
          tab: tab.tab,
          name: tab.name,
          spec: tab.spec,
          isActive: tab.isActive,
        },
      });
    }
  }

  return characters.length;
}
