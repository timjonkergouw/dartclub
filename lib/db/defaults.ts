export const DEFAULT_PLAYER_NAMES = ["Tim", "Jeroen"] as const;

export function isDefaultPlayer(username: string): boolean {
  const normalized = username.trim().toLowerCase();
  return DEFAULT_PLAYER_NAMES.some((name) => name.toLowerCase() === normalized);
}
