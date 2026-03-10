#!/usr/bin/env python3
"""
Собирает все ссылки из Tech Interview Handbook и опционально скачивает текст со страниц.

Использование:
  # Только собрать ссылки в JSON
  python scripts/fetch_handbook_links.py --handbook tech-interview-handbook-main/apps/website --out data/handbook_links.json

  # Собрать ссылки и скачать текст со страниц (сохраняет в data/scraped_pages/)
  python scripts/fetch_handbook_links.py --handbook tech-interview-handbook-main/apps/website --out data/handbook_links.json --fetch --scraped-dir data/scraped_pages

Требует: pip install requests beautifulsoup4
"""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse


def find_handbook_md(root: Path) -> list[Path]:
    root = root.resolve()
    out = []
    for pat in ("contents/**/*.md", "contents/**/*.mdx", "blog/**/*.md", "blog/**/*.mdx", "experimental/**/*.md"):
        out.extend(root.glob(pat))
    return sorted(set(p.resolve() for p in out if p.is_file()))


def extract_links_from_md(path: Path, base_url: str = "") -> list[tuple[str, str]]:
    """(link_text, url)"""
    text = path.read_text(encoding="utf-8", errors="ignore")
    # [text](url) and [text](url "title")
    pattern = re.compile(r"\[([^\]]*)\]\((https?://[^)\s]+)(?:\s+[^)]*)?\)")
    links = []
    for m in pattern.finditer(text):
        link_text, url = m.group(1).strip(), m.group(2).strip()
        url = url.split("#")[0].rstrip("/") or url
        if not url.startswith("http"):
            continue
        links.append((link_text, url))
    return links


def collect_all_links(handbook_root: Path) -> dict[str, list[dict]]:
    """url -> [{"source": path, "text": link_text}, ...]"""
    by_url: dict[str, list[dict]] = {}
    for path in find_handbook_md(handbook_root):
        for link_text, url in extract_links_from_md(path):
            by_url.setdefault(url, [])
            by_url[url].append({"source": str(path.relative_to(handbook_root)), "text": link_text})
    return by_url


def fetch_page_text(url: str, timeout: int = 15) -> str | None:
    try:
        import requests
        from bs4 import BeautifulSoup
    except ImportError:
        print("Установите: pip install requests beautifulsoup4", file=sys.stderr)
        return None

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; InterviewCoachBot/1.0; +https://github.com/ai-interview-coach)",
    }
    try:
        r = requests.get(url, headers=headers, timeout=timeout)
        r.raise_for_status()
    except Exception as e:
        return None

    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    body = soup.find("body") or soup
    if not body:
        return None
    text = body.get_text(separator="\n", strip=True)
    return text[:500_000] if text else None  # ограничение длины


def url_to_safe_path(url: str, scraped_dir: Path) -> Path:
    parsed = urlparse(url)
    domain = parsed.netloc.replace(":", "_").replace(".", "_")
    path = (parsed.path or "/").strip("/") or "index"
    path = re.sub(r"[^\w\-/]", "_", path)[:120]
    h = hashlib.md5(url.encode()).hexdigest()[:8]
    name = f"{path}_{h}.txt" if path != "index" else f"index_{h}.txt"
    return scraped_dir / domain / name


def main() -> None:
    ap = argparse.ArgumentParser(description="Собрать ссылки из handbook и опционально скачать контент")
    ap.add_argument("--handbook", type=Path, default=Path("tech-interview-handbook-main/apps/website"), help="Путь к handbook (apps/website)")
    ap.add_argument("--out", type=Path, default=Path("data/handbook_links.json"), help="Файл для списка ссылок (JSON)")
    ap.add_argument("--fetch", action="store_true", help="Скачивать текст по каждой ссылке")
    ap.add_argument("--scraped-dir", type=Path, default=Path("data/scraped_pages"), help="Каталог для скачанного текста")
    ap.add_argument("--delay", type=float, default=1.0, help="Задержка между запросами (сек)")
    ap.add_argument("--skip-domains", type=str, default="youtube.com,vimeo.com,linkedin.com,twitter.com,x.com", help="Не скачивать с этих доменов (через запятую)")
    args = ap.parse_args()

    handbook_root = args.handbook.resolve()
    if not handbook_root.is_dir():
        print(f"Каталог не найден: {handbook_root}", file=sys.stderr)
        sys.exit(1)

    links = collect_all_links(handbook_root)
    args.out.parent.mkdir(parents=True, exist_ok=True)

    # Сохраняем список ссылок (без fetch)
    import json
    out_data = {
        "handbook_root": str(handbook_root),
        "total_urls": len(links),
        "links": {url: refs for url, refs in links.items()},
    }
    args.out.write_text(json.dumps(out_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Ссылок собрано: {len(links)} → {args.out}")

    if not args.fetch:
        return

    skip_domains = set(d.strip().lower() for d in args.skip_domains.split(",") if d.strip())
    scraped_dir = args.scraped_dir.resolve()
    scraped_dir.mkdir(parents=True, exist_ok=True)
    manifest = []

    for i, url in enumerate(links):
        parsed = urlparse(url)
        if any(parsed.netloc.lower().endswith(d) for d in skip_domains):
            continue
        out_path = url_to_safe_path(url, scraped_dir)
        if out_path.exists():
            manifest.append({"url": url, "path": str(out_path.relative_to(scraped_dir)), "status": "cached"})
            continue
        text = fetch_page_text(url)
        if text:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(text, encoding="utf-8")
            manifest.append({"url": url, "path": str(out_path.relative_to(scraped_dir)), "status": "ok"})
        else:
            manifest.append({"url": url, "path": None, "status": "fail"})
        if (i + 1) % 10 == 0:
            print(f"Обработано {i + 1}/{len(links)}")
        time.sleep(args.delay)

    manifest_path = scraped_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Скачано в {scraped_dir}, манифест: {manifest_path}")


if __name__ == "__main__":
    main()
