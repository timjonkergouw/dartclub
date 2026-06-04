export interface Profile {
  id: number;
  username: string;
  avatar_url?: string | null;
  created_at?: string;
}

export interface DartStat {
  id: string;
  game_id: string;
  player_id: number | string;
  three_dart_avg: number | null;
  first9_avg: number | null;
  finish: number | null;
  highest_finish: number | null;
  doubles_hit: number | null;
  doubles_thrown: number | null;
  checkout_percentage: number | null;
  double_percentage: number | null;
  highest_score: number | null;
  one_eighties: number | null;
  scores_140_plus: number | null;
  scores_100_plus: number | null;
  scores_80_plus: number | null;
  total_turns: number | null;
  total_darts: number | null;
  leg_darts: number[] | null;
  best_leg: number | null;
  worst_leg: number | null;
  legs_played: number | null;
  created_at: string;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Er is iets misgegaan");
  }
  return data as T;
}

export async function fetchProfiles(): Promise<Profile[]> {
  const res = await fetch("/api/profiles");
  const data = await parseJson<{ profiles: Profile[] }>(res);
  return data.profiles;
}

export async function createProfile(
  username: string,
  avatar_url?: string | null
): Promise<Profile> {
  const res = await fetch("/api/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, avatar_url }),
  });
  const data = await parseJson<{ profile: Profile }>(res);
  return data.profile;
}

export async function updateProfile(
  id: number,
  updates: { username?: string; avatar_url?: string | null }
): Promise<void> {
  const res = await fetch(`/api/profiles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  await parseJson(res);
}

export async function deleteProfile(id: number): Promise<void> {
  const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
  await parseJson(res);
}

export async function usernameExists(
  username: string,
  excludeId?: number
): Promise<boolean> {
  const params = new URLSearchParams({ username });
  if (excludeId !== undefined) params.set("excludeId", String(excludeId));
  const res = await fetch(`/api/profiles/check?${params}`);
  const data = await parseJson<{ exists: boolean }>(res);
  return data.exists;
}

export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/avatars", { method: "POST", body: form });
  const data = await parseJson<{ url: string }>(res);
  return data.url;
}

export async function createGame(
  profile_id: number,
  ended_at: string
): Promise<{ id: string }> {
  const res = await fetch("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile_id, ended_at }),
  });
  return parseJson<{ id: string }>(res);
}

export async function fetchDartStatsByPlayer(
  playerId: number | string
): Promise<DartStat[]> {
  const res = await fetch(`/api/dart-stats?player_id=${playerId}`);
  const data = await parseJson<{ stats: DartStat[] }>(res);
  return data.stats;
}

export async function dartStatExists(
  game_id: string,
  player_id: number
): Promise<boolean> {
  const params = new URLSearchParams({
    game_id,
    player_id: String(player_id),
    check: "1",
  });
  const res = await fetch(`/api/dart-stats?${params}`);
  const data = await parseJson<{ exists: boolean }>(res);
  return data.exists;
}

export async function createDartStat(
  data: Record<string, string | number | boolean | number[] | null>
): Promise<void> {
  const res = await fetch("/api/dart-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await parseJson(res);
}
