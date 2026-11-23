"""Parser tests on stored Wikipedia revisions (offline) + database integrity tests."""
import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))

from mf import config  # noqa: E402
from mf.sources import editions as E  # noqa: E402
from mf.sources import majors as M  # noqa: E402

FIX = Path(__file__).parent / "fixtures"


def wikitext(name):
    return json.loads((FIX / f"{name}.json").read_text(encoding="utf-8"))["parse"]["wikitext"]


def rows(mid, name):
    return {r.year: r for r in M.parse_article(M.BY_ID[mid], wikitext(name), 2026)}


def test_masters_years_and_wartime_gap():
    r = rows("masters", "masters")
    assert [y for y, x in r.items() if x.status == "not_held"] == [1943, 1944, 1945]
    assert min(r) == 1934 and r[1934].winners[0].label == "Horton Smith"
    assert r[1934].total == 284 and r[1934].to_par == -4 and r[1934].margin == 2


def test_us_open_ignores_future_sites_and_amateurs_marked():
    r = rows("us_open", "us_open")
    assert max(r) <= 2026
    assert {1917, 1918, 1942, 1943, 1944, 1945} <= {y for y, x in r.items() if x.status == "not_held"}
    amateurs = [y for y, x in r.items() if x.status == "held" and x.winners[0].amateur]
    assert 1913 in amateurs and len(amateurs) == 8          # Ouimet, Travers, Evans, Jones x4, Goodman
    assert r[1962].playoff is True and r[1962].margin == 0


def test_open_footnote_links_are_not_winners():
    r = rows("the_open", "the_open")
    assert r[1871].status == "not_held" and r[2020].status == "not_held"
    assert [w.label for w in r[1914].winners] == ["Harry Vardon"]
    assert r[1914].winners[0].counter == 6


def test_chevron_major_period_and_round_scores():
    r = rows("chevron", "chevron")
    assert min(r) == 1983                                     # major only from 1983 (event from 1972)
    assert r[1983].rounds == [70, 70, 70, 72] and r[1983].total == 282


def test_titleholders_not_held_years():
    r = rows("titleholders", "titleholders")
    assert {1943, 1944, 1945, 1967, 1968, 1969, 1970, 1971} == {y for y, x in r.items() if x.status == "not_held"}


def test_edition_boards_and_dates():
    ed = E.parse_edition("1940 Masters Tournament", wikitext("ed_masters_1940"), 1940)
    assert ed.end_date == "1940-04-07" and ed.par == 72
    lead = ed.boards[3][0]
    assert lead.label == "Jimmy Demaret" and lead.rounds == [67, 72, 70] and lead.total == 209
    assert ed.boards[4][0].total == 280


def test_score_parser():
    assert M.parse_score(["66-68-60-71=265"])[:2] == ([66, 68, 60, 71], 265)
    assert M.parse_score(["5 & 4"])[2] == "5 & 4"
    assert M.parse_score(["289 (−11)"])[1] == 289


# ---- database (skipped until built) ----------------------------------------------------
DB = config.DB_PATH
needs_db = pytest.mark.skipif(not DB.exists(), reason="run `python -m mf.build` first")


@pytest.fixture(scope="module")
def con():
    import sqlite3
    c = sqlite3.connect(DB)
    yield c
    c.close()


@needs_db
def test_every_recognised_year_accounted_for(con):
    for m in M.MAJORS:
        years = {y for (y,) in con.execute("SELECT year FROM editions WHERE tournament_id=?", (m["id"],))}
        assert years == set(range(m["major_from"], (m["major_to"] or 2026) + 1)), m["id"]


@needs_db
def test_one_champion_per_held_edition(con):
    bad = con.execute("""SELECT e.edition_id FROM editions e LEFT JOIN champions c USING(edition_id)
                         WHERE e.status='held' GROUP BY 1 HAVING COUNT(c.player_id)<>1""").fetchall()
    assert bad == []


