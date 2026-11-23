"""Birth dates, citizenship and image file names from Wikidata (CC0).

Looked up by the player's canonical English Wikipedia title. Only four
properties are kept: P569 date of birth, P27 country of citizenship (used only
as a fallback flag, marked as such), P18 image file name (for later photo work),
P21 sex.
"""
from __future__ import annotations

import urllib.parse

from . import fetch

API = "https://www.wikidata.org/w/api.php"


def _get(params: dict) -> dict:
    return fetch.fetch(f"{API}?{urllib.parse.urlencode(params)}", "wikidata").json()


def _time(claim) -> tuple[str | None, int | None]:
    try:
        v = claim["mainsnak"]["datavalue"]["value"]
    except (KeyError, TypeError):
        return None, None
    t = v["time"]  # '+1940-01-21T00:00:00Z', precision 11 = day, 10 = month, 9 = year
    return t[1:11], v.get("precision")


def _best(claims: list) -> list:
    pref = [c for c in claims if c.get("rank") == "preferred"]
    return pref or [c for c in claims if c.get("rank") != "deprecated"]


def lookup(titles: list[str]) -> dict[str, dict]:
    """Map enwiki title -> {qid, dob, dob_precision, citizenship_qids, image, sex_qid}."""
    out: dict[str, dict] = {}
    for i in range(0, len(titles), 50):
        batch = titles[i:i + 50]
        d = _get({"action": "wbgetentities", "sites": "enwiki", "titles": "|".join(batch),
                  "props": "claims|sitelinks", "sitefilter": "enwiki", "format": "json"})
        for qid, ent in d.get("entities", {}).items():
            if "missing" in ent:
                continue
            title = ent.get("sitelinks", {}).get("enwiki", {}).get("title")
            if not title:
                continue
            cl = ent.get("claims", {})
            dob, prec = (None, None)
            if cl.get("P569"):
                dob, prec = _time(_best(cl["P569"])[0])
            cits = []
            for c in _best(cl.get("P27", [])):
                try:
                    cits.append(c["mainsnak"]["datavalue"]["value"]["id"])
                except (KeyError, TypeError):
                    pass
            img = None
            if cl.get("P18"):
                try:
                    img = _best(cl["P18"])[0]["mainsnak"]["datavalue"]["value"]
                except (KeyError, TypeError, IndexError):
                    pass
            sex = None
            if cl.get("P21"):
                try:
                    sex = _best(cl["P21"])[0]["mainsnak"]["datavalue"]["value"]["id"]
                except (KeyError, TypeError, IndexError):
                    pass
            out[title] = {"qid": qid, "dob": dob, "dob_precision": prec, "citizenship_qids": cits,
                          "image": img, "sex_qid": sex}
    return out


def country_codes(qids: list[str]) -> dict[str, str]:
    """Country QID -> IOC code (P984), falling back to ISO alpha-3 (P298)."""
    out = {}
    for i in range(0, len(qids), 50):
        d = _get({"action": "wbgetentities", "ids": "|".join(qids[i:i + 50]), "props": "claims", "format": "json"})
        for qid, ent in d.get("entities", {}).items():
            cl = ent.get("claims", {})
            for p in ("P984", "P298"):
                if cl.get(p):
                    try:
                        out[qid] = _best(cl[p])[0]["mainsnak"]["datavalue"]["value"].upper()
                        break
                    except (KeyError, TypeError, IndexError):
                        pass
    return out
