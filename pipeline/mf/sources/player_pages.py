"""Parse a champion's own Wikipedia article.

Extracted (each value keeps its basis; nothing is inferred):
  * official tour wins   : infobox `pga_wins` (men) / `lpga_wins` (women)  — the article's
                           "PGA Tour wins (N)" / "LPGA Tour wins (N)" heading is a second check
  * worldwide pro wins   : infobox `pro_wins` (kept separate; tours are never summed)
  * recognised majors    : the player's majors that appear as rows of the tour-wins table
                           (so the major share uses one definition for numerator and denominator)
  * major record         : 'Summary' table totals row — wins, 2nd, top-10, events (starts), cuts made
  * height / weight      : infobox (date of measurement unknown → status 'listed_undated')
  * year turned pro
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .. import wikitable as wt

# keywords that identify each major inside a tour-wins table row
MAJOR_KEYS = {
    "masters": r"masters tournament|\bmasters\b",
    "us_open": r"u\.?s\.? open",
    "the_open": r"open championship|british open|the open\b",
    "pga": r"pga championship",
    "chevron": r"chevron|kraft nabisco|nabisco|dinah shore|ana inspiration",
    "us_womens_open": r"u\.?s\.? women'?s open",
    "womens_pga": r"(women'?s )?pga championship|lpga championship",
    "womens_open": r"women'?s (british )?open|aig women",
    "evian": r"evian",
    "western": r"western open",
    "titleholders": r"titleholders",
    "du_maurier": r"du maurier|canadian women'?s open",
}


@dataclass
class PlayerPage:
    title: str
    tour: str                          # 'PGA Tour' | 'LPGA Tour'
    tour_wins: int | None = None
    tour_wins_basis: str | None = None
    tour_wins_heading: int | None = None
    pro_wins: int | None = None
    year_pro: int | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    height_raw: str | None = None
    weight_raw: str | None = None
    summary: dict = field(default_factory=dict)      # wins, second, top10, events, cuts
    tour_win_rows: list[tuple[int | None, str]] = field(default_factory=list)  # (year, tournament text)


def _first_int(s: str | None) -> int | None:
    if not s:
        return None
    m = re.search(r"\d+", wt.clean_text(re.sub(r"<!--.*?-->", "", s, flags=re.S)))
    return int(m.group(0)) if m else None


def _num(x) -> float:
    """'8', '8.5', '8+1/2', '8 1/2' -> float"""
    x = str(x).strip().replace("½", "+1/2")
    m = re.fullmatch(r"(\d+(?:\.\d+)?)(?:\s*\+?\s*(\d+)/(\d+))?", x)
    if not m:
        raise ValueError(x)
    return float(m.group(1)) + (int(m.group(2)) / int(m.group(3)) if m.group(2) else 0)


def parse_height(raw: str | None) -> float | None:
    try:
        return _parse_height(raw)
    except (ValueError, ZeroDivisionError):
        return None


def _parse_height(raw: str | None) -> float | None:
    if not raw:
        return None
    s = raw.replace("&nbsp;", " ")
    m = re.search(r"\{\{\s*(?:height|convert)\s*\|([^}]*)\}\}", s, re.I)
    if m:
        p = [x.strip() for x in m.group(1).split("|")]
        named = dict(x.split("=", 1) for x in p if "=" in x)
        if "ft" in named:
            return round((_num(named["ft"]) * 12 + _num(named.get("in", 0) or 0)) * 2.54, 1)
        if "m" in named:
            return round(float(named["m"]) * 100, 1)
        if "cm" in named:
            return float(named["cm"])
        if len(p) >= 2:      # {{convert|1.88|m|...}} / {{convert|6|ft|2|in}}
            try:
                if p[1] in ("m",):
                    return round(float(p[0]) * 100, 1)
                if p[1] == "cm":
                    return float(p[0])
                if p[1] == "ft":
                    inch = float(p[2]) if len(p) > 3 and p[3] == "in" else 0
                    return round((float(p[0]) * 12 + inch) * 2.54, 1)
            except ValueError:
                return None
    t = wt.clean_text(s)
    m = re.search(r"(\d)\s*(?:ft|feet|foot|′|')\s*(\d{1,2}(?:\.\d)?)?\s*(?:in|inch|″|\")?", t)
    if m:
        return round((int(m.group(1)) * 12 + float(m.group(2) or 0)) * 2.54, 1)
    m = re.search(r"(1\.\d{2})\s*m\b", t)
    if m:
        return round(float(m.group(1)) * 100, 1)
    m = re.search(r"(1\d{2})\s*cm", t)
    if m:
        return float(m.group(1))
    return None


def parse_weight(raw: str | None) -> float | None:
    try:
        return _parse_weight(raw)
    except ValueError:
        return None


def _parse_weight(raw: str | None) -> float | None:
    if not raw:
        return None
    s = raw.replace("&nbsp;", " ")
    m = re.search(r"\{\{\s*convert\s*\|\s*([\d.]+)\s*\|\s*(kg|lb|st)", s, re.I)
    if m:
        v, u = float(m.group(1)), m.group(2).lower()
        return round(v if u == "kg" else v * 0.4536 if u == "lb" else v * 6.35, 1)
    t = wt.clean_text(s)
    m = re.search(r"([\d.]+)\s*kg", t)
    if m:
        return float(m.group(1))
    m = re.search(r"([\d.]+)\s*(?:lb|pounds)", t)
    if m:
        return round(float(m.group(1)) * 0.4536, 1)
    return None


def parse(title: str, text: str, gender: str) -> PlayerPage:
    tour = "PGA Tour" if gender == "M" else "LPGA Tour"
    pg = PlayerPage(title, tour)
    ib = wt.infobox(text, "Infobox golfer")
    keys = ("pga_wins", "pgawins", "pga tour wins") if gender == "M" else ("lpga_wins", "lpgawins")
    for k in keys:
        if ib.get(k):
            pg.tour_wins, pg.tour_wins_basis = _first_int(ib[k]), f"infobox {k}"
            break
    pg.pro_wins = _first_int(ib.get("pro_wins") or ib.get("prowins"))
    pg.year_pro = _first_int(ib.get("year_pro") or ib.get("yearpro") or ib.get("turnedpro"))
    pg.height_raw, pg.weight_raw = ib.get("height") or None, ib.get("weight") or None
    pg.height_cm = parse_height(pg.height_raw)
    pg.weight_kg = parse_weight(pg.weight_raw)
    if pg.height_cm is not None and not 140 <= pg.height_cm <= 215:
        pg.height_cm = None
    if pg.weight_kg is not None and not 40 <= pg.weight_kg <= 160:
        pg.weight_kg = None
    head = re.search(rf"^==+\s*{re.escape(tour)} wins\s*\((\d+)\)\s*==+", text, re.M | re.I)
    pg.tour_wins_heading = int(head.group(1)) if head else None
    if pg.tour_wins is None and pg.tour_wins_heading is not None:
        pg.tour_wins, pg.tour_wins_basis = pg.tour_wins_heading, "section heading"
    for tb in wt.tables(text):
        h = (tb.heading or "").lower()
        if re.match(rf"{re.escape(tour.lower())} wins", h) and any("tournament" in x.lower() for x in tb.headers):
            it = next(i for i, x in enumerate(tb.headers) if "tournament" in x.lower())
            idt = next((i for i, x in enumerate(tb.headers) if x.lower() in ("date", "year")), None)
            if any("opponent" in x.lower() for x in tb.headers) and not any("score" in x.lower() for x in tb.headers):
                continue   # playoff record table
            for r in tb.rows:
                if it >= len(r):
                    continue
                y = None
                if idt is not None and idt < len(r):
                    ym = re.search(r"(18|19|20)\d{2}", wt.clean_text(r[idt]))
                    y = int(ym.group(0)) if ym else None
                pg.tour_win_rows.append((y, wt.clean_text(r[it]) + " " + " ".join(l.target for l in wt.parse_cell(r[it]).links)))
        if h.startswith("summary") and any(x.lower() == "events" for x in tb.headers):
            col = {x.lower(): i for i, x in enumerate(tb.headers)}
            tot = next((r for r in tb.rows if wt.clean_text(r[0]).lower().startswith("total")), None)
            if tot:
                g = lambda k: _first_int(tot[col[k]]) if k in col and col[k] < len(tot) else None
                pg.summary = {"wins": g("wins"), "second": g("2nd"), "top10": g("top-10"), "top5": g("top-5"),
                              "events": g("events"), "cuts": g("cuts made")}
    if not pg.tour_win_rows:
        # older articles list tour wins as bullets under the "<Tour> wins (N)" heading (and sub-headings)
        m = re.search(rf"^(==+)\s*{re.escape(tour)} wins\s*\(\d+\)\s*==+\s*$", text, re.M | re.I)
        if m:
            lvl = len(m.group(1))
            rest = text[m.end():]
            stop = re.search(rf"^={{2,{lvl}}}[^=].*?=+\s*$", rest, re.M)
            block = rest[:stop.start()] if stop else rest
            year = None
            for line in block.splitlines():
                ys = re.findall(r"(?<!\d)(18|19|20)(\d{2})(?!\d)", wt.clean_text(line))
                if line.lstrip().startswith(("*", "#")):
                    y = int("".join(ys[0])) if ys else year
                    pg.tour_win_rows.append((y, wt.clean_text(line) + " " + " ".join(
                        l.target for l in wt.parse_cell(line).links)))
                elif ys and re.match(r"^\s*(?:'''|;|\(|=)?\s*(?:18|19|20)\d{2}", wt.clean_text(line) or ""):
                    year = int("".join(ys[0]))   # year line introducing a bullet group
    return pg


def career_subpages(text: str) -> list[str]:
    """Linked 'career achievements' / 'professional golf career' articles that hold the wins list."""
    out = []
    for m in re.finditer(r"\{\{\s*(?:main|see also|further)\s*\|([^}]+)\}\}", text, re.I):
        for t in m.group(1).split("|"):
            t = t.split("#")[0].strip()
            if re.search(r"career achievements|professional golf career|list of .* wins", t, re.I) and t not in out:
                out.append(t)
    return out


def recognised_majors(pg: PlayerPage, majors: list[tuple[int, str]]) -> int | None:
    """How many of (year, tournament_id) majors appear as rows of the tour-wins table."""
    if not pg.tour_win_rows:
        return None
    n = 0
    for year, tid in majors:
        rx = re.compile(MAJOR_KEYS[tid], re.I)
        if any((y == year) and rx.search(txt) for y, txt in pg.tour_win_rows):
            n += 1
    return n
