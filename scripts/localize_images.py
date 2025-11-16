#!/usr/bin/env python3
"""Download remote images referenced in Markdown posts and rewrite them to local assets."""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple
from urllib import parse, request

import yaml

POSTS_DIR = Path("_posts")
RAW_ROOT = Path("assets/img/raw")
PROCESSED_ROOT = Path("assets/img/posts")
REMOTE_SCHEMES = ("http://", "https://")

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"}
MIME_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/avif": ".avif",
}

LINKED_IMAGE_PATTERN = re.compile(r"\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)")
IMAGE_PATTERN = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")


class Replacement:
    __slots__ = ("start", "end", "text")

    def __init__(self, start: int, end: int, text: str) -> None:
        self.start = start
        self.end = end
        self.text = text


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download remote Markdown images and rewrite them to local assets."
    )
    parser.add_argument(
        "paths",
        nargs="*",
        default=[str(POSTS_DIR)],
        help="Files or directories to scan (defaults to _posts).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show the replacements without writing any files.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Always redownload and reconvert images.",
    )
    parser.add_argument(
        "--max-size",
        type=int,
        default=1800,
        help="Max width/height for processed PNGs (default: 1800).",
    )
    return parser.parse_args(argv)


def gather_files(paths: Sequence[str]) -> List[Path]:
    files: List[Path] = []
    for raw_path in paths:
        path = Path(raw_path)
        if path.is_dir():
            files.extend(sorted(path.glob("*.md")))
        elif path.suffix == ".md":
            files.append(path)
    return files


def is_remote(url: str) -> bool:
    return url.startswith(REMOTE_SCHEMES)


def split_front_matter(text: str) -> Tuple[dict, str, str]:
    if not text.startswith("---\n"):
        return {}, "", text
    parts = text.split("---\n", 2)
    if len(parts) < 3:
        raise ValueError("Front matter does not end with '---'")
    fm_text = parts[1]
    body = parts[2]
    data = yaml.safe_load(fm_text) or {}
    return data, fm_text, body


def ensure_dirs(slug: str) -> Tuple[Path, Path]:
    raw_dir = RAW_ROOT / slug
    processed_dir = PROCESSED_ROOT / slug
    raw_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)
    return raw_dir, processed_dir


def guess_extension_from_url(url: str) -> str:
    path_ext = Path(parse.urlparse(url).path).suffix.lower()
    if path_ext in VALID_EXTENSIONS:
        return path_ext
    return ""


def determine_extension(url: str, content_type: str) -> str:
    ext = guess_extension_from_url(url)
    if ext:
        return ext
    if content_type in MIME_EXTENSIONS:
        return MIME_EXTENSIONS[content_type]
    return ".bin"


def find_existing_raw(raw_dir: Path, image_name: str) -> Path | None:
    matches = sorted(raw_dir.glob(f"{image_name}.*"))
    return matches[0] if matches else None


def download_image(
    url: str,
    raw_dir: Path,
    image_name: str,
    *,
    dry_run: bool,
    force: bool,
) -> Path:
    existing = find_existing_raw(raw_dir, image_name)
    if existing and not force:
        return existing
    if existing and force and existing.exists():
        existing.unlink()
    if dry_run:
        return raw_dir / f"{image_name}.placeholder"

    req = request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with request.urlopen(req) as resp:
        data = resp.read()
        content_type = resp.info().get_content_type()
    ext = determine_extension(url, content_type)
    dest = raw_dir / f"{image_name}{ext}"
    dest.write_bytes(data)
    return dest


def convert_to_png(
    src: Path,
    dest: Path,
    *,
    max_size: int,
    force: bool,
    dry_run: bool,
) -> None:
    if dry_run:
        return
    if dest.exists() and not force:
        return
    cmd = [
        "convert",
        str(src),
        "-auto-orient",
        "-resize",
        f"{max_size}x{max_size}>",
        "-strip",
        str(dest),
    ]
    subprocess.run(cmd, check=True)


def replace_images_in_body(
    body: str,
    slug: str,
    *,
    dry_run: bool,
    force: bool,
    max_size: int,
) -> Tuple[str, int]:
    replacements: List[Replacement] = []
    recorded_ranges: List[Tuple[int, int]] = []
    references: List[Tuple[int, int, str, str]] = []

    for match in LINKED_IMAGE_PATTERN.finditer(body):
        start, end = match.span()
        recorded_ranges.append((start, end))
        alt = match.group(1)
        inner_url = match.group(2)
        outer_url = match.group(3)
        target_url = outer_url if is_remote(outer_url) else inner_url
        references.append((start, end, alt, target_url))

    for match in IMAGE_PATTERN.finditer(body):
        start, end = match.span()
        if any(s <= start < e for s, e in recorded_ranges):
            continue
        alt = match.group(1)
        url = match.group(2)
        references.append((start, end, alt, url))

    if not references:
        return body, 0

    references.sort(key=lambda item: item[0])
    counter = 0

    for start, end, alt_text, url in references:
        if not is_remote(url):
            continue
        counter += 1
        image_name = f"img{counter:02d}"
        raw_dir, processed_dir = ensure_dirs(slug)
        raw_path = download_image(
            url,
            raw_dir,
            image_name,
            dry_run=dry_run,
            force=force,
        )
        processed_path = processed_dir / f"{image_name}.png"
        if raw_path.exists():
            convert_to_png(
                raw_path,
                processed_path,
                max_size=max_size,
                force=force,
                dry_run=dry_run,
            )
        local_path = f"/assets/img/posts/{slug}/{image_name}.png"
        replacements.append(Replacement(start, end, f"![{alt_text}]({local_path})"))

    if not replacements:
        return body, 0

    replacements.sort(key=lambda rep: rep.start)
    new_body_parts: List[str] = []
    cursor = 0
    for rep in replacements:
        new_body_parts.append(body[cursor:rep.start])
        new_body_parts.append(rep.text)
        cursor = rep.end
    new_body_parts.append(body[cursor:])
    return "".join(new_body_parts), counter


def process_file(path: Path, *, dry_run: bool, force: bool, max_size: int) -> int:
    original = path.read_text(encoding="utf-8")
    front_matter, front_matter_text, body = split_front_matter(original)
    slug = front_matter.get("slug", path.stem)
    new_body, count = replace_images_in_body(
        body,
        slug,
        dry_run=dry_run,
        force=force,
        max_size=max_size,
    )
    if count and not dry_run:
        if front_matter_text:
            updated = "---\n" + front_matter_text + "---\n" + new_body
        else:
            updated = new_body
        path.write_text(updated, encoding="utf-8")
    return count


def main(argv: Sequence[str]) -> None:
    args = parse_args(argv)
    files = gather_files(args.paths)
    if not files:
        print("No Markdown files found.", file=sys.stderr)
        sys.exit(1)
    total = 0
    for md in files:
        count = process_file(md, dry_run=args.dry_run, force=args.force, max_size=args.max_size)
        if count:
            print(f"{md}: localized {count} image(s)")
        total += count
    if total == 0:
        print("No remote images found.")


if __name__ == "__main__":
    main(sys.argv[1:])
