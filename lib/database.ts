import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface Profile {
  id: number;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Game {
  id: string;
  profile_id: number;
  ended_at: string;
  created_at: string;
}

export interface DartStat {
  id: string;
  game_id: string;
  player_id: number;
  created_at: string;
  [key: string]: string | number | boolean | number[] | null | undefined;
}

interface DbSchema {
  profiles: Profile[];
  games: Game[];
  dart_stats: DartStat[];
  nextProfileId: number;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

const emptyDb = (): DbSchema => ({
  profiles: [],
  games: [],
  dart_stats: [],
  nextProfileId: 1,
});

async function ensureDb(): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(emptyDb(), null, 2), "utf-8");
  }
}

export async function readDb(): Promise<DbSchema> {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw) as DbSchema;
}

export async function writeDb(db: DbSchema): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export async function getProfiles(): Promise<Profile[]> {
  const db = await readDb();
  return [...db.profiles].sort((a, b) => a.username.localeCompare(b.username));
}

export async function getProfileByUsername(
  username: string,
  excludeId?: number
): Promise<Profile | null> {
  const db = await readDb();
  const normalized = username.trim().toLowerCase();
  return (
    db.profiles.find(
      (p) =>
        p.username.trim().toLowerCase() === normalized &&
        (excludeId === undefined || p.id !== excludeId)
    ) ?? null
  );
}

export async function createProfile(
  username: string,
  avatar_url: string | null = null
): Promise<Profile> {
  const db = await readDb();
  const profile: Profile = {
    id: db.nextProfileId++,
    username: username.trim(),
    avatar_url,
    created_at: new Date().toISOString(),
  };
  db.profiles.push(profile);
  await writeDb(db);
  return profile;
}

export async function updateProfile(
  id: number,
  updates: { username?: string; avatar_url?: string | null }
): Promise<Profile | null> {
  const db = await readDb();
  const profile = db.profiles.find((p) => p.id === id);
  if (!profile) return null;
  if (updates.username !== undefined) profile.username = updates.username.trim();
  if (updates.avatar_url !== undefined) profile.avatar_url = updates.avatar_url;
  await writeDb(db);
  return profile;
}

export async function deleteProfile(id: number): Promise<boolean> {
  const db = await readDb();
  const gameIds = db.games.filter((g) => g.profile_id === id).map((g) => g.id);
  db.dart_stats = db.dart_stats.filter(
    (s) => !gameIds.includes(s.game_id) && s.player_id !== id
  );
  db.games = db.games.filter((g) => g.profile_id !== id);
  const before = db.profiles.length;
  db.profiles = db.profiles.filter((p) => p.id !== id);
  if (db.profiles.length === before) return false;
  await writeDb(db);
  return true;
}

export async function createGame(
  profile_id: number,
  ended_at: string
): Promise<Game> {
  const db = await readDb();
  const game: Game = {
    id: randomUUID(),
    profile_id,
    ended_at,
    created_at: new Date().toISOString(),
  };
  db.games.push(game);
  await writeDb(db);
  return game;
}

export async function getDartStatsByPlayer(playerId: number): Promise<DartStat[]> {
  const db = await readDb();
  return db.dart_stats
    .filter((s) => s.player_id === playerId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function dartStatExists(
  game_id: string,
  player_id: number
): Promise<boolean> {
  const db = await readDb();
  return db.dart_stats.some(
    (s) => s.game_id === game_id && s.player_id === player_id
  );
}

export async function createDartStat(
  data: Record<string, string | number | boolean | number[] | null>
): Promise<DartStat> {
  const db = await readDb();
  const stat: DartStat = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    ...data,
  } as DartStat;
  db.dart_stats.push(stat);
  await writeDb(db);
  return stat;
}
