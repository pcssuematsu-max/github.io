#!/usr/bin/env python3
"""Create the statistics used on the Cube Kingdom project page.

The selectors below intentionally match the case-card structures already used by
the three case guides.  Add a new case with the same structure and the displayed
total will be refreshed on the next GitHub push.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STATS_FILE = ROOT / "assets" / "data" / "cube-manual-stats.json"


def read_page(filename: str) -> str:
    return (ROOT / filename).read_text(encoding="utf-8")


def count_class(html: str, class_name: str, tag_name: str | None = None) -> int:
    tag = tag_name or r"[a-zA-Z0-9]+"
    pattern = rf'<{tag}\b[^>]*\bclass\s*=\s*["\'][^"\']*(?<![A-Za-z0-9_-]){re.escape(class_name)}(?![A-Za-z0-9_-])[^"\']*["\']'
    return len(re.findall(pattern, html))


def build_stats() -> dict[str, object]:
    f2l = count_class(read_page("F2L.html"), "subsection", "h3")
    oll = count_class(read_page("OLL.html"), "OLL-card")
    pll = count_class(read_page("PLL.html"), "PLL-card")
    diagrams = sum(1 for path in (ROOT / "assets" / "images" / "cube").rglob("*.svg") if path.is_file())

    return {
        "guides": count_class(read_page("cube-kingdom.html"), "guide-link-card", "a"),
        "cases": {"f2l": f2l, "oll": oll, "pll": pll, "total": f2l + oll + pll},
        "diagrams": diagrams,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh Cube Kingdom statistics.")
    parser.add_argument("--check", action="store_true", help="Exit with an error when the saved data is out of date.")
    args = parser.parse_args()

    contents = json.dumps(build_stats(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        return 0 if STATS_FILE.read_text(encoding="utf-8") == contents else 1

    STATS_FILE.write_text(contents, encoding="utf-8")
    print(contents, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
