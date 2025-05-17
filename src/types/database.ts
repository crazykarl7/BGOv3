export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  name: string;
  min_players: number;
  max_players: number;
  weight: number;
  description: string | null;
  bgg_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  games?: Game[];
  locked_at?: string | null;
}

export interface Olympic {
  id: string;
  name: string;
  description: string | null;
  date: string;
  registration_deadline: string;
  created_at: string;
  updated_at: string;
  events?: Event[];
  players?: Profile[];
}

export interface GameScore {
  id: string;
  olympic_id: string;
  event_id: string;
  game_id: string;
  player_id: string;
  score: number;
  points: number;
  medal?: 'gold' | 'silver' | 'bronze';
  created_at: string;
  updated_at: string;
  player?: Profile;
  game?: Game;
}

export interface Team {
  id: string;
  name: string;
  olympic_id: string;
  created_at: string;
  created_by: string;
  members?: TeamMember[];
  assignments?: TeamEventAssignment[];
}

export interface TeamMember {
  team_id: string;
  player_id: string;
  joined_at: string;
  player?: Profile;
}

export interface TeamEventAssignment {
  team_id: string;
  event_id: string;
  player_id: string;
  locked_at: string | null;
  event?: Event;
  player?: Profile;
}

export interface Leaderboard {
  player_id: string;
  player: Profile;
  total_points: number;
  gold_medals: number;
  silver_medals: number;
  bronze_medals: number;
}

export interface OlympicPlayer {
  olympic_id: string;
  player_id: string;
  paid: boolean;
  created_at: string;
  player?: Profile;
}