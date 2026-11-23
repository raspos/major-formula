-- THE MAJOR FORMULA — relational schema (SQLite). Unknown = NULL (+ status), never 0.
PRAGMA foreign_keys = ON;

CREATE TABLE sources (
  source_id TEXT PRIMARY KEY, name TEXT NOT NULL, publisher TEXT, url TEXT,
  official INTEGER NOT NULL, terms TEXT, access_status TEXT NOT NULL, used_for TEXT, note TEXT);

CREATE TABLE raw_fetches (
  fetch_id INTEGER PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(source_id),
  url TEXT NOT NULL UNIQUE, title TEXT, revid INTEGER, fetched_at TEXT NOT NULL,
  sha256 TEXT NOT NULL, local_path TEXT NOT NULL, parse_status TEXT NOT NULL);

CREATE TABLE tournaments (
  tournament_id TEXT PRIMARY KEY, gender TEXT NOT NULL CHECK (gender IN ('M','W')),
  name TEXT NOT NULL, name_ko TEXT NOT NULL, article TEXT NOT NULL,
  first_held INTEGER NOT NULL, major_from INTEGER NOT NULL, major_to INTEGER,
  is_current INTEGER NOT NULL, host_country TEXT, note TEXT);

CREATE TABLE tournament_names (            -- historical / sponsor names per edition
  tournament_id TEXT NOT NULL REFERENCES tournaments(tournament_id), year INTEGER NOT NULL,
  name TEXT NOT NULL, PRIMARY KEY (tournament_id, year));

CREATE TABLE players (
  player_id TEXT PRIMARY KEY, name TEXT NOT NULL, wiki_title TEXT, identity_basis TEXT NOT NULL,
  gender TEXT, wikidata_qid TEXT, birth_date TEXT, birth_precision TEXT,   -- 'day' | 'month' | 'year'
  image_file TEXT);

CREATE TABLE player_photos (              -- Wikimedia Commons, reusable licences only
  player_id TEXT PRIMARY KEY REFERENCES players(player_id), file TEXT NOT NULL, thumb TEXT NOT NULL,
  page TEXT NOT NULL, license TEXT NOT NULL, license_url TEXT, artist TEXT NOT NULL);

CREATE TABLE nationalities (               -- flag observed at each major result
  player_id TEXT NOT NULL REFERENCES players(player_id), nation_code TEXT NOT NULL,
  from_year INTEGER NOT NULL, to_year INTEGER NOT NULL, basis TEXT NOT NULL, n_obs INTEGER NOT NULL,
  PRIMARY KEY (player_id, nation_code, from_year));

CREATE TABLE editions (
  edition_id TEXT PRIMARY KEY,             -- '<tournament_id>-<year>'
  tournament_id TEXT NOT NULL REFERENCES tournaments(tournament_id), year INTEGER NOT NULL,
  status TEXT NOT NULL,                    -- held | not_held | in_progress_excluded
  year_article TEXT, end_date TEXT, date_basis TEXT, par INTEGER, venue TEXT, location TEXT,
  host_country TEXT, format TEXT,          -- stroke | match
  holes INTEGER,                           -- 72 unless known otherwise (NULL if unknown)
  playoff INTEGER, margin INTEGER, margin_text TEXT, match_result TEXT,
  data_tier TEXT NOT NULL,                 -- champion_only | leaderboard_top | not_applicable
  champion_fetch_id INTEGER REFERENCES raw_fetches(fetch_id),
  edition_fetch_id INTEGER REFERENCES raw_fetches(fetch_id),
  raw_row TEXT, UNIQUE (tournament_id, year));

CREATE TABLE champions (
  edition_id TEXT NOT NULL REFERENCES editions(edition_id), player_id TEXT NOT NULL REFERENCES players(player_id),
  nation_code TEXT, nation_basis TEXT NOT NULL,   -- flag_in_table | wikidata_citizenship | unknown
  amateur INTEGER NOT NULL, win_number_in_event INTEGER,
  total INTEGER, to_par INTEGER, r1 INTEGER, r2 INTEGER, r3 INTEGER, r4 INTEGER, rounds_basis TEXT,
  age_days INTEGER, age_years REAL, age_precision TEXT,   -- 'day' | 'year' (±1) | NULL
  PRIMARY KEY (edition_id, player_id));

