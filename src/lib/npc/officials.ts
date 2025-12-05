export type OfficialRole = 'referee' | 'assistant_left' | 'assistant_right' | 'var';

export interface OfficialModel {
  officialId: string;
  role: OfficialRole;
  strictness: number; // 0..100
  advantageTendency: number; // 0..100
  offsideTolerance: number; // 0..100 (higher -> more tolerance -> fewer flags)
  varPropensity: number; // 0..100
  consistency: number; // 0..100 (higher -> less variance between decisions)
  fitness: number; // 0..100
  reputation: number; // 0..100
  aiSeed: number;
  active: boolean;
  lastAssignedMs: number;
}

export interface CrewAssignment {
  referee: OfficialModel;
  assistantLeft: OfficialModel;
  assistantRight: OfficialModel;
  varOfficial?: OfficialModel | null;
}

export function chooseOfficialsForMatch(
  pool: OfficialModel[],
  nowMs: number,
  useVar: boolean,
): CrewAssignment | null {
  const active = pool.filter((o) => o.active);
  if (active.length < (useVar ? 4 : 3)) return null;
  const byRole = (r: OfficialRole) => active
    .filter((o) => o.role === r)
    .sort((a, b) => (a.lastAssignedMs - b.lastAssignedMs) || (b.fitness - a.fitness));
  const ref = byRole('referee')[0];
  const aL = byRole('assistant_left')[0];
  const aR = byRole('assistant_right')[0];
  const v = useVar ? byRole('var')[0] : null;
  if (!ref || !aL || !aR) return null;
  return { referee: ref, assistantLeft: aL, assistantRight: aR, varOfficial: v };
}

// Heuristics that engine can use to modulate events
export function foulProbability(ref: OfficialModel): number {
  // Higher strictness -> more fouls
  return 0.04 + ref.strictness / 2000; // ~0.04..0.09 per minute baseline
}

export function cardSeverityFactor(ref: OfficialModel): number {
  // Strictness and reputation increase severity
  return 1.0 + (ref.strictness + ref.reputation) / 200; // 1.0..2.0
}

export function offsideNoise(assistant: OfficialModel): number {
  // Lower consistency and lower offsideTolerance -> more erroneous flags
  const tol = assistant.offsideTolerance / 100;
  const inconsistency = 1 - assistant.consistency / 100;
  return Math.max(0, 0.02 + 0.08 * (inconsistency + (1 - tol)) / 2); // 0.02..0.10
}

export function varReviewChance(v: OfficialModel | null): number {
  if (!v) return 0;
  return 0.05 + v.varPropensity / 200; // 0.05..0.55 per key event
}
