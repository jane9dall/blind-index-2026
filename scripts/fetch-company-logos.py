#!/usr/bin/env python3
"""Download Teamblind company logos used by the Blind Index result card."""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import html as html_lib
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
ASSET_DIR = ROOT / "assets" / "company-logos"
MANIFEST_PATH = ASSET_DIR / "manifest.json"
JS_MAP_PATH = ASSET_DIR / "company-logos.js"
REPORT_PATH = ASSET_DIR / "fetch-report.json"
USER_AGENT = "Mozilla/5.0 (compatible; BlindIndexLogoImporter/1.0)"
NON_COMPANY_ENTRIES = {"간호사", "변호사", "수의사", "의사", "직업군인"}


def sheet_companies() -> list[dict[str, object]]:
    source = INDEX_PATH.read_text(encoding="utf-8")
    start = source.index("const SHEET_DATA = [")
    end = source.index("\n    ];", start)
    rows: list[dict[str, object]] = []
    for line in source[start:end].splitlines():
        candidate = line.strip().rstrip(",")
        if not candidate.startswith("["):
            continue
        row = json.loads(candidate)
        aliases = [
            alias.strip()
            for alias in str(row[5] or "").split(",")
            if alias.strip() and alias.strip() != "#N/A"
        ]
        rows.append({"name": row[0], "aliases": aliases})
    return rows


def slug(name: str) -> str:
    ascii_name = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    digest = hashlib.sha1(name.encode("utf-8")).hexdigest()[:10]
    return f"{ascii_name or 'company'}-{digest}"


def request_bytes(url: str) -> tuple[bytes, str]:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,image/*,*/*"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read(), response.headers.get("Content-Type", "")


def extract_page_info(html: str) -> tuple[str | None, str | None]:
    title_match = re.search(r"<title>블라인드 \|\s*(.+?)(?: 리뷰| 기업정보| 게시글| 연봉)", html)
    page_name = title_match.group(1).strip() if title_match else None
    escaped_urls = re.findall(
        r"https:\\u002F\\u002Fstatic\.teamblind\.com\\u002Fimg\\u002Fchannel"
        r"\\u002Flogo\\u002Fkr\\u002F[^\"\\]+?\.(?:png|jpe?g|webp|svg)",
        html,
        flags=re.IGNORECASE,
    )
    if not escaped_urls:
        return page_name, None
    return page_name, escaped_urls[0].replace("\\u002F", "/")


def extract_search_result(
    html: str, expected_names: list[str], allow_first: bool = False
) -> tuple[str | None, str | None]:
    cards = re.findall(
        r'<a href="[^"]*/company/[^"]+/" class="img"><img src="([^"]+)"></a>'
        r'.{0,1500}?<a href="[^"]*/company/[^"]+/" class="name">\s*([^<]+?)\s*</a>',
        html,
        flags=re.DOTALL,
    )
    expected = {name.casefold().replace(" ", "") for name in expected_names}
    for logo_url, company_name in cards:
        clean_name = html_lib.unescape(company_name).strip()
        if clean_name.casefold().replace(" ", "") in expected:
            return clean_name, html_lib.unescape(logo_url)
    if allow_first and cards:
        logo_url, company_name = cards[0]
        return html_lib.unescape(company_name).strip(), html_lib.unescape(logo_url)
    return None, None


def extension(content_type: str, url: str) -> str:
    type_map = {
        "image/png": ".png",
        "png": ".png",
        "image/jpeg": ".jpg",
        "jpeg": ".jpg",
        "jpg": ".jpg",
        "image/webp": ".webp",
        "webp": ".webp",
        "image/svg+xml": ".svg",
        "svg+xml": ".svg",
    }
    mime = content_type.split(";", 1)[0].strip().lower()
    return type_map.get(mime, Path(urllib.parse.urlparse(url).path).suffix.lower() or ".png")


def is_image(content_type: str, payload: bytes) -> bool:
    mime = content_type.split(";", 1)[0].strip().lower()
    known_types = {
        "image/png", "png", "image/jpeg", "jpeg", "jpg",
        "image/webp", "webp", "image/svg+xml", "svg+xml",
    }
    signatures = (
        payload.startswith(b"\x89PNG"),
        payload.startswith(b"\xff\xd8\xff"),
        payload.startswith(b"RIFF") and payload[8:12] == b"WEBP",
        payload.lstrip().startswith(b"<svg"),
    )
    return len(payload) >= 50 and (mime in known_types or any(signatures))


def candidates(company: dict[str, object]) -> list[str]:
    name = str(company["name"])
    aliases = [str(value) for value in company["aliases"]]
    ordered = [name, *aliases]
    seen: set[str] = set()
    result: list[str] = []
    for value in ordered:
        normalized = value.strip()
        key = normalized.casefold()
        if normalized and key not in seen:
            seen.add(key)
            result.append(normalized)
    return result[:5]


