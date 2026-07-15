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
  guilds?: string[];
  guild_leader?: string[];
}

export interface Gw2Guild {
  id: string;
  name: string;
  tag: string;
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

export function fetchGuild(guildId: string): Promise<Gw2Guild> {
  return gw2Fetch<Gw2Guild>(`/guild/${guildId}`);
}
