from __future__ import annotations

import posixpath
import re
import sys
from pathlib import Path, PurePosixPath


ROOT_DIRECTORY = Path(__file__).resolve().parent.parent
ANALYTICS_PATH = "assets/js/analytics.js"
IGNORED_DIRECTORIES = {".git", "node_modules", "output", "tmp", "__pycache__"}
SCRIPT_SOURCE_PATTERN = re.compile(
    r"<script\b[^>]*\bsrc\s*=\s*(['\"])(.*?)\1[^>]*>", re.IGNORECASE
)


def public_html_files() -> list[Path]:
    return sorted(
        html_file
        for html_file in ROOT_DIRECTORY.rglob("*.html")
        if not any(directory in IGNORED_DIRECTORIES for directory in html_file.relative_to(ROOT_DIRECTORY).parts)
    )


def resolve_script_path(html_file: Path, source: str) -> str | None:
    source_path = re.split(r"[?#]", source, maxsplit=1)[0]
    if not source_path or re.match(r"^[a-z][a-z0-9+.-]*:", source_path, re.IGNORECASE):
        return None
    if source_path.startswith("//"):
        return None

    page_path = html_file.relative_to(ROOT_DIRECTORY).as_posix()
    if source_path.startswith("/"):
        return posixpath.normpath(source_path.lstrip("/"))
    return posixpath.normpath(posixpath.join(str(PurePosixPath(page_path).parent), source_path))


def analytics_script_count(head: str, html_file: Path) -> int:
    return sum(
        resolve_script_path(html_file, match.group(2)) == ANALYTICS_PATH
        for match in SCRIPT_SOURCE_PATTERN.finditer(head)
    )


def main() -> int:
    errors: list[str] = []
    analytics_source = (ROOT_DIRECTORY / ANALYTICS_PATH).read_text(encoding="utf-8")
    if not re.search(r"const measurementId\s*=\s*['\"]G-[A-Z0-9]+['\"]", analytics_source):
        errors.append(f"{ANALYTICS_PATH}: 有効なGoogle Analytics測定IDが設定されていません。")

    html_files = public_html_files()
    for html_file in html_files:
        source = html_file.read_text(encoding="utf-8")
        head_match = re.search(r"<head\b[^>]*>(.*?)</head\s*>", source, re.IGNORECASE | re.DOTALL)
        display_path = html_file.relative_to(ROOT_DIRECTORY).as_posix()

        if not head_match:
            errors.append(f"{display_path}: <head> が見つかりません。")
            continue

        count = analytics_script_count(head_match.group(1), html_file)
        if count == 0:
            errors.append(f"{display_path}: {ANALYTICS_PATH} のscriptタグが<head>内にありません。")
        elif count > 1:
            errors.append(f"{display_path}: {ANALYTICS_PATH} のscriptタグが{count}個あります。1個だけにしてください。")

    if errors:
        print("Google Analytics タグの検証に失敗しました。", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Google Analytics タグを{len(html_files)}ページで確認しました。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
