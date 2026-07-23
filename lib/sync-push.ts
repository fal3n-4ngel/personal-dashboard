import { anilistQuery, TO_ANILIST_STATUS_MAP } from "./anilist";
import { traktRequest } from "./trakt-client";
import { WatchlistItem } from "./firebase";

/**
 * Pushes updates made locally in the dashboard back to AniList and Trakt
 */
export async function pushWatchlistUpdate(
  idToken: string | undefined,
  item: WatchlistItem,
  updates: Partial<WatchlistItem>
): Promise<void> {
  const finalItem = { ...item, ...updates };

  // ─── 1. AniList Push (Anime only) ───
  if (item.type === "anime" && item.anilistId) {
    const anilistToken = localStorage.getItem("anilist_token");
    if (anilistToken) {
      try {
        const query = `
          mutation($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
            SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score) {
              id
              status
              progress
            }
          }
        `;

        const variables: Record<string, unknown> = {
          mediaId: Number(item.anilistId),
          status: TO_ANILIST_STATUS_MAP[finalItem.status] || "PLANNING",
          progress: finalItem.progress || 0,
        };

        if (finalItem.rating !== null && finalItem.rating !== undefined) {
          // AniList scores are out of 10 or 100 depending on account, standard mutation accepts float score
          variables.score = Number(finalItem.rating);
        }

        await anilistQuery(query, variables, anilistToken);
        console.log(`Successfully pushed AniList update for: ${item.title}`);
      } catch (err) {
        console.error("Failed to push update to AniList:", err);
      }
    }
  }

  // ─── 2. Trakt Push (Movies and Shows) ───
  if (item.traktId && (item.type === "movie" || item.type === "show" || item.type === "anime")) {
    const traktAccessToken = localStorage.getItem("trakt_access_token");
    if (traktAccessToken) {
      try {
        // If status changed to completed, add to watched history
        if (updates.status === "completed" || (updates.progress && finalItem.status === "completed")) {
          if (item.type === "movie") {
            await traktRequest(idToken, "sync/history", {
              method: "POST",
              token: traktAccessToken,
              body: { movies: [{ ids: { trakt: Number(item.traktId) } }] },
            });
          } else {
            // For shows, sync episodes 1 to progress in history
            const progressCount = finalItem.progress || 1;
            const episodes = Array.from({ length: progressCount }, (_, i) => ({ number: i + 1 }));
            await traktRequest(idToken, "sync/history", {
              method: "POST",
              token: traktAccessToken,
              body: {
                shows: [
                  {
                    ids: { trakt: Number(item.traktId) },
                    seasons: [{ number: 1, episodes }],
                  },
                ],
              },
            });
          }
          console.log(`Successfully pushed watch history update to Trakt for: ${item.title}`);
        }

        // If status is plan_to_watch, add to Trakt watchlist
        if (updates.status === "plan_to_watch") {
          const bodyKey = item.type === "movie" ? "movies" : "shows";
          await traktRequest(idToken, "sync/watchlist", {
            method: "POST",
            token: traktAccessToken,
            body: { [bodyKey]: [{ ids: { trakt: Number(item.traktId) } }] },
          });
          console.log(`Successfully pushed watchlist addition to Trakt for: ${item.title}`);
        }

        // If status is changed from plan_to_watch to something else, remove from watchlist
        if (item.status === "plan_to_watch" && updates.status && updates.status !== "plan_to_watch") {
          const bodyKey = item.type === "movie" ? "movies" : "shows";
          await traktRequest(idToken, "sync/watchlist/remove", {
            method: "POST",
            token: traktAccessToken,
            body: { [bodyKey]: [{ ids: { trakt: Number(item.traktId) } }] },
          });
          console.log(`Successfully removed from Trakt watchlist: ${item.title}`);
        }
      } catch (err) {
        console.error("Failed to push update to Trakt:", err);
      }
    }
  }
}
