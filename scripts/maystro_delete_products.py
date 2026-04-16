#!/usr/bin/env python3
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple


DEFAULT_BASE_URL = "https://orders-management.maystro-delivery.com/api"


def _auth_header_value(raw_token: str) -> str:
    token = (raw_token or "").strip()
    if not token:
        raise ValueError("Missing Maystro API token")
    lower = token.lower()
    if lower.startswith("token ") or lower.startswith("bearer "):
        return token
    return f"Token {token}"


def _request_json(
    *,
    method: str,
    url: str,
    headers: Dict[str, str],
    timeout_s: int,
) -> Tuple[int, Dict[str, str], Any]:
    req = urllib.request.Request(url=url, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as res:
            status = int(getattr(res, "status", 200))
            res_headers = {k: v for k, v in getattr(res, "headers", {}).items()}
            body = res.read()
            if not body:
                return status, res_headers, None
            try:
                return status, res_headers, json.loads(body.decode("utf-8"))
            except Exception:
                return status, res_headers, body.decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        body = None
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            body = None
        res_headers = {k: v for k, v in getattr(e, "headers", {}).items()} if getattr(e, "headers", None) else {}
        raise RuntimeError(f"HTTP {e.code} {e.reason}: {body}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Request failed: {e.reason}") from e


def _unwrap_products_payload(data: Any) -> List[Dict[str, Any]]:
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]

    if isinstance(data, dict):
        for key in ("results", "data", "items", "products"):
            inner = data.get(key)
            if isinstance(inner, list):
                return [x for x in inner if isinstance(x, dict)]

    raise RuntimeError("Unexpected response: expected a JSON list (or an object containing results/data/items/products list)")


def _extract_next_url(data: Any) -> Optional[str]:
    if not isinstance(data, dict):
        return None
    next_url = data.get("next")
    if isinstance(next_url, str) and next_url.strip():
        return next_url.strip()
    links = data.get("links")
    if isinstance(links, dict):
        n = links.get("next")
        if isinstance(n, str) and n.strip():
            return n.strip()
    pagination = data.get("pagination")
    if isinstance(pagination, dict):
        n = pagination.get("next")
        if isinstance(n, str) and n.strip():
            return n.strip()
    return None


def list_products(*, api_token: str, base_url: str, timeout_s: int, debug: bool = False) -> List[Dict[str, Any]]:
    url = urllib.parse.urljoin(base_url.rstrip("/") + "/", "stock/products/")
    all_items: List[Dict[str, Any]] = []
    max_pages = 500
    pages = 0

    while url:
        pages += 1
        if pages > max_pages:
            raise RuntimeError(f"Aborting pagination after {max_pages} pages (possible infinite loop).")

        status, headers, data = _request_json(
            method="GET",
            url=url,
            headers={
                "Authorization": _auth_header_value(api_token),
                "Accept": "application/json",
            },
            timeout_s=timeout_s,
        )
        if status < 200 or status >= 300:
            raise RuntimeError(f"Unexpected response status: {status}")

        try:
            page_items = _unwrap_products_payload(data)
            all_items.extend(page_items)
            next_url = _extract_next_url(data)
            url = urllib.parse.urljoin(url, next_url) if next_url else ""
        except Exception:
            if debug:
                ct = headers.get("Content-Type") or headers.get("content-type") or "unknown"
                snippet = data
                if not isinstance(snippet, str):
                    snippet = json.dumps(snippet, ensure_ascii=False) if snippet is not None else ""
                snippet_str = str(snippet)
                if len(snippet_str) > 1000:
                    snippet_str = snippet_str[:1000] + "…"
                print(f"[debug] GET {url} status={status} content-type={ct}", file=sys.stderr)
                if snippet_str:
                    print(f"[debug] body: {snippet_str}", file=sys.stderr)
            raise

    return all_items


