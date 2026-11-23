"""Download every major champion's own Wikipedia article (raw only).

    python -m mf.collect_players
Re-runnable: stored pages are skipped. Parsing lives in sources/player_pages.py.
"""
from __future__ import annotations

import json

from . import fetch
from .build import connect


def titles() -> list[str]:
    con = connect()
    out = [t for (t,) in con.execute("""SELECT DISTINCT p.wiki_title FROM players p JOIN champions c USING(player_id)
                                        WHERE p.wiki_title IS NOT NULL ORDER BY p.wiki_title""")]
    con.close()
    return out


def main():
    ok = failed = 0
    for t in titles():
        try:
            fetch.wiki_wikitext(t)
            ok += 1
        except Exception as exc:
            failed += 1
            print("FAIL", t, exc)
    print(json.dumps({"ok": ok, "failed": failed}))


if __name__ == "__main__":
    main()