def fetch_one(
    company: dict[str, object],
    delay: float,
    search_only: bool = False,
    first_result: bool = False,
) -> dict[str, object]:
    expected = str(company["name"])
    attempts: list[dict[str, str]] = []
    if not search_only:
        for candidate in candidates(company):
            page_url = (
                "https://www.teamblind.com/kr/company/"
                + urllib.parse.quote(candidate, safe="")
                + "/reviews"
            )
            try:
                html_bytes, _ = request_bytes(page_url)
                page_name, logo_url = extract_page_info(
                    html_bytes.decode("utf-8", errors="replace")
                )
                attempts.append(
                    {"query": candidate, "pageName": page_name or "", "url": page_url}
                )
                if not logo_url:
                    time.sleep(delay)
                    continue
                image_bytes, content_type = request_bytes(logo_url)
                if not is_image(content_type, image_bytes):
                    time.sleep(delay)
                    continue
                filename = slug(expected) + extension(content_type, logo_url)
                (ASSET_DIR / filename).write_bytes(image_bytes)
                return {
                    "status": "ok",
                    "company": expected,
                    "matchedCompany": page_name,
                    "query": candidate,
                    "sourceType": "company-page",
                    "sourcePage": page_url,
                    "sourceLogo": logo_url,
                    "file": f"assets/company-logos/{filename}",
                    "bytes": len(image_bytes),
                    "attempts": attempts,
                }
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                attempts.append({"query": candidate, "error": str(exc), "url": page_url})
            time.sleep(delay)

    names = candidates(company)
    for candidate in names:
        search_url = (
            "https://www.teamblind.com/kr/search/"
            + urllib.parse.quote(candidate, safe="")
        )
        try:
            html_bytes, _ = request_bytes(search_url)
            matched_name, logo_url = extract_search_result(
                html_bytes.decode("utf-8", errors="replace"),
                names,
                allow_first=first_result,
            )
            attempts.append(
                {
                    "query": candidate,
                    "pageName": matched_name or "",
                    "url": search_url,
                    "type": "search",
                }
            )
            if not logo_url:
                time.sleep(delay)
                continue
            image_bytes, content_type = request_bytes(logo_url)
            if not is_image(content_type, image_bytes):
                time.sleep(delay)
                continue
            filename = slug(expected) + extension(content_type, logo_url)
            (ASSET_DIR / filename).write_bytes(image_bytes)
            return {
                "status": "ok",
                "company": expected,
                "matchedCompany": matched_name,
                "query": candidate,
                "sourceType": "search-result",
                "sourcePage": search_url,
                "sourceLogo": logo_url,
                "file": f"assets/company-logos/{filename}",
                "bytes": len(image_bytes),
                "attempts": attempts,
            }
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            attempts.append(
                {"query": candidate, "error": str(exc), "url": search_url, "type": "search"}
            )
        time.sleep(delay)
    return {"status": "missing", "company": expected, "attempts": attempts}


def write_outputs(results: list[dict[str, object]]) -> None:
    existing: dict[str, object] = {}
    if MANIFEST_PATH.exists():
        existing = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    for result in results:
        company = str(result["company"])
        if result["status"] == "ok":
            existing[company] = result
        elif company not in existing:
            existing[company] = result

    manifest_text = json.dumps(existing, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    MANIFEST_PATH.write_text(manifest_text, encoding="utf-8")

    logo_map = {
        company: info["file"]
        for company, info in existing.items()
        if isinstance(info, dict) and info.get("status") == "ok" and info.get("file")
    }
    JS_MAP_PATH.write_text(
        "window.COMPANY_LOGOS = "
        + json.dumps(logo_map, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )

    summary = {
        "total": len(existing),
        "ok": sum(1 for value in existing.values() if value.get("status") == "ok"),
        "missing": sum(1 for value in existing.values() if value.get("status") != "ok"),
        "latestBatch": results,
    }
    REPORT_PATH.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int)
    parser.add_argument("--delay", type=float, default=0.15)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--missing-only", action="store_true")
    parser.add_argument("--search-only", action="store_true")
    parser.add_argument("--first-result", action="store_true")
    parser.add_argument("--companies", nargs="*")
    args = parser.parse_args()

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    companies = sheet_companies()
    if args.missing_only and MANIFEST_PATH.exists():
        previous = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        companies = [
            row
            for row in companies
            if previous.get(str(row["name"]), {}).get("status") != "ok"
        ]
    if args.first_result:
        companies = [
            row for row in companies if str(row["name"]) not in NON_COMPANY_ENTRIES
        ]
    if args.companies:
        wanted = {name.casefold() for name in args.companies}
        companies = [row for row in companies if str(row["name"]).casefold() in wanted]
    if args.limit:
        companies = companies[: args.limit]

    results: list[dict[str, object]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        pending = [
            pool.submit(
                fetch_one,
                company,
                args.delay,
                args.search_only,
                args.first_result,
            )
            for company in companies
        ]
        for index, future in enumerate(concurrent.futures.as_completed(pending), start=1):
            result = future.result()
            results.append(result)
            print(
                f"[{index}/{len(companies)}] {result['company']}: {result['status']}",
                flush=True,
            )
    write_outputs(results)


if __name__ == "__main__":
    main()
