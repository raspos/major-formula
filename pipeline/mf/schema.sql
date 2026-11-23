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

CREATE TABLE crosscheck (                  -- second-source comparisons
  check_id TEXT NOT NULL, entity TEXT NOT NULL, ours TEXT, theirs TEXT, agree INTEGER NOT NULL);

CREATE TABLE analysis (                    -- computed statistics with their sample scope
  metric_id TEXT NOT NULL, scope TEXT NOT NULL, value REAL, n INTEGER NOT NULL,
  period TEXT, formula TEXT NOT NULL, PRIMARY KEY (metric_id, scope));

CREATE TABLE validation_log (run_at TEXT NOT NULL, check_id TEXT NOT NULL, severity TEXT NOT NULL,
  entity TEXT, detail TEXT NOT NULL);
