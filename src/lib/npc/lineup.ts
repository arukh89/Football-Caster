export type Formation = '4-3-3' | '4-2-3-1' | '4-4-2' | '3-5-2';

export function chooseFormation(intelligence: number): Formation {
  if (intelligence >= 85) return '4-2-3-1';
  if (intelligence >= 75) return '4-3-3';
  if (intelligence >= 65) return '3-5-2';
  return '4-4-2';
}

export function pickStartingXI(players: any[]): any[] {
  // TODO: pick XI by position, rating, fatigue, morale, injury
  return players.slice(0, 11);
}
