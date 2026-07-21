import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { ApiError } from "./errors";

export interface FirebaseWebConfig {
  apiKey: string;
  projectId: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

// Parses and sanity-checks the Firebase Web App config (from env or the
// X-Firebase-Config header). Throws a client-safe ApiError on bad input.
export function parseFirebaseConfig(credentials: Credentials): FirebaseWebConfig {
  if (!credentials.firebaseConfig) {
    throw new ApiError(500, "Firebase is not configured on this server.");
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(credentials.firebaseConfig);
  } catch {
    throw new ApiError(400, "Firebase configuration is not valid JSON.");
  }

  if (typeof config?.apiKey !== "string" || !config.apiKey) {
    throw new ApiError(400, "Firebase configuration is missing 'apiKey'.");
  }
  if (typeof config?.projectId !== "string" || !/^[a-z0-9-]{4,64}$/.test(config.projectId)) {
    throw new ApiError(400, "Firebase configuration is missing a valid 'projectId'.");
  }

  return config as unknown as FirebaseWebConfig;
}

export interface Credentials {
  firebaseConfig: string | null; // JSON configuration string
  traktClientId: string | null;
  traktClientSecret: string | null;
  traktRefreshToken: string | null;
  traktAccessToken: string | null;
  redirectUri?: string | null;
}

export async function getCredentials(req?: NextRequest): Promise<Credentials> {
  let reqHeaders;
  try {
    if (req) {
      reqHeaders = req.headers;
    } else {
      reqHeaders = await headers();
    }
  } catch {
    // Fallback if headers context is unavailable (e.g. static rendering)
    return {
      firebaseConfig: process.env.FIREBASE_CONFIG || null,
      traktClientId: process.env.TRAKT_CLIENT_ID || null,
      traktClientSecret: process.env.TRAKT_CLIENT_SECRET || null,
      traktRefreshToken: process.env.TRAKT_REFRESH_TOKEN || null,
      traktAccessToken: null,
      redirectUri: process.env.TRAKT_REDIRECT_URI || null,
    };
  }

  const getHeader = (name: string) => reqHeaders.get(name) || null;

  return {
    firebaseConfig: getHeader("x-firebase-config") || process.env.FIREBASE_CONFIG || null,
    traktClientId: getHeader("x-trakt-client-id") || process.env.TRAKT_CLIENT_ID || null,
    traktClientSecret: getHeader("x-trakt-client-secret") || process.env.TRAKT_CLIENT_SECRET || null,
    traktRefreshToken: getHeader("x-trakt-refresh-token") || process.env.TRAKT_REFRESH_TOKEN || null,
    traktAccessToken: getHeader("x-trakt-access-token") || null,
    redirectUri: getHeader("x-trakt-redirect-uri") || process.env.TRAKT_REDIRECT_URI || null,
  };
}
