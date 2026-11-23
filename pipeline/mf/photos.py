"""Real player photos from Wikimedia Commons, kept only under reusable licences.

The Wikidata image (P18) file of each champion is looked up on Commons with its
licence and author. Accepted: CC0, public domain, CC BY, CC BY-SA. Anything else
(fair use, unknown, non-commercial) is skipped. The website shows the author and
licence with every photo and links to the file page.
"""
from __future__ import annotations

import html
import re
import urllib.parse

from . import fetch

API = "https://commons.wikimedia.org/w/api.php"
OK_LICENSE = re.compile(r"^(cc0|public domain|pd\b|pd-|cc[- ]by(-sa)?[- ]?\d|cc by(-sa)? \d)", re.I)


def _strip(s: str | None) -> str | None:
    if not s:
        return None
    t = html.unescape(re.sub(r"<[^>]+>", "", s))
    return re.sub(r"\s+", " ", t).strip()[:160] or None


def lookup(files: list[str]) -> dict[str, dict]:
    out = {}
    for i in range(0, len(files), 50):
        batch = files[i:i + 50]
        q = urllib.parse.urlencode({"action": "query", "titles": "|".join("File:" + f for f in batch),
                                    "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": "320",
                                    "format": "json", "formatversion": "2"})
        d = fetch.fetch(f"{API}?{q}", "commons").json()
        norm = {n["to"]: n["from"] for n in d.get("query", {}).get("normalized", [])}
        for p in d.get("query", {}).get("pages", []):
            ii = (p.get("imageinfo") or [None])[0]
            if not ii:
                continue
            md = ii.get("extmetadata", {})
            lic = (md.get("LicenseShortName") or {}).get("value", "")
            if not OK_LICENSE.search(lic.strip()):
                continue
            name = norm.get(p["title"], p["title"]).removeprefix("File:")
            out[name] = {
                "thumb": ii.get("thumburl") or ii.get("url"),
                "page": ii.get("descriptionurl"),
                "license": lic.strip(),
                "license_url": (md.get("LicenseUrl") or {}).get("value"),
                "artist": _strip((md.get("Artist") or {}).get("value")) or "작자 미상",
            }
    return out
