export type Gender = "M" | "W";

export interface Champion {
  player_id: string;
  name: string;
  nation_code: string | null;
  nation_basis: string;
  amateur: number;
  win_number_in_event: number | null;
  total: number | null;
  to_par: number | null;
  r1: number | null;
  r2: number | null;
  r3: number | null;
  r4: number | null;
  rounds_basis: string | null;
  age_days: number | null;
  age_years: number | null;
  age_precision: "day" | "year" | null;
  birth_date: string | null;
  image_file: string | null;
  photo: string | null;
}

export interface Lead54 {
  leaders: string[];
  lead_total: number;
  solo: boolean;
  lead_margin: number | null;
  champion_54: number;
  deficit: number;
  champion_led: boolean;
  board_size: number;
}

export interface Edition {
  edition_id: string;
  tournament_id: string;
  year: number;
  status: "held" | "not_held" | "in_progress_excluded";
  year_article: string | null;
  end_date: string | null;
  par: number | null;
  venue: string | null;
  location: string | null;
  host_country: string | null;
  format: "stroke" | "match" | null;
  holes: number | null;
  playoff: number | null;
  margin: number | null;
  margin_text: string | null;
  match_result: string | null;
  data_tier: string;
  gender: Gender;
  is_current: number;
  name_ko: string;
  t_name: string;
  champion: Champion | null;
  runners_up: { player_id: string; name: string; nation_code: string | null; amateur: number }[];
  lead54: Lead54 | null;
}

export interface Tournament {
  tournament_id: string;
  gender: Gender;
  name: string;
  name_ko: string;
  article: string;
  first_held: number;
  major_from: number;
  major_to: number | null;
  is_current: number;
  host_country: string;
  note: string | null;
}

export interface PlayerWin {
  edition_id: string;
  tournament_id: string;
  year: number;
  age_years: number | null;
  age_precision: string | null;
  nation_code: string | null;
  gender: Gender;
  is_current: number;
}

export interface Player {
  player_id: string;
  name: string;
  gender: Gender;
  birth_date: string | null;
  birth_precision: string | null;
  image_file: string | null;
  photo: { thumb: string; page: string; license: string; license_url: string | null; artist: string } | null;
  wins: PlayerWin[];
  career: Career | null;
  profile: Profile | null;
}

export interface Career {
  tour: string;
  official_tour_wins: number | null;
  tour_wins_basis: string | null;
  tour_wins_heading: number | null;
  worldwide_pro_wins: number | null;
  majors_in_db: number;
  recognized_major_wins: number | null;
  major_win_share: number | null;
  share_status: "ok" | "no_tour_wins" | "no_tour_win_table" | "inconsistent";
  major_starts: number | null;
  major_top10: number | null;
  major_runner_up: number | null;
  major_cuts: number | null;
  summary_major_wins: number | null;
  source_url: string;
  checked_at: string;
}

export interface Profile {
  tour: string | null;
  height_cm: number | null;
  height_source: string | null;
  weight_kg: number | null;
  weight_source: string | null;
  measurement_date: string | null;
  verification_status: string;
  year_turned_pro: number | null;
}

export interface Finding {
  id: string;
  gender: Gender;
  text: string;
  value: number | null;
  n: number;
  ci95?: [number, number] | null;
  unit: "rate" | "strokes" | "years";
  scope: string;
}

export interface Coverage {
  tournament_id: string;
  editions_held: number;
  not_held: number;
  with_runner_up: number;
  with_age: number;
  with_age_day: number;
  with_rounds: number;
  with_54_board: number;
  stroke_play: number;
}

export interface Meta {
  generated_at: string;
  last_season: number;
  cutoff: string;
  sources: { source_id: string; name: string; publisher: string; url: string; official: number; terms: string; access_status: string; used_for: string; note: string }[];
  coverage: Coverage[];
  findings: Finding[];
  validation: Record<string, number>;
}

export type Mode = "current" | "all";
