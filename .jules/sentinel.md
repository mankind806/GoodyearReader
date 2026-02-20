## 2025-02-18 - Intranet SSRF via `bgFetch` Bypass
**Vulnerability:** `bgFetch` allowed fetching from dotless domains (Intranet) and potentially loose IP formats, bypassing the intended CORS/local network protection.
**Learning:** Regex-based IP validation is fragile. Combining strict IP parsing with heuristics (dotless domains) provides better defense-in-depth against SSRF in browser extensions where DNS resolution is limited.
**Prevention:** Use standard URL parsing where possible, and explicitly block single-label domains to prevent Intranet access unless explicitly whitelisted.
