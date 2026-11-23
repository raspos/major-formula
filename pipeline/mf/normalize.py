"""Name normalisation and identity keys."""
from __future__ import annotations

import re
import unicodedata


def fold(s: str) -> str:
    """Casefold, strip diacritics/punctuation, collapse whitespace."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.casefold().replace("-", " ").replace("’", "'")
    s = re.sub(r"[^\w\s']", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def name_key(s: str) -> str:
    """Order-insensitive key so 'Kim A-lim' and 'A Lim Kim' collide.

    Used only for players without a Wikipedia link; collisions are reported by
    the validator rather than silently merged into linked identities.
    """
    return " ".join(sorted(fold(s).split()))


def wiki_title(target: str) -> str:
    t = target.strip().replace("_", " ")
    return t[:1].upper() + t[1:] if t else t


_YEAR_PREFIX = re.compile(r"^(19|20)\d{2}\s+")


def series_title(target: str) -> str:
    """'1955 Titleholders Championship' -> 'Titleholders Championship'."""
    return _YEAR_PREFIX.sub("", wiki_title(target))
