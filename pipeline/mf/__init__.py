"""THE MAJOR FORMULA (메이저의 공식) data pipeline."""
import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(errors="backslashreplace")
    except (AttributeError, ValueError):
        pass
