"""Automated checks. Findings are logged, never auto-corrected.

    python -m mf.validate   -> validation_log + crosscheck tables, logs/validation_latest.json
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone

from . import config, fetch, normalize, wikitable as wt
from .build import connect, resolve_titles
from .sources import majors as M

LIST_ARTICLES = {
    "M": ("List of men's major championships winning golfers",
          {"Masters": "masters", "U.S. Open": "us_open", "The Open": "the_open", "PGA": "pga"}),
    "W": ("List of LPGA major championship winning golfers",
          {"Chevron": "chevron", "PGA C": "womens_pga", "U.S. Open": "us_womens_open", "British Open": "womens_open",
           "Evian": "evian", "du Maurier": "du_maurier", "Titleholders": "titleholders", "Western": "western"}),
}


def _name_from_cell(raw: str) -> tuple[str | None, str]:
    m = re.search(r"\{\{\s*sortname\s*\|([^}]*)\}\}", raw, re.I)
    if m:
        params = [p.strip() for p in m.group(1).split("|")]
        pos = [p for p in params if "=" not in p]
        named = dict(p.split("=", 1) for p in params if "=" in p)
        label = f"{pos[0]} {pos[1]}" if len(pos) >= 2 else " ".join(pos)
        target = pos[2] if len(pos) >= 3 and pos[2].lower() not in {"nolink", ""} else label
        if named.get("dab"):
            target = f"{label} ({named['dab'].strip()})"
        return target, label
    c = wt.parse_cell(raw)
    if c.links:
        return c.links[0].target, c.links[0].label
    return None, c.text


def crosscheck_lists(con) -> list[tuple]:
    """Compare per-player, per-major win counts with Wikipedia's separate list articles."""
    rows = []
    ours = defaultdict(Counter)
    names = {}
    for pid, name, tid in con.execute("""SELECT c.player_id, p.name, e.tournament_id FROM champions c
                                         JOIN editions e USING(edition_id) JOIN players p USING(player_id)"""):
        ours[pid][tid] += 1
        names[pid] = name
    key_to_pid = {}
    for pid, name in names.items():
        key_to_pid[normalize.name_key(re.sub(r"\s*\([^)]*\)$", "", name))] = pid
    title_to_pid = {pid[3:]: pid for pid in names if pid.startswith("wp:")}
    list_targets = set()
    for gender, (title, _) in LIST_ARTICLES.items():
        d = fetch.wiki_wikitext(title).json()
        for tb in wt.tables(d.get("parse", {}).get("wikitext", "")):
            ig = next((i for i, x in enumerate(tb.headers) if x.lower() in ("golfer", "player")), None)
            if ig is not None:
                list_targets |= {t for t, _ in (_name_from_cell(r[ig]) for r in tb.rows if ig < len(r)) if t}
    canon = resolve_titles(list_targets, offline=False)
    for gender, (title, cols) in LIST_ARTICLES.items():
        d = fetch.wiki_wikitext(title).json()
        if "error" in d:
            continue
        for tb in wt.tables(d["parse"]["wikitext"]):
            h = tb.headers
            ig = next((i for i, x in enumerate(h) if x.lower() in ("golfer", "player")), None)
            if ig is None:
                continue
            idx = {tid: next((i for i, x in enumerate(h) if x.startswith(k)), None) for k, tid in cols.items()}
            for r in tb.rows:
                if ig >= len(r):
                    continue
                target, label = _name_from_cell(r[ig])
                if re.fullmatch(r"\d+", label.strip()):
                    continue   # totals row
                pid = (title_to_pid.get(canon.get(normalize.wiki_title(target), "")) if target else None) or key_to_pid.get(normalize.name_key(re.sub(r"\s*\([^)]*\)$", "", target or label))) \
                    or key_to_pid.get(normalize.name_key(label))
                for tid, i in idx.items():
                    if i is None or i >= len(r):
                        continue
                    txt = wt.clean_text(r[i])
                    theirs = int(txt) if txt.isdigit() else 0
                    mine = ours[pid][tid] if pid else 0
                    if theirs or mine:
                        rows.append(("C1_list_counts", f"{label}|{tid}", str(mine), str(theirs), int(mine == theirs)))
    return rows