@pytest.mark.parametrize("name,expected", [
    ("Jack Nicklaus", 18), ("Tiger Woods", 15), ("Walter Hagen", 11), ("Ben Hogan", 9), ("Gary Player", 9),
    ("Patty Berg", 15), ("Mickey Wright", 13), ("Louise Suggs", 11), ("Annika Sörenstam", 10), ("Inbee Park", 7),
])
@needs_db
def test_published_major_totals(con, name, expected):
    n = con.execute("SELECT COUNT(*) FROM champions WHERE player_id=?", ("wp:" + name,)).fetchone()[0]
    assert n == expected


@needs_db
def test_known_records():
    eds = json.loads((ROOT / "web" / "public" / "data" / "editions.json").read_text(encoding="utf-8"))
    lead = [e for e in eds if e["lead54"]]
    top = max(lead, key=lambda e: e["lead54"]["deficit"])
    assert (top["edition_id"], top["lead54"]["deficit"]) == ("the_open-1999", 10)      # Paul Lawrie
    men = [e for e in eds if e["status"] == "held" and e["gender"] == "M" and e["champion"]["age_years"]]
    assert min(men, key=lambda e: e["champion"]["age_years"])["champion"]["name"] == "Young Tom Morris"
    assert max(men, key=lambda e: e["champion"]["age_years"])["edition_id"] == "pga-2021"  # Mickelson, 50


@needs_db
def test_list_article_crosscheck_all_agree(con):
    n, agree = con.execute("SELECT COUNT(*), SUM(agree) FROM crosscheck WHERE check_id='C1_list_counts'").fetchone()
    assert n > 500 and n == agree


@needs_db
def test_no_zero_for_unknown(con):
    assert con.execute("SELECT COUNT(*) FROM champions WHERE total=0 OR age_years=0").fetchone()[0] == 0


@needs_db
def test_54_hole_leader_never_behind_champion(con):
    bad = con.execute("""SELECT c.edition_id FROM champions c WHERE c.r3 IS NOT NULL AND
                         c.r1+c.r2+c.r3 < (SELECT MIN(total) FROM round_standings s
                                           WHERE s.edition_id=c.edition_id AND after_round=3)""").fetchall()
    assert bad == []


# ---- phase 2: player pages -----------------------------------------------------------
from mf.sources import player_pages as PP  # noqa: E402


def test_player_page_sorenstam():
    pg = PP.parse("Annika Sörenstam", wikitext("pl_sorenstam"), "W")
    assert (pg.tour_wins, pg.tour_wins_heading, pg.pro_wins) == (72, 72, 97)
    assert pg.summary["events"] == 59 and pg.summary["top10"] == 31 and pg.summary["wins"] == 10
    majors = [(1995, "us_womens_open"), (1996, "us_womens_open"), (2001, "chevron"), (2002, "chevron"),
              (2003, "womens_pga"), (2003, "womens_open"), (2004, "womens_pga"), (2005, "chevron"),
              (2005, "womens_pga"), (2006, "us_womens_open")]
    assert PP.recognised_majors(pg, majors) == 10          # 10 / 72 = 13.9 %


def test_player_page_bullet_list_wins():
    pg = PP.parse("Babe Didrikson Zaharias", wikitext("pl_zaharias"), "W")
    assert pg.tour_wins == 41 and len(pg.tour_win_rows) > 0
    assert PP.recognised_majors(pg, [(1948, "us_womens_open"), (1954, "us_womens_open")]) == 2


def test_inconsistent_win_counts_are_detectable():
    pg = PP.parse("Bobby Locke", wikitext("pl_locke"), "M")
    assert pg.tour_wins != pg.tour_wins_heading           # infobox 15 vs heading 12 -> share left blank


def test_height_weight_units():
    assert PP.parse_height("{{height|ft=5|in=8+1/2}}") == 174.0
    assert PP.parse_height("{{convert|1.88|m|ftin|abbr=on}}") == 188.0
    assert PP.parse_weight("190 lb") == 86.2
    assert PP.parse_height("unknown") is None
