import { prisma } from '../db.js';
import {
  fetchCharacterBuildTabs,
  fetchCharacters,
  fetchSpecializations,
  fetchTokenInfo,
  type Gw2BuildTab,
  type Gw2Specialization,
} from './gw2Api.js';

export class MissingPermissionError extends Error {}

// Batched to stay under the GW2 API's ids-list length limit for this
// endpoint (documented at 200; leave headroom).
const SPEC_BATCH_SIZE = 180;

function eliteSpecName(tab: Gw2BuildTab, specCache: Map<number, Gw2Specialization>): string | null {
  for (const entry of tab.build.specializations) {
    if (!entry?.id) continue;
    const spec = specCache.get(entry.id);
    if (spec?.elite) return spec.name;
  }
  return null;
}

/**
 * Wholesale-replaces this user's GW2-sourced characters (source="gw2")
 * with a fresh pull from the GW2 API — manually-added characters
 * (source="manual") are untouched. Elite spec per build tab is resolved
 * from the tab's actual equipped trait lines via /v2/specializations
 * (whichever equipped line has elite:true), not a hardcoded id table,
 * since GW2 patches can renumber or add specializations.
 */
export async function syncCharactersForUser(userId: string, apiKey: string): Promise<number> {
  const tokenInfo = await fetchTokenInfo(apiKey);
  const missing = ['characters', 'builds'].filter((p) => !tokenInfo.permissions.includes(p));
  if (missing.length > 0) {
    throw new MissingPermissionError(`This API key needs the "${missing.join('" and "')}" permission${missing.length > 1 ? 's' : ''} to sync characters.`);
  }

  const characters = await fetchCharacters(apiKey);

  const buildTabsByChar = new Map<string, Gw2BuildTab[]>();
  const specIds = new Set<number>();
  for (const ch of characters) {
    let tabs: Gw2BuildTab[] = [];
    try {
      tabs = await fetchCharacterBuildTabs(apiKey, ch.name);
    } catch {
      // Some characters (e.g. below the level that unlocks build storage)
      // may not have build tabs available — degrade to no templates for
      // that one character rather than failing the whole sync.
      tabs = [];
    }
    buildTabsByChar.set(ch.name, tabs);
    for (const tab of tabs) {
      for (const entry of tab.build.specializations) {
        if (entry?.id) specIds.add(entry.id);
      }
    }
  }

  const specCache = new Map<number, Gw2Specialization>();
  const idList = [...specIds];
  for (let i = 0; i < idList.length; i += SPEC_BATCH_SIZE) {
    const batch = idList.slice(i, i + SPEC_BATCH_SIZE);
    const specs = await fetchSpecializations(batch);
    for (const spec of specs) specCache.set(spec.id, spec);
  }

  await prisma.character.deleteMany({ where: { userId, source: 'gw2' } });

  for (const ch of characters) {
    const tabs = buildTabsByChar.get(ch.name) ?? [];
    const activeTab = tabs.find((t) => t.is_active)?.tab ?? ch.active_build_tab ?? tabs[0]?.tab ?? 1;

    const character = await prisma.character.create({
      data: {
        userId,
        name: ch.name,
        profession: ch.profession,
        race: `Level ${ch.level} ${ch.race}`,
        source: 'gw2',
        extId: ch.name,
        activeTab,
      },
    });

    for (const tab of tabs) {
      await prisma.characterTemplate.create({
        data: {
          characterId: character.id,
          tab: tab.tab,
          name: tab.build.name ?? null,
          spec: eliteSpecName(tab, specCache),
          isActive: tab.is_active,
        },
      });
    }
  }

  return characters.length;
}
