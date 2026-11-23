"""Collect Korean Wikipedia titles for every person in the exported data.

Looks up en.wikipedia langlinks (ko) in batches of 50, keeping only pages that
are not disambiguation pages and whose short description mentions golf. The
result (data/names_ko_kowiki.json) is one input to data/names_ko.json, which
also holds rule-based transliterations (see METHODOLOGY.md).
"""
from __future__ import annotations

import json
import re
import urllib.parse

from . import config
from .fetch import WIKI_API, fetch

WEB_DATA = config.ROOT / "web" / "public" / "data"
OUT = config.ROOT / "data" / "names_ko_kowiki.json"


def people() -> dict[str, dict]:
    """player_id -> {name, nation} over players, editions and boards."""
    out: dict[str, dict] = {}

    def add(pid, name, nation=None):
        if not pid:
            return
        rec = out.setdefault(pid, {"name": name, "nations": set()})
        if nation:
            rec["nations"].add(nation)

    for p in json.loads((WEB_DATA / "players.json").read_text(encoding="utf-8")):
        add(p["player_id"], p["name"])
        for w in p.get("wins") or []:
            add(p["player_id"], p["name"], w.get("nation_code"))
    for e in json.loads((WEB_DATA / "editions.json").read_text(encoding="utf-8")):
        if e.get("champion"):
            add(e["champion"]["player_id"], e["champion"]["name"], e["champion"].get("nation_code"))
        for r in e.get("runners_up") or []:
            add(r.get("player_id"), r["name"], r.get("nation_code"))
    for ed in json.loads((WEB_DATA / "boards.json").read_text(encoding="utf-8")).values():
        for rows in ed.values():
            for r in rows:
                add(r.get("player_id"), r["name"], r.get("nation_code"))
    return out


def collect() -> dict:
    ppl = people()
    titles = sorted(pid[3:] for pid in ppl if pid.startswith("wp:"))
    found: dict[str, dict] = {}
    for i in range(0, len(titles), 50):
        batch = titles[i:i + 50]
        q = urllib.parse.urlencode({"action": "query", "titles": "|".join(batch), "redirects": "1",
                                    "prop": "langlinks|pageprops|description", "lllang": "ko", "lllimit": "max",
                                    "format": "json", "formatversion": "2"})
        d = fetch(f"{WIKI_API}?{q}", "wikipedia").json()["query"]
        back = {}
        for m in d.get("normalized", []) + d.get("redirects", []):
            back[m["to"]] = back.get(m["from"], m["from"])
        for pg in d.get("pages", []):
            src = back.get(pg["title"], pg["title"])
            src = back.get(src, src)
            ll = pg.get("langlinks") or []
            desc = pg.get("description", "")
            if not ll or "disambiguation" in (pg.get("pageprops") or {}):
                continue
            if not re.search(r"golf", desc, re.I):
                continue
            ko = re.sub(r"\s*\([^)]*\)$", "", ll[0]["title"]).strip()
            found["wp:" + src] = {"ko": ko, "kowiki": ll[0]["title"], "desc": desc}
    OUT.write_text(json.dumps(found, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    people_out = {pid: {"name": r["name"], "nations": sorted(r["nations"])} for pid, r in ppl.items()}
    (config.ROOT / "data" / "names_people.json").write_text(json.dumps(people_out, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    return {"people": len(ppl), "kowiki": len(found)}


if __name__ == "__main__":
    print(collect())
