"""Raw-preserving HTTP fetcher.

Every response body is stored once under data/raw/<source_id>/ with a JSON
sidecar (url, fetched_at UTC, sha256, bytes, http status). Re-runs reuse the
stored copy unless refresh=True, which makes collection idempotent and lets
the pipeline be re-run after a failure without re-downloading.
"""
from __future__ import annotations

import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from . import config

_last_request = 0.0


class ConsentRequired(RuntimeError):
    """Raised when a source needs written permission before systematic retrieval."""


@dataclass
class Fetched:
    source_id: str
    url: str
    path: Path
    sha256: str
    fetched_at: str
    http_status: int
    from_cache: bool

    def text(self) -> str:
        return self.path.read_text(encoding="utf-8")

    def json(self):
        return json.loads(self.text())


def _key(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]


def _log(event: dict) -> None:
    config.LOGS.mkdir(parents=True, exist_ok=True)
    with open(config.LOGS / "fetch.jsonl", "a", encoding="utf-8") as fh:
        fh.write(json.dumps(event, ensure_ascii=False) + "\n")


def fetch(url: str, source_id: str, *, ext: str = "json", refresh: bool = False,
          allow_consent_sources: bool = False, retries: int = 5) -> Fetched:
    if source_id in config.CONSENT_REQUIRED_SOURCES and not allow_consent_sources:
        raise ConsentRequired(
            f"{source_id}: systematic retrieval requires the rights holder's written consent "
            "(see DATA_SOURCE_AUDIT.md). Pass allow_consent_sources=True only after it is obtained."
        )
    folder = config.RAW / source_id
    folder.mkdir(parents=True, exist_ok=True)
    body_path = folder / f"{_key(url)}.{ext}"
    meta_path = folder / f"{_key(url)}.meta.json"
    if body_path.exists() and meta_path.exists() and not refresh:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        return Fetched(source_id, url, body_path, meta["sha256"], meta["fetched_at"],
                       meta["http_status"], True)

    global _last_request
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        wait = config.REQUEST_INTERVAL_SEC - (time.monotonic() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.monotonic()
        req = urllib.request.Request(url, headers={"User-Agent": config.USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = resp.read()
                status = resp.status
            break
        except urllib.error.HTTPError as exc:  # 4xx final except 429; 5xx retried
            last_err = exc
            _log({"url": url, "source_id": source_id, "attempt": attempt, "error": f"HTTP {exc.code}"})
            if exc.code == 429:
                ra = exc.headers.get("Retry-After", "")
                time.sleep(int(ra) if ra.isdigit() else 20 * attempt)
                continue
            if exc.code < 500:
                raise
        except (urllib.error.URLError, TimeoutError) as exc:
            last_err = exc
            _log({"url": url, "source_id": source_id, "attempt": attempt, "error": str(exc)})
        time.sleep(2 * attempt)
    else:
        raise RuntimeError(f"fetch failed after {retries} attempts: {url}: {last_err}")

    sha = hashlib.sha256(body).hexdigest()
    fetched_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    body_path.write_bytes(body)
    meta = {"url": url, "source_id": source_id, "fetched_at": fetched_at, "sha256": sha,
            "bytes": len(body), "http_status": status}
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    _log({**meta, "event": "stored"})
    return Fetched(source_id, url, body_path, sha, fetched_at, status, False)


WIKI_API = "https://en.wikipedia.org/w/api.php"


def wiki_wikitext(title: str, *, refresh: bool = False) -> Fetched:
    q = urllib.parse.urlencode({"action": "parse", "page": title, "prop": "wikitext|revid",
                                "format": "json", "formatversion": "2", "redirects": "1"})
    return fetch(f"{WIKI_API}?{q}", "wikipedia", refresh=refresh)


def wiki_resolve(titles: list[str], *, refresh: bool = False) -> Fetched:
    q = urllib.parse.urlencode({"action": "query", "titles": "|".join(titles), "redirects": "1",
                                "format": "json", "formatversion": "2"})
    return fetch(f"{WIKI_API}?{q}", "wikipedia", refresh=refresh)
