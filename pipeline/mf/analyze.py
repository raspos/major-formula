"""Analysis engine + static JSON export for the website.

    python -m mf.analyze

Everything here is computed from the database; the website only filters and
re-aggregates these exported rows in the browser. Each headline figure carries
its sample size (n) and period. Nothing is estimated or filled in.

Key definitions (METHODOLOGY.md has the full text):
  * 54-hole standing: the 'Third round' leaderboard printed in the edition article.
    The leader(s) are always on that board, so event-level leader statistics only
    need the editions that have the board — not a full field.
  * deficit: champion's 54-hole strokes minus the 54-hole leader's strokes
    (0 = champion led or co-led after 54 holes).
  * lead_margin: second place's 54-hole strokes minus the leader's (solo lead only).
  * Stroke-play, 72-hole editions only for 54-hole statistics.
"""
from __future__ import annotations

import json
import math
import statistics as st
from collections import Counter, defaultdict
from datetime import datetime, timezone

from . import config, nations
from .build import connect
from .sources import majors as M


def edition_rows(con) -> list[dict]:
    rows = []
    for e in con.execute("""SELECT e.*, t.gender, t.is_current, t.name_ko, t.name AS t_name
                            FROM editions e JOIN tournaments t USING(tournament_id) ORDER BY e.year, t.gender"""):
        e = dict(e)
        e.pop("raw_row", None)
        champ = con.execute("""SELECT c.*, p.name, p.birth_date, p.image_file, ph.thumb AS photo
                               FROM champions c JOIN players p USING(player_id)
                               LEFT JOIN player_photos ph USING(player_id) WHERE edition_id=?""",
                            (e["edition_id"],)).fetchone()
        e["champion"] = dict(champ) if champ else None
        e["runners_up"] = [dict(r) for r in con.execute(
            """SELECT r.player_id, p.name, r.nation_code, r.amateur FROM results r JOIN players p USING(player_id)
               WHERE edition_id=? AND position=2 AND source='champion_table'""", (e["edition_id"],))]
        # 54-hole leaderboard facts
        e["lead54"] = None
        if e["status"] == "held" and e["format"] == "stroke" and champ is not None:
            board = con.execute("""SELECT player_id, position, total FROM round_standings
                                   WHERE edition_id=? AND after_round=3 AND total IS NOT NULL
                                   ORDER BY total""", (e["edition_id"],)).fetchall()
            if board:
                lead_total = board[0]["total"]
                leaders = [b["player_id"] for b in board if b["total"] == lead_total]
                others = [b["total"] for b in board if b["total"] > lead_total]
                w54 = None
                rs = [champ[k] for k in ("r1", "r2", "r3", "r4")]
                rounds_ok = champ["total"] is None or None in rs or sum(rs) == champ["total"]
                if not rounds_ok:
                    w54 = None   # source's round scores do not add up to its total: leave the edition out
                elif champ["r3"] is not None and champ["r1"] is not None and champ["r2"] is not None:
                    w54 = champ["r1"] + champ["r2"] + champ["r3"]
                else:
                    me = [b["total"] for b in board if b["player_id"] == champ["player_id"]]
                    w54 = me[0] if me else None
                if w54 is not None and w54 >= lead_total:
                    e["lead54"] = {
                        "leaders": leaders, "lead_total": lead_total,
                        "solo": len(leaders) == 1,
                        "lead_margin": (others[0] - lead_total) if (len(leaders) == 1 and others) else None,
                        "champion_54": w54, "deficit": w54 - lead_total,
                        "champion_led": champ["player_id"] in leaders or w54 == lead_total,
                        "board_size": len(board),
                    }
        rows.append(e)
    return rows


def _rate(k, n):
    return {"k": k, "n": n, "rate": (k / n) if n else None, "ci95": _wilson(k, n)}


def _wilson(k, n, z=1.96):
    if not n:
        return None
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(c - h, 4), round(c + h, 4)]


