// Name masking for the "Hide my name" privacy setting. A user with
// hideName set has their account/character names replaced with ANON_NAME
// everywhere a log surfaces them (leaderboards, benchmarks, log squad
// tables), while their parse numbers still show. A viewer always sees their
// OWN rows unmasked — hiding is about other people, not yourself.

export const ANON_NAME = 'Anonymous';

export interface MaskedIdentity {
  name: string;
  account: string | null;
  hidden: boolean;
}

// hidden: the row's linked user has hideName set.
// viewerUserId / rowUserId: unmask when the viewer owns the row.
export function maskIdentity(
  name: string,
  account: string,
  hidden: boolean,
  rowUserId: string | null,
  viewerUserId: string | null | undefined,
): MaskedIdentity {
  const isSelf = viewerUserId != null && rowUserId != null && viewerUserId === rowUserId;
  if (!hidden || isSelf) return { name, account, hidden: false };
  // account null so the frontend renders plain text instead of a profile
  // link (a link would leak the real account in its href).
  return { name: ANON_NAME, account: null, hidden: true };
}
