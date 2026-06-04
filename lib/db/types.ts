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

export interface DatabaseAdapter {
  getProfiles(): Promise<Profile[]>;
  getProfileByUsername(username: string, excludeId?: number): Promise<Profile | null>;
  createProfile(username: string, avatar_url?: string | null): Promise<Profile>;
  updateProfile(
    id: number,
    updates: { username?: string; avatar_url?: string | null }
  ): Promise<Profile | null>;
  deleteProfile(id: number): Promise<boolean>;
  createGame(profile_id: number, ended_at: string): Promise<Game>;
  getDartStatsByPlayer(playerId: number): Promise<DartStat[]>;
  dartStatExists(game_id: string, player_id: number): Promise<boolean>;
  createDartStat(
    data: Record<string, string | number | boolean | number[] | null>
  ): Promise<DartStat>;
  uploadAvatar(file: Blob, filename: string): Promise<string>;
}
