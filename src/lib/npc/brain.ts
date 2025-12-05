export type NpcContext = { npc: any };
export type SquadContext = { squad: any };

export async function executeNpcTick(_ctx: NpcContext): Promise<void> {
  // TODO: implement lineup, market, and pvp strategies
}

export async function executeSquadTick(_ctx: SquadContext): Promise<void> {
  // TODO: smarter than global NPCs
}
