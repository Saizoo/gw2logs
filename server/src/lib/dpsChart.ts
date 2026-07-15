export interface DpsChartPoint {
  timeMs: number;
  dps: number;
}

// Best-effort only: our Elite Insights invocation (see ei-settings.conf)
// doesn't explicitly request combat-replay/detailed output, and I couldn't
// verify against a live source whether the config option that would enable
// a genuine per-second squad DPS series even applies here — guessing wrong
// on an unverified CLI/config flag risks breaking the whole upload pipeline,
// a much bigger blast radius than a missing chart. So this only reads
// fields that might already be present in whatever Elite Insights produced,
// validates the shape, and returns null (never fabricated data) if nothing
// plausible is found — which will likely be true for most logs until the
// actual field name is confirmed against a real detailed-output log.
export function extractDpsOverTime(raw: Record<string, any>): DpsChartPoint[] | null {
  const candidatePaths: unknown[] = [
    raw?.targets?.[0]?.combatReplayData?.dpsAll,
    raw?.Targets?.[0]?.CombatReplayData?.DpsAll,
    raw?.targets?.[0]?.combatReplayData?.dps,
    raw?.Targets?.[0]?.CombatReplayData?.Dps,
  ];

  for (const candidate of candidatePaths) {
    const points = parseTimeSeries(candidate);
    if (points && points.length > 1) return points;
  }

  return null;
}

function parseTimeSeries(candidate: unknown): DpsChartPoint[] | null {
  if (!Array.isArray(candidate)) return null;
  const points: DpsChartPoint[] = [];
  for (const entry of candidate) {
    if (Array.isArray(entry) && entry.length >= 2 && typeof entry[0] === 'number' && typeof entry[1] === 'number') {
      points.push({ timeMs: entry[0], dps: entry[1] });
    } else {
      return null; // one malformed entry means this isn't the shape we expect
    }
  }
  return points;
}
