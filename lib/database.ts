import { localDb } from "@/lib/db/local";
import { supabaseDb } from "@/lib/db/supabase";
import { DEFAULT_PLAYER_NAMES } from "@/lib/db/defaults";
import { isSupabaseConfigured } from "@/lib/supabase-server";
import type { Profile, Game, DartStat } from "@/lib/db/types";

export type { Profile, Game, DartStat };
export { DEFAULT_PLAYER_NAMES, isDefaultPlayer } from "@/lib/db/defaults";

function db() {
  return isSupabaseConfigured() ? supabaseDb : localDb;
}

export function getDatabaseMode(): "supabase" | "local" {
  return isSupabaseConfigured() ? "supabase" : "local";
}

async function ensureDefaultPlayers(): Promise<void> {
  const adapter = db();
  for (const username of DEFAULT_PLAYER_NAMES) {
    const existing = await adapter.getProfileByUsername(username);
    if (!existing) {
      await adapter.createProfile(username);
    }
  }
}

export async function getProfiles(): Promise<Profile[]> {
  await ensureDefaultPlayers();
  return db().getProfiles();
}

export const getProfileByUsername = (username: string, excludeId?: number) =>
  db().getProfileByUsername(username, excludeId);
export const createProfile = (username: string, avatar_url?: string | null) =>
  db().createProfile(username, avatar_url);
export const updateProfile = (
  id: number,
  updates: { username?: string; avatar_url?: string | null }
) => db().updateProfile(id, updates);
export const deleteProfile = (id: number) => db().deleteProfile(id);
export const createGame = (profile_id: number, ended_at: string) =>
  db().createGame(profile_id, ended_at);
export const getDartStatsByPlayer = (playerId: number) =>
  db().getDartStatsByPlayer(playerId);
export const dartStatExists = (game_id: string, player_id: number) =>
  db().dartStatExists(game_id, player_id);
export const createDartStat = (
  data: Record<string, string | number | boolean | number[] | null>
) => db().createDartStat(data);
export const uploadAvatar = (file: Blob, filename: string) =>
  db().uploadAvatar(file, filename);
