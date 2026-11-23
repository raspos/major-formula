"""Major championships: definitions and champion-table parser.

Source: each championship's English Wikipedia article (CC BY-SA 4.0), whose
'Winners' tables cite the organisers. Every parsed value keeps its raw row.

Recognition periods follow Wikipedia's "Men's / Women's major golf championships"
articles. A year outside the period is never turned into a major edition.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .. import nations, wikitable as wt

# id, gender, Korean name, English name, article, first held, major from, major to, current, host
MAJORS = [
    dict(id="masters", gender="M", name_ko="마스터스", name="Masters Tournament", article="Masters Tournament",
         first_held=1934, major_from=1934, major_to=None, current=True, host="USA",
         default_venue="Augusta National Golf Club"),
    dict(id="us_open", gender="M", name_ko="US오픈", name="U.S. Open", article="U.S. Open (golf)",
         first_held=1895, major_from=1895, major_to=None, current=True, host="USA"),
    dict(id="the_open", gender="M", name_ko="디 오픈", name="The Open Championship", article="The Open Championship",
         first_held=1860, major_from=1860, major_to=None, current=True, host="GBR"),
    dict(id="pga", gender="M", name_ko="PGA 챔피언십", name="PGA Championship", article="PGA Championship",
         first_held=1916, major_from=1916, major_to=None, current=True, host="USA",
         note="match play 1916–1957, stroke play from 1958"),
    dict(id="chevron", gender="W", name_ko="셰브론 챔피언십", name="Chevron Championship", article="Chevron Championship",
         first_held=1972, major_from=1983, major_to=None, current=True, host="USA",
         note="formerly Colgate-Dinah Shore / Nabisco Dinah Shore / Kraft Nabisco / ANA Inspiration"),
    dict(id="us_womens_open", gender="W", name_ko="US여자오픈", name="U.S. Women's Open", article="U.S. Women's Open",
         first_held=1946, major_from=1946, major_to=None, current=True, host="USA"),
    dict(id="womens_pga", gender="W", name_ko="KPMG 여자 PGA 챔피언십", name="Women's PGA Championship",
         article="Women's PGA Championship", first_held=1955, major_from=1955, major_to=None, current=True,
         host="USA", note="LPGA Championship until 2014"),
    dict(id="womens_open", gender="W", name_ko="AIG 여자오픈", name="Women's Open (AIG Women's Open)",
         article="Women's British Open", first_held=1976, major_from=2001, major_to=None, current=True, host="GBR",
         note="LET event from 1976; LPGA major from 2001"),
    dict(id="evian", gender="W", name_ko="에비앙 챔피언십", name="The Evian Championship",
         article="The Evian Championship", first_held=1994, major_from=2013, major_to=None, current=True,
         host="FRA", default_venue="Evian Resort Golf Club", note="Evian Masters 1994–2012 (not a major)"),
    # historic women's majors (mode B only)
    dict(id="western", gender="W", name_ko="여자 웨스턴 오픈", name="Women's Western Open", article="Women's Western Open",
         first_held=1930, major_from=1930, major_to=1967, current=False, host="USA"),
    dict(id="titleholders", gender="W", name_ko="타이틀홀더스 챔피언십", name="Titleholders Championship",
         article="Titleholders Championship", first_held=1937, major_from=1937, major_to=1972, current=False,
         host="USA"),
    dict(id="du_maurier", gender="W", name_ko="뒤모리에 클래식", name="du Maurier Classic",
         article="Du Maurier Classic", first_held=1973, major_from=1979, major_to=2000, current=False, host="CAN",
         note="Canadian Women's Open; major 1979–2000 under the du Maurier name"),
]
BY_ID = {m["id"]: m for m in MAJORS}

NOT_HELD = re.compile(r"cancel+ed|no (?:championship|tournament)|not (?:held|played)|world war|postponed", re.I)


@dataclass
class Person:
    target: str | None
    label: str
    flag: str | None
    amateur: bool
    counter: int | None = None


@dataclass
class ChampionRow:
    major_id: str
    year: int
    status: str                      # held | not_held
    year_article: str | None
    winners: list[Person] = field(default_factory=list)
    runners_up: list[Person] = field(default_factory=list)
    rounds: list[int] | None = None  # winner's round scores when the table prints them
    total: int | None = None
    to_par: int | None = None
    result_text: str | None = None   # match-play result ('5 & 4', '37 holes'), else None
    margin_text: str | None = None
    margin: int | None = None
    playoff: bool | None = None
    holes: int | None = None         # 72 unless the table/notes say otherwise
    venue: str | None = None
    location: str | None = None
    dates: str | None = None
    raw_row: str = ""
    notes: list[str] = field(default_factory=list)


_PERSON = re.compile(
    r"(?:\{\{\s*flag(?:icon|athlete|country)?\s*\|\s*(?P<flag>[^|}]+)[^}]*\}\}\s*)?"
    r"(?:'{2,3}\s*)*"
    r"\[\[(?P<t>[^|\]#]+)(?:#[^|\]]*)?(?:\|(?P<l>[^\]]+))?\]\]"
    r"(?:\s*'{2,3})*", re.S)
_NONPERSON = re.compile(r"^(file|image|category):|^amateur", re.I)


def parse_people(raw: str) -> list[Person]:
    base = wt.strip_noise(raw)
    base = re.sub(r"<sup>.*?</sup>", "", base, flags=re.S | re.I)
    base = re.sub(r"</?small>", "", base, flags=re.I)
    out: list[Person] = []
    cell_amateur = bool(re.search(r"\[\[\s*amateur", base, re.I))
    ms = list(_PERSON.finditer(base))
    for i, m in enumerate(ms):
        target = m.group("t").strip()
        if _NONPERSON.match(target):
            continue
        tail = base[m.end(): ms[i + 1].start() if i + 1 < len(ms) else len(base)]
        # '(a)' marks amateurs; '†' is not used for amateurs in these tables (it is left as a note)
        amateur = bool(re.match(r"\s*(?:\(a\)|\(am\))", tail, re.I)) or cell_amateur
        cm = re.search(r"\((\d{1,2})\)", tail[:20])
        out.append(Person(target, wt.clean_text(m.group("l") or target), nations.normalize_code(m.group("flag")),
                          amateur, int(cm.group(1)) if cm else None))
    if not out:  # unlinked names (e.g. 'Lydia Ko (a) (2)')
        txt = wt.clean_text(raw)
        flags = wt.parse_cell(raw).flags
        for part in re.split(r"\s*/\s*|,\s+|\s+and\s+", txt):
            amateur = bool(re.search(r"\(a\)", part))
            cm = re.search(r"\((\d{1,2})\)", part)
            name = re.sub(r"\([^)]*\)|†|\*", "", part).strip()
            if name and re.search(r"[A-Za-z]{2,}", name) and not re.search(r"\d", name) \
                    and not NOT_HELD.search(name) and name.lower() not in {"n/a", "tbd"}:
                out.append(Person(None, name, nations.normalize_code(flags[0]) if flags else None, amateur,
                                  int(cm.group(1)) if cm else None))
    return out


def _col(headers, *keys, exclude=()):
    for i, h in enumerate(headers):
        hl = h.lower()
        if any(k in hl for k in keys) and not any(x in hl for x in exclude):
            return i
    return None


def _cols(headers, key):
    return [i for i, h in enumerate(headers) if h.lower().startswith(key)]


def _to_par(text: str) -> int | None:
    t = text.replace("−", "-").replace("–", "-").strip()
    m = re.search(r"\(\s*([+-]?\d+|E)\s*\)", t) or re.fullmatch(r"\s*([+-]?\d+|E)\s*", t)
    if not m:
        return None
    v = m.group(1)
    return 0 if v.upper() == "E" else int(v)


def parse_score(cells: list[str]) -> tuple[list[int] | None, int | None, str | None, int | None]:
    """Return (rounds, total, match_result, to_par_inline) from the score cell(s)."""
    txt = " ".join(wt.clean_text(c) for c in cells).replace("–", "-").replace("−", "-")
    if re.search(r"\d+\s*(?:&|and)\s*\d+|\bup\b|\d+\s*holes", txt, re.I) and not re.search(r"\d{3}", txt):
        return None, None, txt.strip(), None
    rounds = None
    m = re.search(r"\b(\d{2})(?:\s*-\s*(\d{2})){1,4}\b", txt)
    if m:
        seg = re.search(r"\d{2}(?:\s*-\s*\d{2})+", txt).group(0)
        parts = [int(x) for x in re.split(r"\s*-\s*", seg)]
        if all(55 <= p <= 100 for p in parts) and 2 <= len(parts) <= 5:
            rounds = parts
    total = None
    for n in re.findall(r"(?<![\d-])(\d{3})(?!\d)", txt):
        if 100 <= int(n) <= 400:
            total = int(n)
    if total is None and rounds:
        total = sum(rounds)
    return rounds, total, None, _to_par(txt) if "(" in txt else None


def _years(text: str) -> list[int]:
    t = text.replace("–", "-")
    m = re.search(r"((?:18|19|20)\d{2})\s*-\s*((?:18|19|20)?\d{2})", t)
    if m:
        a = int(m.group(1)); b = m.group(2)
        b = int(b) if len(b) == 4 else int(str(a)[:2] + b)
        return list(range(a, b + 1))
    ys = [int(y) for y in re.findall(r"(?:18|19|20)\d{2}", t)]
    return ys


def parse_article(major: dict, text: str, last_season: int = 2026) -> list[ChampionRow]:
    lo = major["major_from"]
    hi = min(major["major_to"] or last_season, last_season)
    out: dict[int, ChampionRow] = {}
    for tb in wt.tables(text):
        h = tb.headers
        iy = _col(h, "year")
        iw = _col(h, "winner", "champion", exclude=("share", "multiple"))
        if iy is None or iw is None:
            continue
        ic = _col(h, "country", "nationality")
        isc = _cols(h, "score")
        ipar = _col(h, "to par")
        imar = _col(h, "margin")
        iru = _col(h, "runner")
        iven = _col(h, "venue", "course", "tournament location")
        iloc = _col(h, "location", exclude=("tournament location",))
        if iven is None and iloc is not None and major["id"] == "womens_pga":
            iven, iloc = iloc, None
        idate = _col(h, "date")
        for row in tb.rows:
            row_txt = " || ".join(row)
            first = " ".join(row[:2])
            # 'not held' rows (may span several years and every column)
            if len(row) <= 3 or len({c.strip() for c in row}) == 1:
                if NOT_HELD.search(row_txt):
                    for y in _years(wt.clean_text(first)) or _years(wt.clean_text(row_txt)):
                        if lo <= y <= hi and y not in out:
                            out[y] = ChampionRow(major["id"], y, "not_held", None, raw_row=row_txt)
                continue
            if iy >= len(row) or iw >= len(row):
                continue
            ycell = wt.parse_cell(row[iy])
            ys = re.findall(r"(?:18|19|20)\d{2}", ycell.text)
            if not ys:
                continue
            year = int(ys[0])
            if not lo <= year <= hi or year in out:
                continue
            winners = parse_people(row[iw])
            if NOT_HELD.search(wt.clean_text(row[iw])):
                winners = []
            if not winners:
                if NOT_HELD.search(row_txt):
                    out[year] = ChampionRow(major["id"], year, "not_held", None, raw_row=row_txt)
                continue
            if ic is not None and ic < len(row):
                fl = wt.parse_cell(row[ic]).flags
                for w in winners:
                    w.flag = w.flag or (nations.normalize_code(fl[0]) if fl else None)
            score_cells = [row[i] for i in isc if i < len(row)]
            rounds, total, match_res, tp_inline = parse_score(score_cells)
            to_par = None
            if ipar is not None and ipar < len(row) and row[ipar] not in score_cells:
                to_par = _to_par(wt.clean_text(row[ipar]))
            to_par = to_par if to_par is not None else tp_inline
            margin_text = wt.clean_text(row[imar]) if imar is not None and imar < len(row) else None
            if margin_text and match_res and margin_text == match_res:
                margin_text = None
            margin = None
            playoff = None
            if margin_text:
                playoff = bool(re.search(r"playoff", margin_text, re.I))
                mm = re.match(r"\s*(\d+)\s*stroke", margin_text, re.I)
                margin = int(mm.group(1)) if mm else (0 if playoff else None)
            elif match_res:
                playoff = None
            cr = ChampionRow(
                major["id"], year, "held",
                ycell.links[0].target if ycell.links else None,
                winners=winners,
                runners_up=parse_people(row[iru]) if iru is not None and iru < len(row) else [],
                rounds=rounds, total=None if match_res else total, to_par=None if match_res else to_par,
                result_text=match_res, margin_text=margin_text, margin=margin, playoff=playoff,
                venue=wt.clean_text(row[iven]) if iven is not None and iven < len(row) else major.get("default_venue"),
                location=wt.clean_text(row[iloc]) if iloc is not None and iloc < len(row) else None,
                dates=wt.clean_text(row[idate]) if idate is not None and idate < len(row) else None,
                raw_row=row_txt)
            if rounds:
                cr.holes = 18 * len(rounds)
            if re.search(r"\^|\*", ycell.raw + " ".join(score_cells)):
                cr.notes.append("table marks this edition with ^/* (often shortened or special format)")
            out[year] = cr
    return [out[y] for y in sorted(out)]
