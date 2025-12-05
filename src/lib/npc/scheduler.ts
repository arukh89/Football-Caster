export function nextDecision(nowMs: number, baseMs: number, pressure: number): number {
  // Higher pressure -> act sooner
  const factor = Math.max(0.5, 1.0 - pressure / 200);
  return nowMs + Math.floor(baseMs * factor);
}
