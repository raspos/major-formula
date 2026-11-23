"""Rebuild data/db/majors.sqlite from stored raw pages (fetching only what is missing).

    python -m mf.build            # cached raw pages; downloads anything missing
    python -m mf.build --offline  # never touch the network; missing pages are reported
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sqlite3
from collections import defaultdict
from datetime import date
from pathlib import Path

from . import config, fetch, nations, normalize, photos, wikidata
from .sources import editions as E
from .sources import majors as M

SCHEMA = Path(__file__).with_name("schema.sql")
MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct",
                                      "nov", "dec"], 1)}

SOURCES = [
    ("wikipedia", "English Wikipedia — championship articles and per-edition articles", "Wikimedia (community)",
     "https://en.wikipedia.org", 0, "CC BY-SA 4.0", "used",
     "champions, runner-ups, scores, venues, round leaderboards", "Secondary; articles cite organisers. revid stored."),
    ("wikidata", "Wikidata — birth date, citizenship, image file name", "Wikimedia", "https://www.wikidata.org",
     0, "CC0", "used", "birth dates (age at win), fallback nationality", ""),
    ("commons", "Wikimedia Commons — player photos", "Wikimedia (photographers credited per file)",
     "https://commons.wikimedia.org", 0, "per file: CC0 / public domain / CC BY / CC BY-SA only", "used",
     "player photos with author and licence", "Non-free or unknown-licence files are skipped."),
    ("masters_com", "masters.com champions history", "Augusta National GC", "https://www.masters.com", 1,
     "not reviewable (JavaScript-only page shell)", "not_accessible", "-", "Static HTML is a 3 KB app shell."),
    ("usga", "USGA (U.S. Open, U.S. Women's Open)", "USGA", "https://www.usga.org", 1, "terms page HTTP 403",
     "blocked", "-", "Championship and terms pages return 403 to scripts."),
    ("pga_of_america", "PGA Championship / KPMG Women's PGA history pages", "PGA of America",
     "https://www.pgachampionship.com/history", 1, "pga.com terms page HTTP 403 (not reviewable)",
     "not_reviewed", "-", "History pages reachable (200); terms unreadable, so not collected."),
    ("randa", "The Open / AIG Women's Open", "The R&A", "https://www.theopen.com", 1,
     "personal, non-commercial use with acknowledgement; no other reproduction", "terms_restrict_reuse", "-",
     "Previous Opens page reachable; terms restrict reuse."),
    ("lpga_site", "lpga.com", "LPGA", "https://www.lpga.com", 1,
     "Terms §2.1: no systematic retrieval to build a database without written consent", "consent_required",
     "-", "See eras-of-dominance/DATA_SOURCE_AUDIT.md"),
    ("evian", "evianchampionship.com", "Evian Resort GC", "https://www.evianchampionship.com", 1, "not reviewed",
     "not_reviewed", "-", ""),
    ("chevron", "chevronchampionship.com", "LPGA / Chevron", "https://www.chevronchampionship.com", 1, "-",
     "not_accessible", "-", "Connection failed on 2026-11-22."),
]


def connect(path: Path | None = None) -> sqlite3.Connection:
    path = path or config.DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def reset(con) -> None:
    con.execute("PRAGMA foreign_keys = OFF")
    for (n,) in con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
        con.execute(f"DROP TABLE IF EXISTS {n}")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(SCHEMA.read_text(encoding="utf-8"))


def _register(con, f: fetch.Fetched, title: str, data: dict | None) -> int:
    status = "page_missing" if (data is None or "error" in data) else "parsed"
    revid = data["parse"].get("revid") if status == "parsed" else None
    cur = con.execute("INSERT OR IGNORE INTO raw_fetches(source_id,url,title,revid,fetched_at,sha256,local_path,"
                      "parse_status) VALUES (?,?,?,?,?,?,?,?)",
                      (f.source_id, f.url, title, revid, f.fetched_at, f.sha256,
                       str(f.path.relative_to(config.ROOT)), status))
    if cur.lastrowid and cur.rowcount:
        return cur.lastrowid
    return con.execute("SELECT fetch_id FROM raw_fetches WHERE url=?", (f.url,)).fetchone()[0]


def _wiki(title: str, offline: bool):
    """Cached wikitext page or None (offline + not cached)."""
    import urllib.parse
    q = urllib.parse.urlencode({"action": "parse", "page": title, "prop": "wikitext|revid", "format": "json",
                                "formatversion": "2", "redirects": "1"})
    url = f"{fetch.WIKI_API}?{q}"
    if offline:
        p = config.RAW / "wikipedia" / f"{fetch._key(url)}.json"
        if not p.exists():
            return None
    return fetch.wiki_wikitext(title)


def resolve_titles(titles: set[str], offline: bool) -> dict[str, str]:
    out: dict[str, str] = {}
    todo = sorted({normalize.wiki_title(t) for t in titles if t})
    for i in range(0, len(todo), 50):
        batch = todo[i:i + 50]
        try:
            q = fetch.wiki_resolve(batch).json().get("query", {})
        except Exception:
            if offline:
                continue
            raise
        step = {n["from"]: n["to"] for n in q.get("normalized", [])}
        red = {r["from"]: r["to"] for r in q.get("redirects", [])}
        for t in batch:
            cur, k = step.get(t, t), 0
            while cur in red and k < 5:
                cur, k = red[cur], k + 1
            out[t] = cur
    return out


def end_date_from_table(dates: str | None, year: int) -> str | None:
    if not dates:
        return None
    t = dates.replace("–", "-").replace("—", "-")
    toks = re.findall(r"(\d{1,2})?\s*([A-Za-z]{3,})\.?\s*(\d{1,2})?", t)
    day = mon = None
    # last month name and last day number in the string
    mons = [m for _, m, _ in toks if m[:3].lower() in MONTHS]
    days = re.findall(r"\d{1,2}", t)
    if mons and days:
        mon = MONTHS[mons[-1][:3].lower()]
        day = int(days[-1])
        try:
            return date(year, mon, day).isoformat()
        except ValueError:
            return None
    return None


def age(dob: str | None, prec: int | None, end: str | None, year: int):
    if not dob:
        return None, None, None
    try:
        by = int(dob[:4])
    except ValueError:
        return None, None, None
    if end and prec and prec >= 11:
        d0 = date.fromisoformat(dob)
        d1 = date.fromisoformat(end)
        days = (d1 - d0).days
        return days, round(days / 365.2425, 3), "day"
    return None, float(year - by), "year"


def build(offline: bool = False) -> dict:
    con = connect()
    reset(con)
    con.executemany("INSERT INTO sources VALUES (?,?,?,?,?,?,?,?,?)", SOURCES)
    champ_rows: list[tuple[dict, M.ChampionRow, int]] = []
    for m in M.MAJORS:
        con.execute("INSERT INTO tournaments VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    (m["id"], m["gender"], m["name"], m["name_ko"], m["article"], m["first_held"],
                     m["major_from"], m["major_to"], int(m["current"]), m["host"], m.get("note")))
        f = _wiki(m["article"], offline)
        data = f.json()
        fid = _register(con, f, m["article"], data)
        for r in M.parse_article(m, data["parse"]["wikitext"], config.LAST_SEASON):
            champ_rows.append((m, r, fid))

    # edition articles
    ed_parsed: dict[str, tuple[E.Edition, int]] = {}
    missing_articles = []
    for m, r, _ in champ_rows:
        if r.status != "held" or not r.year_article or str(r.year) not in r.year_article \
                or "LPGA Tour" in r.year_article:
            continue
        f = _wiki(r.year_article, offline)
        if f is None:
            missing_articles.append(r.year_article)
            continue
        d = f.json()
        fid = _register(con, f, r.year_article, d)
        if "error" in d:
            continue
        ed_parsed[f"{m['id']}-{r.year}"] = (E.parse_edition(r.year_article, d["parse"]["wikitext"], r.year), fid)

    # identities
    targets = set()
    for m, r, _ in champ_rows:
        targets |= {p.target for p in r.winners + r.runners_up if p.target}
    for ed, _ in ed_parsed.values():
        for rows in ed.boards.values():
            targets |= {b.target for b in rows if b.target}
    canon = resolve_titles(targets, offline)

    players: dict[str, dict] = {}
    aliases: dict[str, set[str]] = defaultdict(set)

    def pid_for(target, label, gender):
        if target:
            title = canon.get(normalize.wiki_title(target), normalize.wiki_title(target))
            pid = "wp:" + title
            basis = "wiki_canonical_title"
        else:
            title, pid, basis = None, "nm:" + normalize.name_key(label), "name_only"
        if pid not in players:
            players[pid] = {"name": title or label, "title": title, "basis": basis, "gender": gender}
        aliases[pid].add(label)
        return pid

    # merge unlinked names into linked players (Wikipedia links a name only once per table)
    def merged(pid):
        if not pid.startswith("nm:"):
            return pid
        key = pid[3:]
        cands = {p for p, labels in aliases.items() if p.startswith("wp:") and
                 (key in {normalize.name_key(a) for a in labels} or
                  key == normalize.name_key(re.sub(r"\s*\([^)]*\)$", "", p[3:])))}
        return next(iter(cands)) if len(cands) == 1 else pid

    # pass 1: register everyone so merges can see all linked aliases
    for m, r, _ in champ_rows:
        for p in r.winners + r.runners_up:
            pid_for(p.target, p.label, m["gender"])
    for eid, (ed, _) in ed_parsed.items():
        g = M.BY_ID[eid.rsplit("-", 1)[0]]["gender"]
        for rows in ed.boards.values():
            for b in rows:
                pid_for(b.target, b.label, g)
    remap = {p: merged(p) for p in players}
    final_players = {}
    for p, info in players.items():
        q = remap[p]
        if q not in final_players:
            final_players[q] = dict(players[q])
    for p, q in remap.items():
        if p != q:
            aliases[q] |= aliases[p]

    # wikidata
    titles = sorted({v["title"] for v in final_players.values() if v["title"]})
    wd = {}
    try:
        wd = wikidata.lookup(titles)
    except Exception as exc:
        if not offline:
            raise
        print("wikidata unavailable offline:", exc)
    cit_q = sorted({q for v in wd.values() for q in v["citizenship_qids"]})
    try:
        ccode = wikidata.country_codes(cit_q) if cit_q else {}
    except Exception:
        ccode = {}
    for pid, v in final_players.items():
        w = wd.get(v["title"] or "", {})
        prec = w.get("dob_precision")
        con.execute("INSERT INTO players VALUES (?,?,?,?,?,?,?,?,?)",
                    (pid, v["name"], v["title"], v["basis"], v["gender"], w.get("qid"),
                     w.get("dob") if prec and prec >= 9 else None,
                     {11: "day", 10: "month", 9: "year"}.get(prec), w.get("image")))
        v["wd"] = w

    def fallback_flag(pid):
        w = final_players[pid].get("wd") or {}
        codes = [nations.normalize_code(ccode.get(q)) for q in w.get("citizenship_qids", []) if ccode.get(q)]
        return codes[0] if len(codes) == 1 else None

    # editions + champions + runner-ups
    for m, r, fid in champ_rows:
        eid = f"{m['id']}-{r.year}"
        ed, efid = ed_parsed.get(eid, (None, None))
        if r.status == "not_held":
            con.execute("INSERT OR IGNORE INTO editions(edition_id,tournament_id,year,status,data_tier,"
                        "champion_fetch_id,raw_row) VALUES (?,?,?,?,?,?,?)",
                        (eid, m["id"], r.year, "not_held", "not_applicable", fid, r.raw_row))
            continue
        end = end_date_from_table(r.dates, r.year) or (ed.end_date if ed else None)
        basis = "champion table dates" if end_date_from_table(r.dates, r.year) else (ed.date_basis if ed else None)
        status = "held"
        if r.year == config.LAST_SEASON and end and end >= config.COLLECTION_CUTOFF:
            status = "in_progress_excluded"
        tier = "leaderboard_top" if ed and (3 in ed.boards and 4 in ed.boards) else "champion_only"
        fmt = "match" if r.result_text else "stroke"
        holes = r.holes or (sum(1 for _ in ed.boards[4][0].rounds) * 18 if ed and 4 in ed.boards
                            and ed.boards[4] and ed.boards[4][0].rounds else (None if fmt == "match" else 72))
        playoff = r.playoff if r.playoff is not None else (True if ed and ed.playoff_section else None)
        con.execute("INSERT INTO editions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (eid, m["id"], r.year, status, r.year_article, end, basis, ed.par if ed else None,
                     r.venue or (ed.course if ed else None), r.location, m["host"], fmt, holes,
                     None if playoff is None else int(playoff), r.margin, r.margin_text, r.result_text,
                     tier, fid, efid, r.raw_row))
        name = re.sub(r"^\d{4}\s+", "", r.year_article) if r.year_article and str(r.year) in r.year_article \
            and "LPGA Tour" not in r.year_article else m["name"]
        con.execute("INSERT OR IGNORE INTO tournament_names VALUES (?,?,?)", (m["id"], r.year, name))
        if status != "held":
            continue
        for w in r.winners:
            pid = remap[pid_for(w.target, w.label, m["gender"])]
            flag, nb = (w.flag, "flag_in_table") if w.flag else (fallback_flag(pid), "wikidata_citizenship")
            if not flag:
                nb = "unknown"
            rounds, rb = (r.rounds, "champion_table") if r.rounds else (None, None)
            if not rounds and ed and 4 in ed.boards:
                me = [b for b in ed.boards[4] if remap.get(pid_for(b.target, b.label, m["gender"])) == pid]
                if me and me[0].rounds:
                    rounds, rb = me[0].rounds, "edition_article"
            rr = (rounds or []) + [None] * 4
            info = final_players[pid].get("wd") or {}
            a_days, a_years, a_prec = age(info.get("dob"), info.get("dob_precision"), end, r.year)
            con.execute("INSERT INTO champions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (eid, pid, flag, nb, int(w.amateur), w.counter, r.total, r.to_par,
                         rr[0], rr[1], rr[2], rr[3], rb, a_days, a_years, a_prec))
            con.execute("INSERT OR IGNORE INTO results VALUES (?,?,?,?,?,?,?,?,?,?)",
                        (eid, pid, 1, int(len(r.winners) > 1), "1", r.total, r.to_par, flag, int(w.amateur),
                         "champion_table"))
        for p in r.runners_up:
            pid = remap[pid_for(p.target, p.label, m["gender"])]
            con.execute("INSERT OR IGNORE INTO results VALUES (?,?,?,?,?,?,?,?,?,?)",
                        (eid, pid, 2, int(len(r.runners_up) > 1), "T2" if len(r.runners_up) > 1 else "2",
                         None, None, p.flag, int(p.amateur), "champion_table"))
        if ed:
            for n, rows in ed.boards.items():
                for b in rows:
                    pid = remap[pid_for(b.target, b.label, m["gender"])]
                    if n == 4:
                        con.execute("INSERT OR IGNORE INTO results VALUES (?,?,?,?,?,?,?,?,?,?)",
                                    (eid, pid, b.position, int(b.tied), b.place, b.total, b.to_par, b.flag,
                                     int(b.amateur), "edition_article"))
                        for k, s in enumerate(b.rounds, 1):
                            con.execute("INSERT OR IGNORE INTO rounds VALUES (?,?,?,?,?)",
                                        (eid, pid, k, s, "edition_article"))
                    else:
                        con.execute("INSERT OR IGNORE INTO round_standings VALUES (?,?,?,?,?,?,?)",
                                    (eid, n, pid, b.position, int(b.tied), b.total, b.to_par))
            if r.rounds:
                for w in r.winners:
                    pid = remap[pid_for(w.target, w.label, m["gender"])]
                    for k, s in enumerate(r.rounds, 1):
                        con.execute("INSERT OR IGNORE INTO rounds VALUES (?,?,?,?,?)", (eid, pid, k, s, "champion_table"))

    # photos (champions only; licence-checked on Commons)
    files = {f: pid for pid, f in con.execute(
        "SELECT DISTINCT p.player_id, p.image_file FROM players p JOIN champions c USING(player_id) "
        "WHERE p.image_file IS NOT NULL")}
    try:
        ph = photos.lookup(sorted(files)) if files else {}
    except Exception as exc:
        if not offline:
            raise
        ph = {}
        print("commons unavailable offline:", exc)
    for f, info in ph.items():
        if f in files:
            con.execute("INSERT OR IGNORE INTO player_photos VALUES (?,?,?,?,?,?,?)",
                        (files[f], f, info["thumb"].split("?")[0], info["page"], info["license"],
                         info["license_url"], info["artist"]))

    # nationality history from champion + result flags
    obs = defaultdict(list)
    for eid, pid, code, yr in con.execute(
            "SELECT r.edition_id, r.player_id, r.nation_code, e.year FROM results r JOIN editions e USING(edition_id) "
            "WHERE r.nation_code IS NOT NULL ORDER BY r.player_id, e.year"):
        obs[pid].append((yr, code))
    for pid, seq in obs.items():
        spans = []
        for yr, code in seq:
            if spans and spans[-1][0] == code:
                spans[-1][2] = yr; spans[-1][3] += 1
            else:
                spans.append([code, yr, yr, 1])
        for code, a, b, n in spans:
            con.execute("INSERT OR IGNORE INTO nationalities VALUES (?,?,?,?,?,?)",
                        (pid, code, a, b, "flag_at_major_result", n))
    con.commit()
    export_csv(con)
    summary = {t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in
               ["raw_fetches", "editions", "champions", "results", "round_standings", "rounds", "players"]}
    summary["edition_articles_missing_offline"] = len(missing_articles)
    con.close()
    return summary


def export_csv(con) -> None:
    config.PROCESSED.mkdir(parents=True, exist_ok=True)
    for (t,) in con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
        cur = con.execute(f"SELECT * FROM {t}")
        with open(config.PROCESSED / f"{t}.csv", "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow([d[0] for d in cur.description])
            w.writerows(cur.fetchall())


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true")
    print(json.dumps(build(offline=ap.parse_args().offline), indent=1))
