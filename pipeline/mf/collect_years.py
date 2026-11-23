"""Download every major edition's own Wikipedia article (raw only; parsing is separate).

    python -m mf.collect_years
Re-runnable: pages already stored are skipped.
"""
from __future__ import annotations

import json

from . import config, fetch
from .sources import majors as M


def year_titles() -> list[tuple[str, int, str]]:
    out = []
    for m in M.MAJORS:
        rows = M.parse_article(m, fetch.wiki_wikitext(m["article"]).json()["parse"]["wikitext"], config.LAST_SEASON)
        for r in rows:
            if r.status == "held" and r.year_article and str(r.year) in r.year_article \
                    and "LPGA Tour" not in r.year_article:
                out.append((m["id"], r.year, r.year_article))
    return out


def main():
    titles = year_titles()
    ok = missing = failed = 0
    for mid, year, title in titles:
        try:
            d = fetch.wiki_wikitext(title).json()
            if "error" in d:
                missing += 1
            else:
                ok += 1
        except Exception as exc:  # keep going; re-run later picks up what failed
            failed += 1
            print("FAIL", mid, year, title, exc)
    print(json.dumps({"titles": len(titles), "ok": ok, "missing": missing, "failed": failed}))


if __name__ == "__main__":
    main()
