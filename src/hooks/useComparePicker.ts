import { useState } from 'react';

export interface CompareCandidate {
  logId: string;
  account: string;
  label: string;
}

function sameCandidate(a: CompareCandidate, b: CompareCandidate): boolean {
  return a.logId === b.logId && a.account === b.account;
}

// Shared "pick two, then compare" selection state for the Leaderboard and
// Fight Report Squad tab — selecting a third candidate drops the oldest one
// rather than refusing the click, so the picker never needs an explicit
// "deselect this one first" step.
export function useComparePicker() {
  const [selected, setSelected] = useState<CompareCandidate[]>([]);

  function toggle(candidate: CompareCandidate) {
    setSelected((prev) => {
      if (prev.some((c) => sameCandidate(c, candidate))) return prev.filter((c) => !sameCandidate(c, candidate));
      if (prev.length >= 2) return [prev[1], candidate];
      return [...prev, candidate];
    });
  }

  function isSelected(candidate: CompareCandidate): boolean {
    return selected.some((c) => sameCandidate(c, candidate));
  }

  function clear() {
    setSelected([]);
  }

  return { selected, toggle, isSelected, clear };
}
