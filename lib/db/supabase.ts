import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { DatabaseAdapter, DartStat, Profile } from "./types";

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as number,
    username: row.username as string,
    avatar_url: (row.avatar_url as string | null) ?? null,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
  };
}

export const supabaseDb: DatabaseAdapter = {
  async getProfiles() {
    const { data, error } = await getSupabaseAdmin()
      .from("profiles")
      .select("*")
      .order("username", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(mapProfile);
  },

  async getProfileByUsername(username, excludeId) {
    const { data, error } = await getSupabaseAdmin()
      .from("profiles")
      .select("*");

    if (error) throw new Error(error.message);

    const normalized = username.trim().toLowerCase();
    const match = (data ?? []).find(
      (p) =>
        (p.username as string).trim().toLowerCase() === normalized &&
        (excludeId === undefined || (p.id as number) !== excludeId)
    );
    return match ? mapProfile(match) : null;
  },

  async createProfile(username, avatar_url = null) {
    const { data, error } = await getSupabaseAdmin()
      .from("profiles")
      .insert({ username: username.trim(), avatar_url })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapProfile(data);
  },

  async updateProfile(id, updates) {
    const payload: Record<string, string | null> = {};
    if (updates.username !== undefined) payload.username = updates.username.trim();
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;

    const { data, error } = await getSupabaseAdmin()
      .from("profiles")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapProfile(data);
  },

  async deleteProfile(id) {
    const supabase = getSupabaseAdmin();

    const { data: gamesData, error: gamesFetchError } = await supabase
      .from("games")
      .select("id")
      .eq("profile_id", id);

    if (gamesFetchError) throw new Error(gamesFetchError.message);

    const gameIds = (gamesData ?? []).map((g) => g.id as string);

    if (gameIds.length > 0) {
      const { error: statsError } = await supabase
        .from("dart_stats")
        .delete()
        .in("game_id", gameIds);
      if (statsError) throw new Error(statsError.message);

      const { error: gamesError } = await supabase
        .from("games")
        .delete()
        .eq("profile_id", id);
      if (gamesError) throw new Error(gamesError.message);
    }

    const { error: statsByPlayerError } = await supabase
      .from("dart_stats")
      .delete()
      .eq("player_id", id);
    if (statsByPlayerError) throw new Error(statsByPlayerError.message);

    const { data, error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id)
      .select();

    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  },

  async createGame(profile_id, ended_at) {
    const { data, error } = await getSupabaseAdmin()
      .from("games")
      .insert({ profile_id, ended_at })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id as string,
      profile_id: data.profile_id as number,
      ended_at: data.ended_at as string,
      created_at: (data.created_at as string) ?? new Date().toISOString(),
    };
  },

  async getDartStatsByPlayer(playerId) {
    const { data, error } = await getSupabaseAdmin()
      .from("dart_stats")
      .select("*")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as DartStat[];
  },

  async dartStatExists(game_id, player_id) {
    const { data, error } = await getSupabaseAdmin()
      .from("dart_stats")
      .select("id")
      .eq("game_id", game_id)
      .eq("player_id", player_id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return !!data;
  },

  async createDartStat(data) {
    const { data: row, error } = await getSupabaseAdmin()
      .from("dart_stats")
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return row as DartStat;
  },

  async uploadAvatar(file, filename) {
    const filePath = `avatars/${filename}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await getSupabaseAdmin()
      .storage.from("profiles")
      .upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = getSupabaseAdmin().storage.from("profiles").getPublicUrl(filePath);
    return data.publicUrl;
  },
};
