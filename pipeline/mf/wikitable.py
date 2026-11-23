"""Minimal, dependency-free wikitext helpers.

Only what the LPGA season / championship pages need: locate tables with the
section heading they sit under, split rows and cells (both `||` inline and
one-cell-per-line styles), strip cell attributes, honour rowspan, and pull
links / flag icons / bold markers out of a cell.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

# tolerate unbalanced markers such as '==Final round===' (seen in real articles)
HEADING_RE = re.compile(r"^(={2,6})\s*([^=].*?)\s*={2,6}\s*$", re.M)


@dataclass
class Table:
    heading: str            # nearest preceding section heading ('' if none)
    headers: list[str]
    rows: list[list[str]]   # raw cell wikitext, rowspans expanded
    start: int              # char offset in page


@dataclass
class Link:
    target: str
    label: str


@dataclass
class Cell:
    raw: str
    text: str
    links: list[Link] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)
    bold: bool = False
    italic: bool = False


def _split_top(s: str, sep: str) -> list[str]:
    """Split on `sep` only outside [[ ]] and {{ }}."""
    out, buf, depth_l, depth_t, i = [], [], 0, 0, 0
    n = len(sep)
    while i < len(s):
        two = s[i:i + 2]
        if two == "[[":
            depth_l += 1; buf.append(two); i += 2; continue
        if two == "]]" and depth_l:
            depth_l -= 1; buf.append(two); i += 2; continue
        if two == "{{":
            depth_t += 1; buf.append(two); i += 2; continue
        if two == "}}" and depth_t:
            depth_t -= 1; buf.append(two); i += 2; continue
        if not depth_l and not depth_t and s[i:i + n] == sep:
            out.append("".join(buf)); buf = []; i += n; continue
        buf.append(s[i]); i += 1
    out.append("".join(buf))
    return out


_ATTR_RE = re.compile(r'^\s*(?:[a-zA-Z\-]+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s|]+)\s*)+$')


def _strip_attrs(cell: str) -> tuple[str, dict]:
    parts = _split_top(cell, "|")
    if len(parts) >= 2 and _ATTR_RE.match(parts[0]):
        attrs = dict(re.findall(r'([a-zA-Z\-]+)\s*=\s*"?([^"\s|]+)"?', parts[0]))
        return "|".join(parts[1:]), {k.lower(): v for k, v in attrs.items()}
    return cell, {}


def _find_tables(text: str) -> list[tuple[int, int]]:
    spans, stack = [], []
    for m in re.finditer(r"^\s*(\{\||\|\})", text, re.M):
        if m.group(1) == "{|":
            stack.append(m.start())
        elif stack:
            s = stack.pop()
            if not stack:
                spans.append((s, m.end()))
    return spans


def tables(text: str) -> list[Table]:
    headings = [(m.start(), m.group(2)) for m in HEADING_RE.finditer(text)]
    out = []
    for s, e in _find_tables(text):
        body = text[s:e]
        heading = ""
        for pos, h in headings:
            if pos < s:
                heading = h
        out.append(_parse_table(body, heading, s))
    return out


def _parse_table(body: str, heading: str, start: int) -> Table:
    lines = body.splitlines()[1:]  # drop '{|' line
    headers: list[str] = []
    rows_raw: list[list[tuple[str, dict]]] = []
    cur: list[tuple[str, dict]] | None = None
    in_header_row = False
    for line in lines:
        st = line.strip()
        if st.startswith("|}"):
            break
        if st.startswith("|+"):
            continue
        if st.startswith("|-"):
            if cur:
                rows_raw.append(cur)
            cur = []
            in_header_row = False
            continue
        if st.startswith("!"):
            cells = [x for c in _split_top(st[1:], "!!") for x in _split_top(c, "||")]
            if rows_raw or (cur and len(cur) > 0):
                # '!' inside the body: a spanning section label or a row-header cell
                if "colspan" in st.lower() and len(cells) == 1:
                    continue
                if cur is None:
                    cur = []
                for c in cells:
                    cur.append(_strip_attrs(c))
                continue
            for c in cells:
                txt, attrs = _strip_attrs(c)
                span = int(attrs["colspan"]) if attrs.get("colspan", "").isdigit() else 1
                label = clean_text(txt)
                headers.append(label)
                headers.extend(f"{label}#{k}" for k in range(2, span + 1))
            in_header_row = True
            continue
        if st.startswith("|"):
            if cur is None:
                cur = []
            for c in _split_top(st[1:], "||"):
                cur.append(_strip_attrs(c))
            continue
        # continuation of previous cell
        if cur:
            txt, attrs = cur[-1]
            cur[-1] = (txt + "\n" + line, attrs)
        elif in_header_row and headers:
            headers[-1] = headers[-1] + " " + clean_text(line)
    if cur:
        rows_raw.append(cur)

    # expand rowspans
    rows: list[list[str]] = []
    carry: dict[int, tuple[str, int]] = {}
    for raw in rows_raw:
        row: list[str] = []
        it = iter(raw)
        col = 0
        pending = list(raw)
        while pending or col in carry:
            if col in carry:
                val, left = carry[col]
                row.append(val)
                if left <= 1:
                    del carry[col]
                else:
                    carry[col] = (val, left - 1)
                col += 1
                continue
            txt, attrs = pending.pop(0)
            span = attrs.get("rowspan")
            cspan = int(attrs["colspan"]) if attrs.get("colspan", "").isdigit() else 1
            for k in range(cspan):
                if span and span.isdigit() and int(span) > 1:
                    carry[col] = (txt, int(span) - 1)
                row.append(txt)
                col += 1
        del it
        rows.append(row)
    return Table(heading=heading, headers=headers, rows=rows, start=start)


_REF_RE = re.compile(r"<ref[^>/]*/>|<ref[^>]*>.*?</ref>", re.S | re.I)
_COMMENT_RE = re.compile(r"<!--.*?-->", re.S)


_NOTE_TPL = re.compile(r"\{\{\s*(?:efn|refn|ref label|sfn|cn|citation needed|notetag|r)(?=\s*[|}])", re.I)


def _drop_templates(s: str, start_re: re.Pattern) -> str:
    """Remove templates matched by start_re, honouring nested {{ }}."""
    out, i = [], 0
    while True:
        m = start_re.search(s, i)
        if not m:
            out.append(s[i:])
            return "".join(out)
        out.append(s[i:m.start()])
        depth, j = 0, m.start()
        while j < len(s):
            if s.startswith("{{", j):
                depth += 1; j += 2; continue
            if s.startswith("}}", j):
                depth -= 1; j += 2
                if depth == 0:
                    break
                continue
            j += 1
        i = j


def strip_noise(s: str) -> str:
    s = _COMMENT_RE.sub("", s)
    s = _REF_RE.sub("", s)
    s = _drop_templates(s, _NOTE_TPL)
    return s


def clean_text(s: str) -> str:
    s = strip_noise(s)
    s = re.sub(r"<sup>.*?</sup>", "", s, flags=re.S | re.I)
    s = re.sub(r"<br\s*/?>", " / ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\{\{\s*flag(?:icon|athlete|country)?\s*\|[^{}]*\}\}", "", s, flags=re.I)
    s = re.sub(r"\{\{\s*(?:nowrap|nobr)\s*\|([^{}]*)\}\}", r"\1", s, flags=re.I)
    s = re.sub(r"\{\{\s*(?:sort|sortname|dts|date)\s*\|[^{}]*\}\}",
               lambda m: _sort_template(m.group(0)), s, flags=re.I)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\[https?://\S+\s*([^\]]*)\]", r"\1", s)
    s = s.replace("'''", "").replace("''", "")
    s = s.replace("&nbsp;", " ").replace("&ndash;", "–").replace("&minus;", "−")
    return re.sub(r"\s+", " ", s).strip()


def _sort_template(t: str) -> str:
    parts = [p.strip() for p in t.strip("{}").split("|")[1:] if "=" not in p]
    return parts[-1] if parts else ""


_LINK_RE = re.compile(r"\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|([^\]]*))?\]\]")
_FLAG_RE = re.compile(r"\{\{\s*flag(?:icon|athlete|country)?\s*\|\s*([^|}]+)", re.I)
_BARE_FLAG_RE = re.compile(r"\{\{\s*([A-Z]{3})\s*\}\}")


def parse_cell(raw: str) -> Cell:
    base = strip_noise(raw)
    no_sup = re.sub(r"<sup>.*?</sup>", "", base, flags=re.S | re.I)
    links = [Link(m.group(1).strip(), (m.group(2) or m.group(1)).strip())
             for m in _LINK_RE.finditer(no_sup)]
    flags = [f.strip() for f in _FLAG_RE.findall(no_sup)] + _BARE_FLAG_RE.findall(no_sup)
    return Cell(raw=raw, text=clean_text(raw), links=links, flags=flags,
                bold="'''" in no_sup, italic=bool(re.search(r"(?<!')''(?!')", no_sup)))


def infobox(text: str, name: str) -> dict[str, str]:
    m = re.search(r"\{\{\s*" + re.escape(name), text, re.I)
    if not m:
        return {}
    depth, i = 0, m.start()
    while i < len(text):
        if text.startswith("{{", i):
            depth += 1; i += 2; continue
        if text.startswith("}}", i):
            depth -= 1; i += 2
            if depth == 0:
                break
            continue
        i += 1
    body = text[m.end():i - 2]
    out = {}
    for part in _split_top(body, "|")[1:]:
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip().lower()] = v.strip()
    return out
