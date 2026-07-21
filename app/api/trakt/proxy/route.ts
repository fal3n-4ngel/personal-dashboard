import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

const TRAKT_API = "https://api.trakt.tv";

// Only the Trakt endpoints the dashboard actually uses may be relayed.
const ALLOWED_METHODS = new Set(["GET", "POST", "DELETE"]);
const ALLOWED_PATH_PREFIXES = ["/users/settings", "/sync/", "/search/", "/shows/", "/movies/"];

// Resolves and validates the target URL. Prevents SSRF: a path like
// "@evil.com/x" or "//evil.com/x" would otherwise change the request host.
function resolveTraktUrl(path: unknown): URL {
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw new ApiError(400, "'path' must be a string starting with '/'.");
  }
  if (!ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    throw new ApiError(400, "This Trakt endpoint is not allowed.");
  }

  let url: URL;
  try {
    url = new URL(path, TRAKT_API);
  } catch {
    throw new ApiError(400, "Invalid 'path'.");
  }
  if (url.origin !== TRAKT_API) {
    throw new ApiError(400, "Invalid 'path'.");
  }
  return url;
}

// Trakt's API does not send CORS headers, so the browser can't call
// api.trakt.tv directly (every client-side attempt fails with "Failed to
// fetch"). This route relays those calls server-to-server, where CORS doesn't
// apply. The caller's own Trakt access token (owned client-side, from their
// personal OAuth flow) is passed through per-request and never stored here.
export async function POST(req: NextRequest) {
  try {
    const { creds } = await requireUser(req);

    if (!creds.traktClientId) {
      throw new ApiError(500, "Trakt client ID is not configured.");
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    const { path, method, token, body: forwardBody } = (body || {}) as Record<string, unknown>;
    const url = resolveTraktUrl(path);

    const upstreamMethod = typeof method === "string" ? method.toUpperCase() : "GET";
    if (!ALLOWED_METHODS.has(upstreamMethod)) {
      throw new ApiError(400, "'method' must be GET, POST, or DELETE.");
    }
    if (token !== undefined && typeof token !== "string") {
      throw new ApiError(400, "'token' must be a string.");
    }

    const traktRes = await fetch(url, {
      method: upstreamMethod,
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": creds.traktClientId,
        // Trakt is behind Cloudflare, which blocks server-side fetches with no
        // User-Agent as bot traffic — a browser-like UA avoids the 403 block page.
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: forwardBody !== undefined && upstreamMethod !== "GET" ? JSON.stringify(forwardBody) : undefined,
    });

    const text = await traktRes.text();
    return new NextResponse(text || null, {
      status: traktRes.status,
      headers: { "Content-Type": traktRes.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    return toErrorResponse(error, "POST /api/trakt/proxy");
  }
}
