"""Build Korean display names for every person (data/names_ko.json).

Priority: whole-name entries (data/names_ko_full.txt) > Korean Wikipedia title
(data/names_ko_kowiki.json) > token dictionary (data/names_ko_tokens.txt).
Token rendering keeps one Hangul form per English token across all people.
The English `name` in the data is never changed; the web app looks names up here.
"""
from __future__ import annotations

import json
import re

from . import config

D = config.ROOT / "data"
WEB = config.ROOT / "web" / "public" / "data" / "names_ko.json"


def clean(name: str) -> str:
    name = name.split("|")[0]
    return re.sub(r"\s*\([^)]*\)", "", name).strip()


def load_tokens() -> tuple[dict[str, str], dict[str, str]]:
    tok, last = {}, {}
    for line in (D / "names_ko_tokens.txt").read_text(encoding="utf-8").splitlines():
        if line.startswith("#"):
            continue
        for item in line.split():
            k, _, v = item.partition("=")
            if k.startswith("last:"):
                last[k[5:]] = v
            else:
                if k in tok and tok[k] != v:
                    raise ValueError(f"token {k} has two forms: {tok[k]} / {v}")
                tok[k] = v
    return tok, last


def load_full() -> dict[str, tuple[str, str]]:
    out = {}
    for line in (D / "names_ko_full.txt").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        k, _, rest = line.partition("=")
        ko, _, basis = rest.partition("|")
        out[k.strip()] = (ko.strip(), basis.strip() or "rule")
    return out


def by_tokens(name: str, tok: dict, last: dict) -> tuple[str | None, list[str]]:
    parts = name.split()
    out, missing = [], []
    for i, t in enumerate(parts):
        v = last.get(t) if i == len(parts) - 1 and i > 0 else None
        v = v or tok.get(t)
        if v is None:
            missing.append(t)
        else:
            out.append(v)
    return (" ".join(out) if not missing else None), missing


def build() -> dict:
    people = json.loads((D / "names_people.json").read_text(encoding="utf-8"))
    kowiki = json.loads((D / "names_ko_kowiki.json").read_text(encoding="utf-8"))
    tok, last = load_tokens()
    full = load_full()
    result, missing, conflicts = {}, {}, []
    for pid, rec in sorted(people.items()):
        name = clean(rec["name"])
        if name in full:
            ko, basis = full[name]
        elif pid in kowiki:
            ko, basis = kowiki[pid]["ko"], "kowiki"
            rule, _ = by_tokens(name, tok, last)
            if rule and rule.replace(" ", "") != ko.replace(" ", ""):
                conflicts.append((name, ko, rule))
        else:
            ko, miss = by_tokens(name, tok, last)
            basis = "rule-en"
            if ko is None:
                for m in miss:
                    missing.setdefault(m, []).append(name)
                continue
        result[pid] = {"ko": ko, "basis": basis}
    out = {"names": result, "missing_tokens": missing, "kowiki_vs_rule": conflicts}
    (D / "names_ko.json").write_text(json.dumps(out, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    by_name: dict[str, str] = {}
    for pid, r in result.items():
        for key in (people[pid]["name"], clean(people[pid]["name"])):
            by_name.setdefault(key, r["ko"])
    web = {"byId": {pid: r["ko"] for pid, r in result.items()}, "byName": by_name}
    WEB.write_text(json.dumps(web, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    counts: dict[str, int] = {}
    for r in result.values():
        b = "check" if r["basis"] == "check" else r["basis"].split("-")[0]
        counts[b] = counts.get(b, 0) + 1
    return {"people": len(people), "named": len(result), "by_basis": counts, "missing_tokens": len(missing), "kowiki_vs_rule": len(conflicts)}


if __name__ == "__main__":
    print(build())
