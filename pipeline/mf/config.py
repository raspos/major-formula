"""Project paths and constants for THE MAJOR FORMULA."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
RAW = DATA / "raw"
PROCESSED = DATA / "processed"
DB_PATH = DATA / "db" / "majors.sqlite"
LOGS = ROOT / "logs"
WEB_DATA = ROOT / "web" / "public" / "data"

USER_AGENT = "major-formula/0.1 (data-journalism research; python-urllib)"
REQUEST_INTERVAL_SEC = 3.0

LAST_SEASON = 2026
# Editions that end on or after this date are not yet final and are excluded.
COLLECTION_CUTOFF = "2026-11-22"

# Sources that need written permission before systematic retrieval (see DATA_SOURCES.md).
CONSENT_REQUIRED_SOURCES = {"lpga_site", "lpga_chronology_pdf"}
