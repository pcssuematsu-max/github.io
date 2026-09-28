from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as element_tree
from pathlib import Path


ROOT_DIRECTORY = Path(__file__).resolve().parent.parent
SITE_URL = "https://pcssuematsu-max.github.io/github.io/"
SITEMAP_URL = f"{SITE_URL}sitemap.xml"
IGNORED_DIRECTORIES = {".git", "node_modules", "output", "tmp", "__pycache__"}
CANONICAL_PATTERN = re.compile(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']', re.IGNORECASE)
SITEMAP_NAMESPACE = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


def canonical_urls() -> set[str]:
    urls = set()
    for html_file in ROOT_DIRECTORY.rglob("*.html"):
        relative_parts = html_file.relative_to(ROOT_DIRECTORY).parts
        if any(directory in IGNORED_DIRECTORIES for directory in relative_parts):
            continue
        urls.update(CANONICAL_PATTERN.findall(html_file.read_text(encoding="utf-8")))
    return urls


def sitemap_urls() -> set[str]:
    sitemap_file = ROOT_DIRECTORY / "sitemap.xml"
    try:
        root = element_tree.parse(sitemap_file).getroot()
    except (element_tree.ParseError, OSError) as error:
        raise RuntimeError(f"sitemap.xml を読み取れません: {error}") from error

    if root.tag != f"{SITEMAP_NAMESPACE}urlset":
        raise RuntimeError("sitemap.xml のurlset名前空間が正しくありません。")
    return {
        location.text
        for location in root.findall(f"{SITEMAP_NAMESPACE}url/{SITEMAP_NAMESPACE}loc")
        if location.text
    }


def main() -> int:
    errors: list[str] = []
    expected_urls = canonical_urls()
    try:
        actual_urls = sitemap_urls()
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 1

    missing_urls = expected_urls - actual_urls
    extra_urls = actual_urls - expected_urls
    if missing_urls:
        errors.append(f"sitemap.xml に未登録の正規URL: {', '.join(sorted(missing_urls))}")
    if extra_urls:
        errors.append(f"sitemap.xml に正規URLでないURL: {', '.join(sorted(extra_urls))}")

    robots_file = ROOT_DIRECTORY / "robots.txt"
    robots_source = robots_file.read_text(encoding="utf-8")
    if f"Sitemap: {SITEMAP_URL}" not in robots_source:
        errors.append(f"robots.txt に Sitemap: {SITEMAP_URL} がありません。")

    if errors:
        print("サイトマップの検証に失敗しました。", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"サイトマップの正規URL {len(actual_urls)}件を確認しました。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
