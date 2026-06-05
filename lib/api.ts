export type { Profile, DartStat } from "@/lib/players";
export { DEMO_PLAYERS, getDemoPlayers } from "@/lib/players";
import { getDemoPlayers, getDemoStats } from "@/lib/players";
import type { Profile, DartStat } from "@/lib/players";

export async function fetchProfiles(): Promise<Profile[]> {
  return getDemoPlayers();
}

export async function fetchDartStatsByPlayer(
  playerId: number | string
): Promise<DartStat[]> {
  return getDemoStats(Number(playerId));
}