CREATE TABLE results (                     -- final placings as printed (top of the board only)
  edition_id TEXT NOT NULL REFERENCES editions(edition_id), player_id TEXT NOT NULL REFERENCES players(player_id),
  position INTEGER, tied INTEGER, place_text TEXT, total INTEGER, to_par INTEGER,
  nation_code TEXT, amateur INTEGER, source TEXT NOT NULL,   -- champion_table | edition_article
  PRIMARY KEY (edition_id, player_id));

CREATE TABLE round_standings (             -- leaderboard after round n (1-3), as printed
  edition_id TEXT NOT NULL REFERENCES editions(edition_id), after_round INTEGER NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(player_id), position INTEGER, tied INTEGER,
  total INTEGER, to_par INTEGER, PRIMARY KEY (edition_id, after_round, player_id));

CREATE TABLE rounds (
  edition_id TEXT NOT NULL REFERENCES editions(edition_id), player_id TEXT NOT NULL REFERENCES players(player_id),
  round_no INTEGER NOT NULL, strokes INTEGER NOT NULL, source TEXT NOT NULL,
  PRIMARY KEY (edition_id, player_id, round_no));

CREATE TABLE player_profiles (            -- body data as listed; measurement date unknown unless stated
  player_id TEXT PRIMARY KEY REFERENCES players(player_id), tour TEXT,
  height_cm REAL, height_source TEXT, weight_kg REAL, weight_source TEXT,
  measurement_date TEXT, verification_status TEXT NOT NULL, year_turned_pro INTEGER);

CREATE TABLE player_career_stats (        -- one tour per player (PGA Tour for men, LPGA Tour for women)
  player_id TEXT PRIMARY KEY REFERENCES players(player_id), tour TEXT NOT NULL,
  official_tour_wins INTEGER, tour_wins_basis TEXT, tour_wins_heading INTEGER,
  worldwide_pro_wins INTEGER,
  majors_in_db INTEGER NOT NULL,          -- majors in this database (all recognised majors, any status)
  recognized_major_wins INTEGER,          -- of those, rows found in the article's tour-wins table
  major_win_share REAL,                   -- recognized / official_tour_wins, NULL when undefined
  share_status TEXT NOT NULL,             -- ok | no_tour_wins | no_tour_win_table | inconsistent
  major_starts INTEGER, major_top10 INTEGER, major_runner_up INTEGER, major_cuts INTEGER,
  summary_major_wins INTEGER,             -- 'Summary' table total (checked against majors_in_db)
  source_url TEXT, checked_at TEXT);

CREATE TABLE player_season_stats (        -- tour skill statistics; empty until a permitted source exists
  player_id TEXT NOT NULL REFERENCES players(player_id), season INTEGER NOT NULL, tour TEXT NOT NULL,
  driving_distance REAL, driving_accuracy REAL, greens_in_regulation REAL, scrambling REAL,
  strokes_gained_off_tee REAL, strokes_gained_approach REAL, strokes_gained_around_green REAL,
  strokes_gained_putting REAL, strokes_gained_total REAL, scoring_average REAL, source_url TEXT,
  PRIMARY KEY (player_id, season, tour));

CREATE TABLE player_styles (              -- derived from player_season_stats only; empty while that is empty
  player_id TEXT NOT NULL REFERENCES players(player_id), season INTEGER NOT NULL,
  primary_style TEXT, secondary_style TEXT, model_version TEXT, sample_size INTEGER,
  confidence REAL, data_coverage REAL, PRIMARY KEY (player_id, season));

CREATE TABLE crosscheck (                  -- second-source comparisons
  check_id TEXT NOT NULL, entity TEXT NOT NULL, ours TEXT, theirs TEXT, agree INTEGER NOT NULL);

CREATE TABLE analysis (                    -- computed statistics with their sample scope
  metric_id TEXT NOT NULL, scope TEXT NOT NULL, value REAL, n INTEGER NOT NULL,
  period TEXT, formula TEXT NOT NULL, PRIMARY KEY (metric_id, scope));

CREATE TABLE validation_log (run_at TEXT NOT NULL, check_id TEXT NOT NULL, severity TEXT NOT NULL,
  entity TEXT, detail TEXT NOT NULL);