def summarize(rows: list[dict], label: str) -> dict:
    held = [r for r in rows if r["status"] == "held" and r["champion"]]
    ages = [r["champion"]["age_years"] for r in held if r["champion"]["age_years"] is not None]
    ages_day = [r["champion"]["age_years"] for r in held if r["champion"]["age_precision"] == "day"]
    stroke72 = [r for r in held if r["format"] == "stroke" and r["holes"] == 72 and r["champion"]["to_par"] is not None]
    l54 = [r for r in held if r["lead54"]]
    solo = [r for r in l54 if r["lead54"]["solo"]]
    out = {
        "label": label, "editions": len(held),
        "period": [min(r["year"] for r in held), max(r["year"] for r in held)] if held else None,
        "age": {"n": len(ages), "n_day_precision": len(ages_day),
                "mean": round(st.mean(ages), 2) if ages else None,
                "median": round(st.median(ages), 2) if ages else None},
        "to_par": {"n": len(stroke72),
                   "mean": round(st.mean(r["champion"]["to_par"] for r in stroke72), 2) if stroke72 else None},
        "playoff": _rate(sum(1 for r in held if r["playoff"] == 1),
                         sum(1 for r in held if r["playoff"] is not None)),
        "lead54": {
            "editions": len(l54),
            "champion_led_or_coled": _rate(sum(1 for r in l54 if r["lead54"]["champion_led"]), len(l54)),
            "solo_leader_won": _rate(sum(1 for r in solo if r["lead54"]["champion_led"]), len(solo)),
            "comeback": _rate(sum(1 for r in l54 if r["lead54"]["deficit"] > 0), len(l54)),
            "max_deficit": max((r["lead54"]["deficit"] for r in l54), default=None),
        },
    }
    for m in (1, 2, 3):
        sub = [r for r in solo if r["lead54"]["lead_margin"] is not None and
               (r["lead54"]["lead_margin"] == m if m < 3 else r["lead54"]["lead_margin"] >= 3)]
        out["lead54"][f"solo_lead_{m}{'+' if m == 3 else ''}"] = _rate(
            sum(1 for r in sub if r["lead54"]["champion_led"]), len(sub))
    return out


def player_records(con) -> list[dict]:
    out = []
    for p in con.execute("SELECT * FROM players"):
        wins = con.execute("""SELECT e.edition_id, e.tournament_id, e.year, c.age_years, c.age_precision,
                                     c.nation_code, t.gender, t.is_current
                              FROM champions c JOIN editions e USING(edition_id) JOIN tournaments t USING(tournament_id)
                              WHERE c.player_id=? ORDER BY e.year, e.end_date""", (p["player_id"],)).fetchall()
        if not wins:
            continue
        wins = [dict(w) for w in wins]
        ph = con.execute("SELECT thumb, page, license, license_url, artist FROM player_photos WHERE player_id=?",
                         (p["player_id"],)).fetchone()
        out.append({"player_id": p["player_id"], "name": p["name"], "gender": p["gender"],
                    "birth_date": p["birth_date"], "birth_precision": p["birth_precision"],
                    "image_file": p["image_file"], "photo": dict(ph) if ph else None, "wins": wins})
    return out


def headline_findings(rows, players) -> list[dict]:
    """Plain facts computed from the data, each with n and period. No causal claims."""
    F = []
    for gender, lab in (("M", "남자"), ("W", "여자")):
        cur = [r for r in rows if r["gender"] == gender and r["is_current"]]
        s = summarize(cur, lab)
        L = s["lead54"]
        if L["editions"]:
            F.append({"id": f"lead54_{gender}", "gender": gender,
                      "text": f"{lab} 현행 메이저에서 54홀 종료 때 선두(공동 포함)였던 선수가 우승한 비율",
                      "value": L["champion_led_or_coled"]["rate"], "n": L["editions"],
                      "ci95": L["champion_led_or_coled"]["ci95"], "unit": "rate",
                      "scope": "3라운드 리더보드가 있는 스트로크플레이 대회"})
            F.append({"id": f"comeback_{gender}", "gender": gender,
                      "text": f"{lab} 현행 메이저 최종일 역전 우승(54홀 후 뒤져 있던 선수의 우승) 비율",
                      "value": L["comeback"]["rate"], "n": L["editions"], "ci95": L["comeback"]["ci95"],
                      "unit": "rate", "scope": "3라운드 리더보드가 있는 스트로크플레이 대회"})
            F.append({"id": f"maxdef_{gender}", "gender": gender, "text": f"{lab} 현행 메이저 최대 역전 타수",
                      "value": L["max_deficit"], "n": L["editions"], "unit": "strokes",
                      "scope": "3라운드 리더보드가 있는 스트로크플레이 대회"})
        if s["age"]["n"]:
            F.append({"id": f"age_{gender}", "gender": gender, "text": f"{lab} 현행 메이저 우승 당시 나이 중앙값",
                      "value": s["age"]["median"], "n": s["age"]["n"], "unit": "years",
                      "scope": "출생 연도 확인된 우승자 (일 단위 계산 " + str(s["age"]["n_day_precision"]) + "건)"})
    return F


