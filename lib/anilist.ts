// Client-side AniList GraphQL helper. AniList's API is public/CORS-enabled,
// so unlike Trakt this is called directly from the browser — no proxy route.
import type { MediaStatus } from "@/types";

const ANILIST_GQL = "https://graphql.anilist.co";

export async function anilistQuery(query: string, variables: Record<string, unknown> = {}, token?: string) {
  const res = await fetch(ANILIST_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList error: ${res.status}`);
  return res.json();
}

export const ANILIST_STATUS_MAP: Record<string, MediaStatus> = {
  CURRENT: "watching",
  PLANNING: "plan_to_watch",
  COMPLETED: "completed",
  DROPPED: "dropped",
  PAUSED: "watching",
  REPEATING: "watching",
};

export const TO_ANILIST_STATUS_MAP: Record<string, string> = {
  watching: "CURRENT",
  plan_to_watch: "PLANNING",
  completed: "COMPLETED",
  dropped: "DROPPED",
};
