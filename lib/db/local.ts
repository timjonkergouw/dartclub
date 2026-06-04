import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { DEFAULT_PLAYER_NAMES } from "./defaults";
import type { DatabaseAdapter, DartStat, Game, Profile } from "./types";

interface DbSchema {
  profiles: Profile[];
  games: Game[];
  dart_stats: DartStat[];
  nextProfileId: number;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");
const AVATAR_DIR = path.join(process.cwd(), "public", "avatars");

function createDefaultProfiles(): Profile[] {
  const now = new Date().toISOString();
  return DEFAULT_PLAYER_NAMES.map((username, index) => ({
    id: index + 1,
    username,
    avatar_url: null,
    created_at: now,
  }));
}

const emptyDb = (): DbSchema => ({
  profiles: createDefaultProfiles(),
  games: [],
  dart_stats: [],
  nextProfileId: DEFAULT_PLAYER_NAMES.length + 1,
});

async function ensureDb(): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(emptyDb(), null, 2), "utf-8");
  }
}

async function readDb(): Promise<DbSchema> {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw) as DbSchema;
}

async function writeDb(db: DbSchema): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export const localDb: DatabaseAdapter = {
  async getProfiles() {
    const db = await readDb();
    return [...db.profiles].sort((a, b) => a.username.localeCompare(b.username));
  },

  async getProfileByUsername(username, excludeId) {
    const db = await readDb();
    const normalized = username.trim().toLowerCase();
    return (
      db.profiles.find(
        (p) =>
          p.username.trim().toLowerCase() === normalized &&
          (excludeId === undefined || p.id !== excludeId)
      ) ?? null
    );
  },

  async createProfile(username, avatar_url = null) {
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
  },

  async updateProfile(id, updates) {
    const db = await readDb();
    const profile = db.profiles.find((p) => p.id === id);
    if (!profile) return null;
    if (updates.username !== undefined) profile.username = updates.username.trim();
    if (updates.avatar_url !== undefined) profile.avatar_url = updates.avatar_url;
    await writeDb(db);
    return profile;
  },

  async deleteProfile(id) {
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
  },

  async createGame(profile_id, ended_at) {
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
  },

  async getDartStatsByPlayer(playerId) {
    const db = await readDb();
    return db.dart_stats
      .filter((s) => s.player_id === playerId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  },

  async dartStatExists(game_id, player_id) {
    const db = await readDb();
    return db.dart_stats.some(
      (s) => s.game_id === game_id && s.player_id === player_id
    );
  },

  async createDartStat(data) {
    const db = await readDb();
    const stat: DartStat = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      ...data,
    } as DartStat;
    db.dart_stats.push(stat);
    await writeDb(db);
    return stat;
  },

  async uploadAvatar(file, filename) {
    await fs.mkdir(AVATAR_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(AVATAR_DIR, filename), buffer);
    return `/avatars/${filename}`;
  },
};