def run() -> dict:
    con = connect()
    rows = edition_rows(con)
    players = player_records(con)
    tours = [dict(t) for t in con.execute("SELECT * FROM tournaments")]
    by_t = {}
    for t in tours:
        sub = [r for r in rows if r["tournament_id"] == t["tournament_id"]]
        by_t[t["tournament_id"]] = summarize(sub, t["name_ko"])
    groups = {
        "M_current": summarize([r for r in rows if r["gender"] == "M" and r["is_current"]], "남자 현행 4대 메이저"),
        "W_current": summarize([r for r in rows if r["gender"] == "W" and r["is_current"]], "여자 현행 5대 메이저"),
        "W_all": summarize([r for r in rows if r["gender"] == "W"], "여자 메이저 전체(과거 포함)"),
    }
    findings = headline_findings(rows, players)
    # analysis table (metric, scope, value, n, period, formula)
    con.execute("DELETE FROM analysis")
    for scope, s in list(by_t.items()) + list(groups.items()):
        per = f"{s['period'][0]}-{s['period'][1]}" if s["period"] else None
        for mid, val, n, formula in [
            ("age_median", s["age"]["median"], s["age"]["n"], "median(champion age at final round)"),
            ("to_par_mean", s["to_par"]["mean"], s["to_par"]["n"], "mean(champion to-par), 72-hole stroke play"),
            ("playoff_rate", s["playoff"]["rate"], s["playoff"]["n"], "editions decided by playoff / editions with known result"),
            ("lead54_win_rate", s["lead54"]["champion_led_or_coled"]["rate"], s["lead54"]["editions"],
             "editions won by a 54-hole leader or co-leader / editions with a third-round board"),
            ("comeback_rate", s["lead54"]["comeback"]["rate"], s["lead54"]["editions"],
             "editions won from behind after 54 holes / editions with a third-round board"),
        ]:
            con.execute("INSERT INTO analysis VALUES (?,?,?,?,?,?)", (mid, scope, val, n, per, formula))
    con.commit()

    nat = {code: {"en": en, "ko": ko} for code, (en, ko) in nations.NATIONS.items()}
    coverage = []
    for t in tours:
        sub = [r for r in rows if r["tournament_id"] == t["tournament_id"]]
        held = [r for r in sub if r["status"] == "held"]
        coverage.append({
            "tournament_id": t["tournament_id"], "editions_held": len(held),
            "not_held": sum(1 for r in sub if r["status"] == "not_held"),
            "with_runner_up": sum(1 for r in held if r["runners_up"]),
            "with_age": sum(1 for r in held if r["champion"] and r["champion"]["age_years"] is not None),
            "with_age_day": sum(1 for r in held if r["champion"] and r["champion"]["age_precision"] == "day"),
            "with_rounds": sum(1 for r in held if r["champion"] and r["champion"]["r1"] is not None),
            "with_54_board": sum(1 for r in held if r["lead54"]),
            "stroke_play": sum(1 for r in held if r["format"] == "stroke"),
        })
    meta = {"generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "last_season": config.LAST_SEASON, "cutoff": config.COLLECTION_CUTOFF,
            "sources": [dict(s) for s in con.execute("SELECT * FROM sources")],
            "coverage": coverage, "summaries": {"tournaments": by_t, "groups": groups}, "findings": findings,
            "validation": dict(Counter(r[0] for r in con.execute("SELECT severity FROM validation_log")))}
    config.WEB_DATA.mkdir(parents=True, exist_ok=True)
    dump = lambda name, obj: (config.WEB_DATA / name).write_text(
        json.dumps(obj, ensure_ascii=False, separators=(",", ":")), "utf-8")
    boards = {}
    for eid, in con.execute("SELECT DISTINCT edition_id FROM results WHERE source='edition_article'"):
        final = [dict(r) for r in con.execute(
            """SELECT r.player_id, p.name, r.place_text AS place, r.total, r.to_par, r.nation_code,
                      (SELECT GROUP_CONCAT(strokes, '-') FROM (SELECT strokes FROM rounds x WHERE x.edition_id=r.edition_id
                         AND x.player_id=r.player_id ORDER BY round_no)) AS rounds
               FROM results r JOIN players p USING(player_id)
               WHERE r.edition_id=? AND r.source='edition_article' ORDER BY r.position, p.name""", (eid,))]
        after3 = [dict(r) for r in con.execute(
            """SELECT s.player_id, p.name, s.position, s.tied, s.total, s.to_par FROM round_standings s
               JOIN players p USING(player_id) WHERE s.edition_id=? AND after_round=3 ORDER BY s.position, p.name""", (eid,))]
        boards[eid] = {"final": final, "after54": after3}
    dump("boards.json", boards)
    dump("editions.json", rows)
    dump("players.json", players)
    dump("tournaments.json", tours)
    dump("nations.json", nat)
    dump("meta.json", meta)
    con.close()
    return {"editions": len(rows), "players": len(players), "findings": findings, "groups": groups}


if __name__ == "__main__":
    out = run()
    print(json.dumps({k: out[k] for k in ("editions", "players")}, ensure_ascii=False))
    for f in out["findings"]:
        print(f)
