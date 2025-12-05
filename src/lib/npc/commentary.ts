type Tone = 'calm' | 'enthusiastic' | 'critical' | 'dramatic';

export interface CommentaryEvent {
  t: number; // ms
  kind: string; // shot|goal|save|foul|card|offside|var_decision|chance
  team?: 'home' | 'away';
  player?: string;
  meta?: Record<string, any>;
}

export function chooseTone(intensity: number): Tone {
  if (intensity >= 0.8) return 'dramatic';
  if (intensity >= 0.6) return 'enthusiastic';
  if (intensity <= 0.25) return 'calm';
  return 'critical';
}

export function generateCommentaryLines(
  timeline: CommentaryEvent[],
  lang: string = process.env.COMMENTARY_LANG || 'id'
): Array<{ ts_ms: number; tone: Tone; text: string; meta: any }> {
  // Minimal placeholder; real generator should map kinds + context to localized lines
  const lines: Array<{ ts_ms: number; tone: Tone; text: string; meta: any }> = [];
  for (const e of timeline) {
    const intensity = e.kind === 'goal' ? 0.9 : e.kind === 'chance' ? 0.7 : e.kind === 'foul' ? 0.4 : 0.5;
    const tone = chooseTone(intensity);
    const who = e.player ? `${e.player}` : (e.team ? (e.team === 'home' ? 'Tuan rumah' : 'Tim tamu') : '');
    const base =
      e.kind === 'goal' ? `${who} mencetak gol!` :
      e.kind === 'shot' ? `${who} melepaskan tembakan.` :
      e.kind === 'save' ? `Penyelamatan gemilang kiper!` :
      e.kind === 'foul' ? `Pelanggaran terjadi.` :
      e.kind === 'card' ? `Kartu dikeluarkan wasit.` :
      e.kind === 'offside' ? `Bendera hakim garis terangkat: offside.` :
      e.kind === 'var_decision' ? `Keputusan VAR diumumkan.` :
      `Momen penting berlangsung.`;
    lines.push({ ts_ms: e.t, tone, text: base, meta: { kind: e.kind, lang } });
  }
  return lines;
}
