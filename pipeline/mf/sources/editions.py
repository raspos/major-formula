"""Parse one edition's own Wikipedia article ('2019 Masters Tournament').

Extracts, when present:
  * infobox: dates, par, course
  * round leaderboards ('First round' ... 'Third round', 'Final round' / 'Final leaderboard'):
    place, player, flag, round-by-round strokes, to par
  * whether a 'Playoff' section exists

The leaderboards in these articles usually show only the top of the field
(roughly the top 10 plus ties). Rows that are shown are taken as printed; rows
that are not shown are never inferred.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .. import wikitable as wt
from .majors import parse_people

MONTHS = {m: i for i, m in enumerate(["january", "february", "march", "april", "may", "june", "july", "august",
                                      "september", "october", "november", "december"], 1)}
ROUND_HEADINGS = [
    (1, re.compile(r"^(first round|round 1|round one)\b", re.I)),
    (2, re.compile(r"^(second round|round 2|round two)\b", re.I)),
    (3, re.compile(r"^(third round|round 3|round three)\b", re.I)),
    (4, re.compile(r"^(final round|fourth round|round 4|final leaderboard|final results|leaderboard)\b", re.I)),
]


@dataclass
class BoardRow:
    place: str
    position: int | None
    tied: bool
    target: str | None
    label: str
    flag: str | None
    amateur: bool
    rounds: list[int]
    total: int | None
    to_par: int | None
    raw: str


@dataclass
class Edition:
    title: str
    end_date: str | None = None
    date_basis: str | None = None
    par: int | None = None
    course: str | None = None
    boards: dict[int, list[BoardRow]] = field(default_factory=dict)   # after round n
    playoff_section: bool = False


def _place(txt: str) -> tuple[int | None, bool]:
    t = txt.strip().upper().replace("=", "T")
    m = re.match(r"^(T)?\s*(\d{1,3})$", t)
    if not m:
        return None, False
    return int(m.group(2)), bool(m.group(1))


def _score(txt: str) -> tuple[list[int], int | None]:
    t = wt.clean_text(txt).replace("–", "-").replace("−", "-")
    m = re.search(r"((?:\d{2}\s*-\s*)*\d{2})\s*=\s*(\d{2,3})", t)
    if m:
        rounds = [int(x) for x in re.split(r"\s*-\s*", m.group(1))]
        return rounds, int(m.group(2))
    m = re.fullmatch(r"\s*(\d{2})\s*", t)
    if m:
        return [int(m.group(1))], int(m.group(1))
    return [], None


def _to_par(txt: str) -> int | None:
    t = wt.clean_text(txt).replace("−", "-").replace("–", "-").strip()
    if t.upper() == "E":
        return 0
    m = re.fullmatch(r"([+-]?\d{1,3})", t)
    return int(m.group(1)) if m else None


def _col(h, *keys):
    for i, x in enumerate(h):
        if any(k in x.lower() for k in keys):
            return i
    return None


def parse_board(tb) -> list[BoardRow]:
    h = tb.headers
    ip, iname = _col(h, "place", "pos"), _col(h, "player", "name")
    isc, ipar = _col(h, "score"), _col(h, "to par")
    if ip is None or iname is None or isc is None:
        return []
    # in-progress snapshots (weather delays) carry a 'Hole' / 'Thru' column: not a completed round
    if any(x.strip().lower() in ("hole", "holes", "thru", "through") for x in h):
        return []
    out = []
    for row in tb.rows:
        if len(row) <= max(ip, iname, isc):
            continue
        place = wt.clean_text(row[ip])
        pos, tied = _place(place)
        if pos is None:
            continue
        people = parse_people(row[iname])
        if not people:
            continue
        p = people[0]
        rounds, total = _score(row[isc])
        out.append(BoardRow(place, pos, tied, p.target, p.label, p.flag, p.amateur, rounds, total,
                            _to_par(row[ipar]) if ipar is not None and ipar < len(row) else None,
                            " || ".join(row)))
    return out


def _date_from_text(text: str, year: int) -> tuple[str | None, str | None]:
    t = wt.clean_text(text)
    # 'April 7–10, 2022' / 'April 30 – May 3, 2020' / '7–10 April 2022'
    pats = [
        r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[–-]\s*(?:(January|February|March|April|May|June|July|August|September|October|November|December)\s+)?(\d{1,2}),?\s+(\d{4})",
        r"\d{1,2}\s*[–-]\s*(\d{1,2})\s+(?:(January|February|March|April|May|June|July|August|September|October|November|December)\s*[–-]?\s*\d{0,2}\s*)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})",
    ]
    m = re.search(pats[0], t)
    if m and int(m.group(4)) == year:
        mon = (m.group(2) or m.group(1)).lower()
        return f"{year:04d}-{MONTHS[mon]:02d}-{int(m.group(3)):02d}", "date range in article"
    m = re.search(pats[1], t)
    if m and int(m.group(4)) == year:
        return f"{year:04d}-{MONTHS[m.group(3).lower()]:02d}-{int(m.group(1)):02d}", "date range in article"
    return None, None


def parse_edition(title: str, text: str, year: int) -> Edition:
    ed = Edition(title=title)
    m = re.search(r"\{\{\s*Infobox[^|]*", text, re.I)
    ib = wt.infobox(text, m.group(0)[2:].strip()) if m else {}
    for k in ("dates", "date"):
        if ib.get(k):
            ed.end_date, ed.date_basis = _date_from_text(ib[k] + f", {year}" if str(year) not in ib[k] else ib[k], year)
            if ed.end_date:
                ed.date_basis = "infobox dates"
                break
    if not ed.end_date:
        ed.end_date, ed.date_basis = _date_from_text(text[:6000], year)
    if ib.get("par"):
        pm = re.search(r"\d{2}", wt.clean_text(ib["par"]))
        ed.par = int(pm.group(0)) if pm else None
    if ib.get("course") or ib.get("location"):
        ed.course = wt.clean_text(ib.get("course") or ib.get("location"))[:120]
    ed.playoff_section = bool(re.search(r"^==+\s*playoff", text, re.I | re.M))
    for tb in wt.tables(text):
        heading = (tb.heading or "").strip()
        for n, rx in ROUND_HEADINGS:
            if rx.search(heading):
                rows = parse_board(tb)
                # A board 'after round n' must show n rounds of scores; weather-delayed articles sometimes
                # put the 36-hole leaderboard under 'Third round'. Rows with another count are dropped.
                if n < 4 and any(r.rounds for r in rows):
                    rows = [r for r in rows if len(r.rounds) == n]
                    if not any(r.position == 1 for r in rows):
                        rows = []   # leader row did not survive: partial snapshot, unusable
                if rows and n not in ed.boards:
                    ed.boards[n] = rows
                elif rows and n == 4:
                    ed.boards[4].extend(r for r in rows if (r.target, r.label) not in
                                        {(x.target, x.label) for x in ed.boards[4]})
                break
    if 4 not in ed.boards:
        # final leaderboard placed under a narrative sub-heading (e.g. "Van de Velde's collapse"):
        # accept a Place/Player/Score table whose rows mostly show four rounds
        for tb in wt.tables(text):
            if re.search(r"playoff|scorecard|course", tb.heading or "", re.I):
                continue
            rows = parse_board(tb)
            if rows and sum(len(r.rounds) == 4 for r in rows) >= max(3, len(rows) // 2):
                ed.boards[4] = [r for r in rows if len(r.rounds) == 4]
                break
    return ed
