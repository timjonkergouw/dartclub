export interface Profile {
  id: number;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface DartStat {
  id: string;
  game_id: string;
  player_id: number;
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

export const DEMO_PLAYERS: Profile[] = [
  {
    id: 1,
    username: "Tim",
    avatar_url: null,
    created_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    username: "Jeroen",
    avatar_url: null,
    created_at: "2024-01-01T00:00:00.000Z",
  },
];

const DEMO_STATS: Record<number, DartStat[]> = {
  1: [
    {
      id: "demo-tim-1",
      game_id: "demo-game-1",
      player_id: 1,
      three_dart_avg: 72.5,
      first9_avg: 85.3,
      finish: 100,
      highest_finish: 120,
      doubles_hit: 8,
      doubles_thrown: 14,
      checkout_percentage: 57.1,
      double_percentage: 57.1,
      highest_score: 140,
      one_eighties: 2,
      scores_140_plus: 3,
      scores_100_plus: 8,
      scores_80_plus: 12,
      total_turns: 24,
      total_darts: 72,
      leg_darts: [18, 21, 15],
      best_leg: 15,
      worst_leg: 21,
      legs_played: 3,
      created_at: "2024-06-01T12:00:00.000Z",
    },
  ],
  2: [
    {
      id: "demo-jeroen-1",
      game_id: "demo-game-1",
      player_id: 2,
      three_dart_avg: 68.2,
      first9_avg: 78.6,
      finish: 80,
      highest_finish: 100,
      doubles_hit: 6,
      doubles_thrown: 12,
      checkout_percentage: 50,
      double_percentage: 50,
      highest_score: 125,
      one_eighties: 1,
      scores_140_plus: 1,
      scores_100_plus: 5,
      scores_80_plus: 10,
      total_turns: 26,
      total_darts: 78,
      leg_darts: [20, 19, 17],
      best_leg: 17,
      worst_leg: 20,
      legs_played: 3,
      created_at: "2024-06-01T12:00:00.000Z",
    },
  ],
};

export function getDemoPlayers(): Profile[] {
  return DEMO_PLAYERS;
}

export function getDemoStats(playerId: number): DartStat[] {
  return DEMO_STATS[playerId] ?? [];
}
