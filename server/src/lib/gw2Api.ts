const GW2_API = 'https://api.guildwars2.com/v2';

export interface Gw2TokenInfo {
  id: string;
  name: string;
  permissions: string[];
}

export interface Gw2Account {
  id: string;
  name: string;
  world: number;
}

export interface Gw2Character {
  name: string;
  race: string;
  gender: string;
  profession: string;
  level: number;
  age: number;
  created: string;
  deaths: number;
  active_build_tab?: number;
}

export interface Gw2BuildTab {
  tab: number;
  is_active: boolean;
  build: {
    name?: string;
    specializations: ({ id: number } | null)[];
  };
}

export interface Gw2Specialization {
  id: number;
  name: string;
  elite: boolean;
}

async function gw2Fetch<T>(path: string, apiKey?: string): Promise<T> {
  const res = await fetch(`${GW2_API}${path}`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GW2 API ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export function fetchTokenInfo(apiKey: string): Promise<Gw2TokenInfo> {
  return gw2Fetch<Gw2TokenInfo>('/tokeninfo', apiKey);
}

export function fetchAccount(apiKey: string): Promise<Gw2Account> {
  return gw2Fetch<Gw2Account>('/account', apiKey);
}

export function fetchCharacters(apiKey: string): Promise<Gw2Character[]> {
  return gw2Fetch<Gw2Character[]>('/characters?ids=all', apiKey);
}

export function fetchCharacterBuildTabs(apiKey: string, characterName: string): Promise<Gw2BuildTab[]> {
  return gw2Fetch<Gw2BuildTab[]>(`/characters/${encodeURIComponent(characterName)}/buildtabs?tabs=all`, apiKey);
}

// Batched per the GW2 API's ids-list length limit (200); callers pass at
// most that many ids per call.
export function fetchSpecializations(ids: number[]): Promise<Gw2Specialization[]> {
  return gw2Fetch<Gw2Specialization[]>(`/specializations?ids=${ids.join(',')}`);
}
