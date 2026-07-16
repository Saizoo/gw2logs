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

// /v2/account also carries the account's guild memberships. `guilds` comes
// with the basic account scope; `guild_leader` (guilds this account leads)
// only appears when the key has the "guilds" permission — treat a missing
// field as "unknown", not "leads nothing".
export interface Gw2AccountGuilds extends Gw2Account {
  guilds?: string[];
  guild_leader?: string[];
}

export function fetchAccountGuilds(apiKey: string): Promise<Gw2AccountGuilds> {
  return gw2Fetch<Gw2AccountGuilds>('/account', apiKey);
}

// Public endpoint: id/name/tag need no authorization.
export interface Gw2GuildInfo {
  id: string;
  name: string;
  tag: string;
}

export function fetchGuildInfo(guildId: string): Promise<Gw2GuildInfo> {
  return gw2Fetch<Gw2GuildInfo>(`/guild/${encodeURIComponent(guildId)}`);
}

// Members and ranks are restricted by the GW2 API to keys belonging to the
// in-game guild leader (with the "guilds" permission) — any other key gets
// a 403 here. Callers are expected to try candidate keys and fall back.
export interface Gw2GuildMember {
  name: string; // account name, "Name.1234"
  rank: string; // rank name, matches Gw2GuildRank.id
  joined: string | null;
}

export interface Gw2GuildRank {
  id: string; // rank name
  order: number; // 1 = leader rank, ascending = less authority
  permissions: string[];
}

export function fetchGuildMembers(guildId: string, apiKey: string): Promise<Gw2GuildMember[]> {
  return gw2Fetch<Gw2GuildMember[]>(`/guild/${encodeURIComponent(guildId)}/members`, apiKey);
}

export function fetchGuildRanks(guildId: string, apiKey: string): Promise<Gw2GuildRank[]> {
  return gw2Fetch<Gw2GuildRank[]>(`/guild/${encodeURIComponent(guildId)}/ranks`, apiKey);
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