def delete_product(*, api_token: str, base_url: str, product_identifier: str, timeout_s: int) -> None:
    pid = (product_identifier or "").strip()
    if not pid:
        raise ValueError("product_identifier is required")
    path = f"stock/products/{urllib.parse.quote(pid)}/"
    url = urllib.parse.urljoin(base_url.rstrip("/") + "/", path)
    _request_json(
        method="DELETE",
        url=url,
        headers={
            "Authorization": _auth_header_value(api_token),
            "Accept": "application/json",
        },
        timeout_s=timeout_s,
    )


def _pick_identifier(product: Dict[str, Any], key: str) -> Optional[str]:
    raw = product.get(key)
    if raw is None:
        return None
    value = str(raw).strip()
    return value or None


def _confirm(prompt: str) -> bool:
    try:
        ans = input(prompt).strip().lower()
    except KeyboardInterrupt:
        print("\nAborted.", file=sys.stderr)
        sys.exit(130)
    return ans in ("y", "yes")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="List Maystro products and optionally delete them one-by-one."
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help=f"Maystro API base URL (default: {DEFAULT_BASE_URL})")
    parser.add_argument("--token", default=os.environ.get("MAYSTRO_API_TOKEN", ""), help="Maystro API token (or set MAYSTRO_API_TOKEN)")
    parser.add_argument("--timeout", type=int, default=20, help="HTTP timeout in seconds (default: 20)")
    parser.add_argument("--store-id", default="", help="Optional filter: only products whose 'store' equals this value")
    parser.add_argument(
        "--id-field",
        choices=["id", "product_id"],
        default="id",
        help="Which field to use when deleting (default: id). Maystro allows UUID (id) or store product_id.",
    )
    parser.add_argument("--list", action="store_true", help="List product identifiers and exit")
    parser.add_argument("--delete", action="store_true", help="Delete products one-by-one")
    parser.add_argument("--yes", action="store_true", help="Do not prompt for confirmation (dangerous)")
    parser.add_argument(
        "--confirm-each",
        action="store_true",
        help="Confirm before deleting each product (default: confirm once then delete all)",
    )
    parser.add_argument("--debug", action="store_true", help="Print response details when listing fails")
    parser.add_argument("--limit", type=int, default=0, help="Only process first N products (0 = no limit)")
    parser.add_argument("--sleep-ms", type=int, default=0, help="Sleep between deletes (default: 0)")

    args = parser.parse_args()

    api_token = args.token
    base_url = str(args.base_url or "").strip()
    if not base_url:
        print("Error: --base-url is required", file=sys.stderr)
        return 2

    products = list_products(api_token=api_token, base_url=base_url, timeout_s=args.timeout, debug=args.debug)

    store_filter = str(args.store_id or "").strip()
    if store_filter:
        products = [p for p in products if str(p.get("store", "")).strip() == store_filter]

    if args.limit and args.limit > 0:
        products = products[: args.limit]

    identifiers: List[str] = []
    for p in products:
        ident = _pick_identifier(p, args.id_field)
        if ident:
            identifiers.append(ident)

    print(f"Found {len(identifiers)} products (field={args.id_field}{', store=' + store_filter if store_filter else ''}).")

    if args.list or (not args.delete):
        for ident in identifiers:
            print(ident)
        return 0

    if not identifiers:
        print("Nothing to delete.")
        return 0

    if not args.yes:
        print("About to delete ALL listed products from Maystro.")
        if store_filter:
            print(f"Store filter: store == {store_filter}")
        print(f"Delete identifier field: {args.id_field}")
        if not _confirm("Proceed? (y/N): "):
            print("Canceled.")
            return 0

    deleted = 0
    failed = 0
    for ident in identifiers:
        if args.confirm_each and (not args.yes) and (not _confirm(f"Delete {ident}? (y/N): ")):
            continue
        try:
            delete_product(api_token=api_token, base_url=base_url, product_identifier=ident, timeout_s=args.timeout)
            deleted += 1
            print(f"Deleted: {ident}")
        except Exception as e:
            failed += 1
            print(f"Failed: {ident} ({e})", file=sys.stderr)
        if args.sleep_ms and args.sleep_ms > 0:
            time.sleep(args.sleep_ms / 1000.0)

    print(f"Done. deleted={deleted} failed={failed}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