def run() -> dict:
    con = connect()
    run_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    F = []
    add = lambda c, s, e, d: F.append((c, s, e, d))
    q = lambda sql, *a: con.execute(sql, a).fetchall()

    # V01 every recognised year is either held or explicitly not held
    for m in M.MAJORS:
        have = {y for (y,) in q("SELECT year FROM editions WHERE tournament_id=?", m["id"])}
        exp = set(range(m["major_from"], (m["major_to"] or config.LAST_SEASON) + 1))
        for y in sorted(exp - have):
            add("V01_missing_year", "error", f"{m['id']}-{y}", "recognised year neither held nor marked not held")
        for y in sorted(have - exp):
            add("V01_year_outside_major_period", "error", f"{m['id']}-{y}", "edition outside recognition period")
    # V02 one champion row per held edition (ties for a title do not occur in majors)
    for eid, n in q("""SELECT e.edition_id, COUNT(c.player_id) FROM editions e LEFT JOIN champions c USING(edition_id)
                       WHERE e.status='held' GROUP BY 1 HAVING COUNT(c.player_id)<>1"""):
        add("V02_champion_count", "error", eid, f"{n} champion rows")
    for eid, in q("""SELECT DISTINCT edition_id FROM champions JOIN editions e USING(edition_id) WHERE e.status<>'held'"""):
        add("V02_champion_on_unheld", "error", eid, "champion row on a non-held edition")
    # V03 printed win counter '(n)' must equal the running count of that player's wins in that event
    seen = Counter()
    for eid, tid, pid, cnt in q("""SELECT c.edition_id, e.tournament_id, c.player_id, c.win_number_in_event
                                   FROM champions c JOIN editions e USING(edition_id) ORDER BY e.year"""):
        seen[(pid, tid)] += 1
        if cnt is not None and cnt != seen[(pid, tid)]:
            add("V03_win_counter", "warning", eid, f"{pid}: printed ({cnt}), running count {seen[(pid, tid)]}")
    # V04 nobody on the edition article's final board beat the champion's 72-hole total
    # (the champion's own board row is stored once, from the champion table; playoff losers tie at T1)
    for eid, cpid, ctot in q("""SELECT c.edition_id, c.player_id, c.total FROM champions c JOIN editions e USING(edition_id)
                                WHERE e.data_tier='leaderboard_top' AND c.total IS NOT NULL"""):
        better = q("""SELECT player_id, total FROM results WHERE edition_id=? AND source='edition_article'
                      AND total IS NOT NULL AND total < ?""", eid, ctot)
        if better:
            add("V04_board_winner_mismatch", "error", eid, f"champion {cpid} {ctot} vs lower board total(s) {better[:3]}")
        lead = q("""SELECT player_id FROM results WHERE edition_id=? AND source='edition_article' AND position=1""", eid)
        tied_pf = q("SELECT playoff FROM editions WHERE edition_id=?", eid)[0][0]
        if lead and cpid not in [p for (p,) in lead] and tied_pf != 1:
            add("V04b_board_t1_without_playoff", "warning", eid, f"other T1 players {lead[:3]} but edition not marked playoff")
    # V05 to-par arithmetic: total - par * holes/18 == to_par
    for eid, tot, tp, par, holes in q("""SELECT c.edition_id, c.total, c.to_par, e.par, e.holes FROM champions c
                                          JOIN editions e USING(edition_id)
                                          WHERE c.total IS NOT NULL AND c.to_par IS NOT NULL AND e.par IS NOT NULL
                                            AND e.holes IS NOT NULL"""):
        if tot - par * holes // 18 != tp:
            add("V05_to_par_arithmetic", "warning", eid, f"total {tot}, par {par}x{holes // 18}, to par {tp}")
    # V06 round sums equal the total
    for eid, pid, tot, s, n in q("""SELECT c.edition_id, c.player_id, c.total, COALESCE(r1,0)+COALESCE(r2,0)+
                                     COALESCE(r3,0)+COALESCE(r4,0), (r1 IS NOT NULL)+(r2 IS NOT NULL)+
                                     (r3 IS NOT NULL)+(r4 IS NOT NULL) FROM champions c WHERE c.total IS NOT NULL
                                     AND r1 IS NOT NULL"""):
        if s != tot:
            add("V06_round_sum", "warning", eid, f"{pid}: rounds sum {s} ({n} rounds) vs total {tot}")
    # V07 the 54-hole leader cannot be behind the champion's 54-hole score
    for eid, lead, w54 in q("""SELECT c.edition_id,
                                 (SELECT MIN(total) FROM round_standings s WHERE s.edition_id=c.edition_id AND after_round=3),
                                 c.r1+c.r2+c.r3 FROM champions c JOIN editions e USING(edition_id)
                                 WHERE c.r3 IS NOT NULL"""):
        if lead is not None and w54 < lead:
            add("V07_54_hole_inconsistent", "error", eid, f"champion 54-hole {w54} below leader {lead}")
    # V08 age plausibility
    for eid, pid, a in q("SELECT edition_id, player_id, age_years FROM champions WHERE age_years IS NOT NULL"):
        if not 14 <= a <= 60:
            add("V08_age_out_of_range", "error", eid, f"{pid}: {a}")
    # V09 champions without nationality / birth date
    for (n,) in q("SELECT COUNT(*) FROM champions WHERE nation_code IS NULL"):
        add("V09_champion_no_nation", "info" if not n else "warning", None, f"{n} champion rows without nationality")
    for (n,) in q("SELECT COUNT(*) FROM champions WHERE age_years IS NULL"):
        add("V09_champion_no_age", "info", None, f"{n} champion rows without age (no birth date)")
    # V10 nationality changes
    for pid, spans in q("""SELECT player_id, GROUP_CONCAT(nation_code||':'||from_year||'-'||to_year) FROM nationalities
                           GROUP BY 1 HAVING COUNT(DISTINCT nation_code)>1"""):
        add("V10_nationality_change", "info", pid, spans)
    # C1 cross-check with the separate list articles
    con.execute("DELETE FROM crosscheck")
    cc = crosscheck_lists(con)
    con.executemany("INSERT INTO crosscheck VALUES (?,?,?,?,?)", cc)
    agree = sum(r[4] for r in cc)
    add("C1_summary", "info", None, f"{len(cc)} player×major counts compared, {agree} agree")
    for r in cc:
        if not r[4]:
            add("C1_list_mismatch", "warning", r[1], f"ours {r[2]} vs list {r[3]}")

    con.execute("DELETE FROM validation_log")
    con.executemany("INSERT INTO validation_log VALUES (?,?,?,?,?)", [(run_at, *f) for f in F])
    con.commit()
    counts = defaultdict(Counter)
    for c, s, _, _ in F:
        counts[s][c] += 1
    out = {"run_at": run_at, "counts": {k: dict(v) for k, v in counts.items()},
           "findings": [dict(check=c, severity=s, entity=e, detail=d) for c, s, e, d in F]}
    config.LOGS.mkdir(exist_ok=True)
    (config.LOGS / "validation_latest.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), "utf-8")
    con.close()
    return out


if __name__ == "__main__":
    print(json.dumps(run()["counts"], indent=1, ensure_ascii=False))
