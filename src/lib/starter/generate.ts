import { randomUUID } from 'crypto';

export type StarterPlayer = { player_id: string; name: string | null; position: string | null; rating: number };

/**
 * Generate a normalized starter pack of 18 players compatible with Spacetime reducers
 */
export function generateStarterPack(): StarterPlayer[] {
  const players: StarterPlayer[] = [];
  for (let i = 0; i < 18; i++) {
    players.push({
      player_id: `player-${randomUUID()}`,
      name: null,
      position: null,
      rating: Math.floor(Math.random() * 30) + 60,
    });
  }
  return players;
}

/**
 * UI-friendly pack mapping used by some callers
 */
export function toUiPack(players: StarterPlayer[]): Array<{ itemId: string; itemType: 'player'; rating: number }> {
  return players.map((p) => ({ itemId: p.player_id, itemType: 'player', rating: p.rating }));
}
