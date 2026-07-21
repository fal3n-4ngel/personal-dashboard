"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import LandingPage from "./components/LandingPage";

/* ─── Types ─── */
interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  idToken: string;
}

interface AniListUser {
  id: number;
  name: string;
  avatar: string | null;
  token: string;
}

interface TraktUser {
  username: string;
  name: string | null;
  avatar: string | null;
  accessToken: string;
  refreshToken: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number | null;
  category: string | null;
  date: string | null;
  notes: string | null;
}

interface WatchlistItem {
  id: string;
  title: string;
  type: "movie" | "show" | "anime" | "book";
  status: "plan_to_watch" | "watching" | "completed" | "dropped";
  progress: number;
  totalEpisodes: number | null;
  rating: number | null;
  coverImage: string | null;
  year: number | null;
  updatedAt: number;
  anilistId?: number | null; // store AniList media ID for sync
  traktId?: number | null; // store Trakt media ID for sync
}

interface Subscription {
  id: string;
  name: string;
  cost: number;
  billingCycle: "monthly" | "yearly";
  nextBillingDate: string;
  icon: string | null;
  createdAt: number;
}

interface Habit {
  id: string;
  name: string;
  icon: string | null;
  frequency: "daily" | "weekly";
  completions: string[]; // array of YYYY-MM-DD
  createdAt: number;
}

interface Note {
  content: string;
  updatedAt: number;
}

interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  unit: string;
  deadline: string | null;
  color: string;
  createdAt: number;
}

interface SearchResult {
  title: string;
  type: "movie" | "show" | "anime" | "book";
  totalEpisodes: number | null;
  coverImage: string | null;
  year: number | null;
  anilistId?: number | null;
  traktId?: number | null;
}

/* ─── AniList GraphQL helper ─── */
const ANILIST_GQL = "https://graphql.anilist.co";

async function anilistQuery(query: string, variables: Record<string, any> = {}, token?: string) {
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

const STATUS_MAP: Record<string, WatchlistItem["status"]> = {
  CURRENT:   "watching",
  PLANNING:  "plan_to_watch",
  COMPLETED: "completed",
  DROPPED:   "dropped",
  PAUSED:    "watching",
  REPEATING: "watching",
};

const ANILIST_STATUS_MAP: Record<string, string> = {
  watching:      "CURRENT",
  plan_to_watch: "PLANNING",
  completed:     "COMPLETED",
  dropped:       "DROPPED",
};

/* ─── Trakt API helper ───
 * Trakt's API sends no CORS headers, so the browser can't call api.trakt.tv
 * directly (fails with "Failed to fetch"). Requests go through our own
 * /api/trakt/proxy route instead, which relays them server-to-server. */
const TRAKT_CLIENT_ID = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID || "";

async function traktRequest(idToken: string | undefined, path: string, opts: { method?: string; token?: string; body?: any } = {}) {
  const res = await fetch("/api/trakt/proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken || ""}`,
    },
    body: JSON.stringify({ path, method: opts.method, token: opts.token, body: opts.body }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Trakt error (${res.status}): ${errText}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* ─── Component ─── */
export default function Dashboard() {
  /* ─── Auth State ─── */
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [firebaseAuth, setFirebaseAuth] = useState<any>(null);

  /* ─── AniList State ─── */
  const [anilistUser, setAnilistUser] = useState<AniListUser | null>(null);
  const [isSyncingAnilist, setIsSyncingAnilist] = useState(false);
  const [anilistSyncMsg, setAnilistSyncMsg] = useState("");

  /* ─── Trakt State ─── */
  const [traktUser, setTraktUser] = useState<TraktUser | null>(null);
  const [isSyncingTrakt, setIsSyncingTrakt] = useState(false);
  const [traktSyncMsg, setTraktSyncMsg] = useState("");

  /* ─── Navigation ─── */
  const [activeTab, setActiveTab] = useState<"expenses" | "subscriptions" | "habits" | "media" | "books" | "goals" | "notes">("expenses");

  /* ─── State for New Features ─── */
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isFetchingSubscriptions, setIsFetchingSubscriptions] = useState(false);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isFetchingHabits, setIsFetchingHabits] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isFetchingGoals, setIsFetchingGoals] = useState(false);
  const [note, setNote] = useState<Note>({ content: "", updatedAt: 0 });
  const [isFetchingNote, setIsFetchingNote] = useState(false);

  /* ─── Filters ─── */
  const [timeFilter, setTimeFilter] = useState("all");
  const [salaryStartDay, setSalaryStartDay] = useState<number>(25);
  const [activeChart, setActiveChart] = useState<"category" | "trend">("category");

  /* ─── Expenses State ─── */
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");

  /* ─── Subscriptions State ─── */
  const [subName, setSubName] = useState("");
  const [subCost, setSubCost] = useState("");
  const [subCycle, setSubCycle] = useState<"monthly"|"yearly">("monthly");
  const [subNextDate, setSubNextDate] = useState("");
  const [subIcon, setSubIcon] = useState("");
  const [isAddingSub, setIsAddingSub] = useState(false);


  /* ─── Notes State ─── */
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const saveNoteTimeout = useRef<NodeJS.Timeout | null>(null);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isFetchingExpenses, setIsFetchingExpenses] = useState(false);
  const [expenseTab, setExpenseTab] = useState<"ledger"|"subscriptions">("ledger");

  /* ─── Watchlist State ─── */
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isFetchingWatchlist, setIsFetchingWatchlist] = useState(false);
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaType, setMediaType] = useState<"movie" | "show" | "anime" | "book">("movie");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchingMedia, setIsSearchingMedia] = useState(false);
  const [watchlistFilter, setWatchlistFilter] = useState<"all" | "anime" | "movie" | "show">("all");
  const [watchlistTab, setWatchlistTab] = useState<"watching" | "plan" | "completed">("watching");
  const [mediaCategory, setMediaCategory] = useState<"general" | "anime">("general");
  const [isImportingLb, setIsImportingLb] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /* ─── Load salary cycle preference ─── */
  useEffect(() => {
    const savedDay = localStorage.getItem("salary_start_day");
    if (savedDay) {
      setSalaryStartDay(Number(savedDay));
    }
  }, []);

  const updateSalaryStartDay = (day: number) => {
    setSalaryStartDay(day);
    localStorage.setItem("salary_start_day", String(day));
  };
  /* ─── Bootstrap Firebase Auth ─── */
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const res = await fetch("/api/auth/config");
        if (!res.ok) throw new Error("Could not load Firebase configuration.");
        const config = await res.json();

        const { initializeApp, getApps } = await import("firebase/app");
        const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } = await import("firebase/auth");

        const appName = "dashboard-client";
        const apps = getApps();
        const existingApp = apps.find((a) => a.name === appName);
        const app = existingApp || initializeApp(config, appName);
        const auth = getAuth(app);

        setFirebaseAuth({ auth, GoogleAuthProvider, signInWithPopup, signOut });

        unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            const idToken = await fbUser.getIdToken();
            setUser({ uid: fbUser.uid, email: fbUser.email || "", displayName: fbUser.displayName, photoURL: fbUser.photoURL, idToken });
          } else {
            setUser(null);
          }
          setAuthLoading(false);
        });
      } catch (err: any) {
        setAuthError(err.message);
        setAuthLoading(false);
      }
    })();

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  /* ─── AniList / Trakt: Handle OAuth redirect tokens in URL hash ───
   * Trakt's loadTraktUser call goes through our own /api/trakt/proxy, which requires
   * the Firebase idToken — so it can't fire here on mount (Firebase auth may not have
   * resolved yet). Tokens are just persisted to localStorage here; the "load saved
   * tokens" effect below (keyed on `user`) does the actual Trakt profile fetch once
   * auth is ready. AniList's client-only API has no such requirement. */
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1));
    const anilistToken = params.get("access_token");
    const traktAccessToken = params.get("trakt_access_token");
    const traktRefreshToken = params.get("trakt_refresh_token");
    if (!anilistToken && !traktAccessToken) return;

    // Clean the hash from the URL
    window.history.replaceState(null, "", window.location.pathname);

    if (anilistToken) {
      localStorage.setItem("anilist_token", anilistToken);
      loadAnilistUser(anilistToken);
    }
    if (traktAccessToken && traktRefreshToken) {
      localStorage.setItem("trakt_access_token", traktAccessToken);
      localStorage.setItem("trakt_refresh_token", traktRefreshToken);
    }
  }, []);

  /* ─── AniList: Load saved token on mount ─── */
  useEffect(() => {
    const savedToken = localStorage.getItem("anilist_token");
    if (savedToken) loadAnilistUser(savedToken);
  }, []);

  /* ─── Trakt: Load saved tokens once Firebase auth is ready ─── */
  useEffect(() => {
    if (!user) return;
    const savedAccessToken = localStorage.getItem("trakt_access_token");
    const savedRefreshToken = localStorage.getItem("trakt_refresh_token");
    if (savedAccessToken && savedRefreshToken) loadTraktUser(savedAccessToken, savedRefreshToken, user.idToken);
  }, [user]);

  /* ─── Token refresh for Firebase ─── */
  useEffect(() => {
    if (!firebaseAuth || !user) return;
    const interval = setInterval(async () => {
      try {
        const newToken = await firebaseAuth.auth.currentUser?.getIdToken(true);
        if (newToken) setUser((prev) => prev ? { ...prev, idToken: newToken } : null);
      } catch {}
    }, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [firebaseAuth, user]);

  /* ─── Fetch data once when user logs in (expenseSearch is filtered client-side, not refetched) ─── */
  useEffect(() => {
    if (user) { 
      fetchExpenses(); 
      fetchWatchlist();
      fetchSubscriptions();
      fetchNote();
    }
  }, [user]);

  const getHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${user?.idToken || ""}`,
  }), [user]);

  /* ─── AniList helpers ─── */
  async function loadAnilistUser(token: string) {
    try {
      const data = await anilistQuery(`query { Viewer { id name avatar { large } } }`, {}, token);
      const viewer = data.data?.Viewer;
      if (viewer) {
        setAnilistUser({ id: viewer.id, name: viewer.name, avatar: viewer.avatar?.large || null, token });
      }
    } catch (err) {
      console.error("AniList viewer load failed:", err);
      localStorage.removeItem("anilist_token");
    }
  }

  function connectAnilist() {
    const clientId = process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID;
    window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&response_type=token`;
  }

  function disconnectAnilist() {
    localStorage.removeItem("anilist_token");
    setAnilistUser(null);
  }

  // Shared by AniList/Trakt sync: one Firestore read + batched, diffed writes
  // instead of one request per title, to stay within the Spark plan's shared daily quota.
  async function syncEntriesToWatchlist(source: "anilist" | "trakt", entries: any[]) {
    const res = await fetch("/api/watchlist/sync", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ source, entries }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Sync failed: ${res.status}`);
    }
    return res.json() as Promise<{ added: number; updated: number; skipped: number }>;
  }

  async function syncAnilistLibrary() {
    if (!anilistUser || !user) return;
    setIsSyncingAnilist(true);
    setAnilistSyncMsg("Fetching your AniList library...");

    try {
      const data = await anilistQuery(`
        query ($userId: Int) {
          MediaListCollection(userId: $userId, type: ANIME) {
            lists {
              entries {
                id
                status
                progress
                score(format: POINT_10)
                media {
                  id
                  title { english romaji }
                  episodes
                  coverImage { large }
                  startDate { year }
                }
              }
            }
          }
        }
      `, { userId: anilistUser.id }, anilistUser.token);

      const lists = data.data?.MediaListCollection?.lists || [];
      const allEntries: any[] = [];
      lists.forEach((list: any) => allEntries.push(...(list.entries || [])));

      const normalized = allEntries.map((entry) => {
        const media = entry.media;
        return {
          title: media.title?.english || media.title?.romaji || "Unknown",
          type: "anime" as const,
          status: STATUS_MAP[entry.status] || "plan_to_watch",
          progress: entry.progress || 0,
          totalEpisodes: media.episodes || null,
          rating: entry.score || null,
          coverImage: media.coverImage?.large || null,
          year: media.startDate?.year || null,
          anilistId: media.id,
        };
      });

      setAnilistSyncMsg(`Syncing ${normalized.length} entries to Firestore...`);
      const result = await syncEntriesToWatchlist("anilist", normalized);

      setAnilistSyncMsg(`✅ Sync complete — ${result.added} added, ${result.updated} updated, ${result.skipped} unchanged`);
      fetchWatchlist();
      setTimeout(() => setAnilistSyncMsg(""), 4000);
    } catch (err: any) {
      setAnilistSyncMsg(`❌ Sync failed: ${err.message}`);
      setTimeout(() => setAnilistSyncMsg(""), 4000);
    } finally {
      setIsSyncingAnilist(false);
    }
  }

  /* ─── Trakt helpers ─── */
  async function loadTraktUser(accessToken: string, refreshToken: string, idToken: string | undefined) {
    try {
      const settings = await traktRequest(idToken, "/users/settings", { token: accessToken });
      const account = settings?.user;
      if (account) {
        setTraktUser({
          username: account.username,
          name: account.name || null,
          avatar: account.images?.avatar?.full || null,
          accessToken,
          refreshToken,
        });
      }
    } catch (err) {
      console.error("Trakt profile load failed:", err);
      localStorage.removeItem("trakt_access_token");
      localStorage.removeItem("trakt_refresh_token");
    }
  }

  function connectTrakt() {
    const redirectUri = `${window.location.origin}/api/auth/trakt/callback`;
    window.location.href = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${TRAKT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  function disconnectTrakt() {
    localStorage.removeItem("trakt_access_token");
    localStorage.removeItem("trakt_refresh_token");
    setTraktUser(null);
  }

  // Pulls Trakt's watchlist (plan-to-watch) and watched history (completed) for movies + shows.
  async function syncTraktLibrary() {
    if (!traktUser || !user) return;
    setIsSyncingTrakt(true);
    setTraktSyncMsg("Fetching your Trakt library...");

    try {
      const [watchlist, watchedShows, watchedMovies] = await Promise.all([
        traktRequest(user.idToken, "/sync/watchlist?limit=1000", { token: traktUser.accessToken }),
        traktRequest(user.idToken, "/sync/watched/shows?limit=1000&extended=progress", { token: traktUser.accessToken }),
        traktRequest(user.idToken, "/sync/watched/movies?limit=1000", { token: traktUser.accessToken }),
      ]);

      const byTraktId = new Map<number, any>();

      (watchlist || []).forEach((entry: any) => {
        const media = entry.movie || entry.show;
        if (!media) return;
        byTraktId.set(media.ids.trakt, {
          title: media.title,
          type: entry.movie ? "movie" : "show",
          status: "plan_to_watch",
          progress: 0,
          totalEpisodes: entry.show?.aired_episodes || null,
          rating: null,
          coverImage: null,
          year: media.year || null,
          traktId: media.ids.trakt,
          imdbId: media.ids.imdb || null,
          tvdbId: media.ids.tvdb || null,
        });
      });

      (watchedMovies || []).forEach((entry: any) => {
        const media = entry.movie;
        if (!media) return;
        byTraktId.set(media.ids.trakt, {
          title: media.title,
          type: "movie",
          status: "completed",
          progress: 0,
          totalEpisodes: null,
          rating: null,
          coverImage: null,
          year: media.year || null,
          traktId: media.ids.trakt,
          imdbId: media.ids.imdb || null,
          tvdbId: media.ids.tvdb || null,
        });
      });

      (watchedShows || []).forEach((entry: any) => {
        const media = entry.show;
        if (!media) return;

        let progress = 0;
        if (entry.seasons) {
          entry.seasons.forEach((season: any) => {
            if (season.episodes) {
              progress += season.episodes.length;
            }
          });
        }

        const totalEpisodes = media.aired_episodes || null;
        // If progress is greater than or equal to totalEpisodes (and totalEpisodes is not null), it is completed, otherwise they are watching it.
        const status = (totalEpisodes && progress >= totalEpisodes) ? "completed" : "watching";

        byTraktId.set(media.ids.trakt, {
          title: media.title,
          type: "show",
          status: status,
          progress: progress,
          totalEpisodes: totalEpisodes,
          rating: null,
          coverImage: null,
          year: media.year || null,
          traktId: media.ids.trakt,
          imdbId: media.ids.imdb || null,
          tvdbId: media.ids.tvdb || null,
        });
      });

      const normalized = Array.from(byTraktId.values());
      setTraktSyncMsg("Fetching cover images...");
      
      const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";
      await Promise.all(
        normalized.map(async (item: any) => {
          // 1. If TMDb API key is set, use find API to get poster for movies/shows
          if (item.imdbId && tmdbApiKey) {
            try {
              const res = await fetch(`https://api.themoviedb.org/3/find/${item.imdbId}?api_key=${tmdbApiKey}&external_source=imdb_id`);
              if (res.ok) {
                const searchData = await res.json();
                const movie = searchData.movie_results?.[0];
                const show = searchData.tv_results?.[0];
                const posterPath = movie?.poster_path || show?.poster_path;
                if (posterPath) {
                  item.coverImage = `https://image.tmdb.org/t/p/w185${posterPath}`;
                }
              }
            } catch (err) {
              console.error("TMDb poster fetch failed:", err);
            }
          }
          // 2. Fallback to TVmaze for shows if coverImage is still null
          if (item.type === "show" && !item.coverImage) {
            const queryParam = item.imdbId ? `imdb=${item.imdbId}` : item.tvdbId ? `thetvdb=${item.tvdbId}` : null;
            if (queryParam) {
              try {
                const res = await fetch(`https://api.tvmaze.com/lookup/shows?${queryParam}`);
                if (res.ok) {
                  const showData = await res.json();
                  if (showData.image?.medium) {
                    item.coverImage = showData.image.medium;
                  }
                }
              } catch (err) {
                console.error("TVmaze poster fetch failed:", err);
              }
            }
          }
        })
      );

      setTraktSyncMsg(`Syncing ${normalized.length} entries to Firestore...`);
      const result = await syncEntriesToWatchlist("trakt", normalized);

      setTraktSyncMsg(`✅ Sync complete — ${result.added} added, ${result.updated} updated, ${result.skipped} unchanged`);
      fetchWatchlist();
      setTimeout(() => setTraktSyncMsg(""), 4000);
    } catch (err: any) {
      setTraktSyncMsg(`❌ Sync failed: ${err.message}`);
      setTimeout(() => setTraktSyncMsg(""), 4000);
    } finally {
      setIsSyncingTrakt(false);
    }
  }

  // Push a status change back to Trakt: watchlist for plan_to_watch, history for completed.
  async function pushToTrakt(item: WatchlistItem, updates: Partial<WatchlistItem>) {
    if (!traktUser || !item.traktId || !user) return;
    const mergedStatus = updates.status || item.status;
    const idsBody = item.type === "movie"
      ? { movies: [{ ids: { trakt: item.traktId } }] }
      : { shows: [{ ids: { trakt: item.traktId } }] };

    try {
      if (mergedStatus === "completed") {
        await traktRequest(user.idToken, "/sync/history", { method: "POST", token: traktUser.accessToken, body: idsBody });
      } else if (mergedStatus === "plan_to_watch") {
        await traktRequest(user.idToken, "/sync/watchlist", { method: "POST", token: traktUser.accessToken, body: idsBody });
      } else if (mergedStatus === "dropped") {
        await traktRequest(user.idToken, "/sync/watchlist/remove", { method: "POST", token: traktUser.accessToken, body: idsBody });
      }
    } catch (err) {
      console.error("Trakt push failed:", err);
    }
  }

  // Push a progress/status/score update back to AniList
  async function pushToAnilist(item: WatchlistItem, updates: Partial<WatchlistItem>) {
    if (!anilistUser || !item.anilistId) return;
    try {
      const mergedStatus = updates.status || item.status;
      const mergedProgress = updates.progress !== undefined ? updates.progress : item.progress;
      const mergedRating = updates.rating !== undefined ? updates.rating : item.rating;

      await anilistQuery(`
        mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
          SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score) { id }
        }
      `, {
        mediaId: item.anilistId,
        status: ANILIST_STATUS_MAP[mergedStatus] || "CURRENT",
        progress: mergedProgress,
        score: mergedRating ? Number(mergedRating) : 0,
      }, anilistUser.token);
    } catch (err) {
      console.error("AniList push failed:", err);
    }
  }

  /* ─── Firebase Expenses API ───
   * fetchExpenses is only called once per session (on login) plus after sync-style
   * bulk operations; everyday adds/edits/deletes patch local state directly instead
   * of re-querying, so a single add doesn't cost a full collection re-read. */
  const fetchExpenses = async () => {
    setIsFetchingExpenses(true);
    try {
      const res = await fetch("/api/expenses", { headers: getHeaders() });
      if (res.ok) setExpenses(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsFetchingExpenses(false); }
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount) return;
    setIsAddingExpense(true);
    try {
      const payload = { title: expenseTitle, amount: Number(expenseAmount), category: expenseCategory || null, date: expenseDate || new Date().toISOString().slice(0, 10), notes: expenseNotes || null };
      const res = await fetch("/api/expenses", {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const { id } = await res.json();
        setExpenses((prev) => [{ id, ...payload, createdAt: Date.now() }, ...prev]);
        setExpenseTitle(""); setExpenseAmount(""); setExpenseCategory(""); setExpenseDate(""); setExpenseNotes("");
      }
    } catch (err) { console.error(err); }
    finally { setIsAddingExpense(false); }
  };

  const archiveExpenseItem = async (id: string) => {
    if (!confirm("Archive this expense?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE", headers: getHeaders() });
    if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const addSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName || !subCost || !subNextDate) return;
    setIsAddingSub(true);
    try {
      const payload = { name: subName, cost: Number(subCost), billingCycle: subCycle, nextBillingDate: subNextDate, icon: subIcon || null };
      const res = await fetch("/api/subscriptions", { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) });
      if (res.ok) {
        const { id } = await res.json();
        setSubscriptions((prev) => [{ id, ...payload, createdAt: Date.now() }, ...prev]);
        setSubName(""); setSubCost(""); setSubNextDate(""); setSubIcon(""); setSubCycle("monthly");
      }
    } catch (err) { console.error(err); }
    finally { setIsAddingSub(false); }
  };

  const deleteSubscription = async (id: string) => {
    if (!confirm("Delete this subscription?")) return;
    const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE", headers: getHeaders() });
    if (res.ok) setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  };


  /* ─── Notes Methods ─── */
  const updateNote = (newContent: string) => {
    setNoteContent(newContent);
    setIsSavingNote(true);
    if (saveNoteTimeout.current) clearTimeout(saveNoteTimeout.current);
    saveNoteTimeout.current = setTimeout(async () => {
      try {
        await fetch("/api/notes", { method: "POST", headers: getHeaders(), body: JSON.stringify({ content: newContent }) });
      } catch (err) { console.error(err); }
      finally { setIsSavingNote(false); }
    }, 1000);
  };

  /* ─── Watchlist API ─── */
  const fetchWatchlist = async () => {
    setIsFetchingWatchlist(true);
    try {
      const res = await fetch("/api/watchlist", { headers: getHeaders() });
      if (res.ok) setWatchlist(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsFetchingWatchlist(false); }
  };

  /* ─── New Features API ─── */
  const fetchSubscriptions = async () => {
    setIsFetchingSubscriptions(true);
    try {
      const res = await fetch("/api/subscriptions", { headers: getHeaders() });
      if (res.ok) setSubscriptions(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsFetchingSubscriptions(false); }
  };



  const fetchNote = async () => {
    setIsFetchingNote(true);
    try {
      const res = await fetch("/api/notes", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.content) setNoteContent(data.content);
      }
    } catch (err) { console.error(err); }
    finally { setIsFetchingNote(false); }
  };

  const addMediaToWatchlist = async (item: SearchResult) => {
    const res = await fetch("/api/watchlist", {
      method: "POST", headers: getHeaders(),
      body: JSON.stringify({ ...item, status: "plan_to_watch", progress: 0 }),
    });
    if (res.ok) {
      const { id } = await res.json();
      setWatchlist((prev) => [{ id, status: "plan_to_watch", progress: 0, rating: null, updatedAt: Date.now(), ...item }, ...prev]);
      setSearchResults([]); setMediaQuery("");
    }
  };

  const updateWatchItem = async (item: WatchlistItem, updates: Partial<WatchlistItem>) => {
    const res = await fetch(`/api/watchlist/${item.id}`, {
      method: "PATCH", headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      setWatchlist((prev) => prev.map((w) => w.id === item.id ? { ...w, ...updates, updatedAt: Date.now() } : w));
      // Sync status/progress back to the source the item came from
      if (item.type === "anime" && item.anilistId) {
        pushToAnilist(item, updates);
      } else if ((item.type === "movie" || item.type === "show") && item.traktId) {
        pushToTrakt(item, updates);
      }
    }
  };

  const deleteWatchItem = async (id: string) => {
    if (!confirm("Delete this watchlist item?")) return;
    const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE", headers: getHeaders() });
    if (res.ok) setWatchlist((prev) => prev.filter((w) => w.id !== id));
  };

  /* ─── Media Search ─── */
  const searchMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaQuery.trim()) return;
    setIsSearchingMedia(true);
    setSearchResults([]);
    try {
      if (mediaType === "anime") {
        const data = await anilistQuery(
          `query($s:String){Page(perPage:8){media(search:$s,type:ANIME){id title{english romaji}coverImage{large}startDate{year}episodes}}}`,
          { s: mediaQuery }
        );
        setSearchResults((data.data?.Page?.media || []).map((m: any) => ({
          title: m.title.english || m.title.romaji,
          type: "anime" as const,
          totalEpisodes: m.episodes || null,
          coverImage: m.coverImage?.large || null,
          year: m.startDate?.year || null,
          anilistId: m.id,
        })));
      } else {
        // mediaType is "movie" or "show" — search Trakt by type for accurate results
        const results = await traktRequest(user?.idToken, `/search/${mediaType}?query=${encodeURIComponent(mediaQuery)}&limit=8`);
        setSearchResults((results || []).map((r: any) => {
          const media = r.movie || r.show;
          return {
            title: media.title,
            type: mediaType as "movie" | "show",
            totalEpisodes: null,
            coverImage: null,
            year: media.year || null,
            traktId: media.ids?.trakt || null,
          };
        }));
      }
    } catch (err) { console.error(err); }
    finally { setIsSearchingMedia(false); }
  };

  const searchBooks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaQuery.trim()) return;
    setIsSearchingMedia(true);
    setSearchResults([]);
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(mediaQuery)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults((data.docs || []).map((item: any) => {
          return {
            title: item.title,
            type: "book" as const,
            totalEpisodes: item.number_of_pages_median || null, // Reuse totalEpisodes for total pages
            coverImage: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : null,
            year: item.first_publish_year || null,
          };
        }));
      }
    } catch (err) { console.error(err); }
    finally { setIsSearchingMedia(false); }
  };

  const handleLetterboxdImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingLb(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim() !== "");
      if (lines.length < 2) throw new Error("Invalid CSV format");

      const headerLine = lines[0].toLowerCase();
      // Use a robust CSV parser for header
      const headers = headerLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(s => s.replace(/(^"|"$)/g, '')) || [];
      const nameIdx = headers.findIndex(col => col.includes('name'));
      const yearIdx = headers.findIndex(col => col.includes('year'));

      if (nameIdx === -1) throw new Error("Could not find 'Name' column in CSV");

      const newItems: Omit<WatchlistItem, 'id'>[] = [];
      for (let i = 1; i < lines.length; i++) {
        // Simple regex-based CSV row parser ignoring commas in quotes
        let arr = [];
        let quote = false;
        let cell = '';
        const str = lines[i];
        for (let c = 0; c < str.length; c++) {
          let char = str[c];
          if (char === '"' && str[c+1] === '"') {
            cell += '"';
            c++;
          } else if (char === '"') {
            quote = !quote;
          } else if (char === ',' && !quote) {
            arr.push(cell.trim());
            cell = '';
          } else {
            cell += char;
          }
        }
        arr.push(cell.trim());
        
        if (!arr[nameIdx]) continue;

        const title = arr[nameIdx].replace(/(^"|"$)/g, '');
        const year = yearIdx !== -1 && arr[yearIdx] ? parseInt(arr[yearIdx].replace(/(^"|"$)/g, '')) : null;

        newItems.push({
          title,
          type: "movie",
          status: headerLine.includes("rating") || headerLine.includes("watched") ? "completed" : "plan_to_watch",
          progress: 1,
          totalEpisodes: 1,
          coverImage: null,
          year: year || null,
          updatedAt: Date.now(),
          rating: 0,
        });
      }

      if (newItems.length > 0) {
        if (!confirm(`Found ${newItems.length} movies. Import them into your watchlist?`)) {
          setIsImportingLb(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        const savedItems: WatchlistItem[] = [];
        for (const item of newItems) {
          const res = await fetch("/api/watchlist", {
            method: "POST", headers: getHeaders(),
            body: JSON.stringify(item),
          });
          if (res.ok) {
            const { id } = await res.json();
            savedItems.push({ id, ...item });
          }
        }
        setWatchlist(prev => [...savedItems, ...prev]);
        alert(`Successfully imported ${savedItems.length} movies!`);
      } else {
        alert("No movies found in the CSV.");
      }
    } catch (err: any) {
      alert("Import failed: " + err.message);
    } finally {
      setIsImportingLb(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getSalaryCycleRange = (salaryDay: number) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed
    const currentDate = today.getDate();

    let startDate: Date;
    let endDate: Date;

    if (currentDate >= salaryDay) {
      startDate = new Date(currentYear, currentMonth, salaryDay);
      endDate = new Date(currentYear, currentMonth + 1, salaryDay - 1);
    } else {
      startDate = new Date(currentYear, currentMonth - 1, salaryDay);
      endDate = new Date(currentYear, currentMonth, salaryDay - 1);
    }

    return {
      startStr: startDate.toISOString().slice(0, 10),
      endStr: endDate.toISOString().slice(0, 10),
    };
  };

  /* ─── Derived data ───
   * Search/time filtering happens client-side against the one cached fetch of
   * expenses, instead of re-querying Firestore on every keystroke. */
  const filteredExpenses = (() => {
    let list = expenses;

    if (timeFilter === "salary") {
      const { startStr, endStr } = getSalaryCycleRange(salaryStartDay);
      list = list.filter((e) => e.date && e.date >= startStr && e.date <= endStr);
    } else if (timeFilter !== "all") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Number(timeFilter));
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      list = list.filter((e) => e.date && e.date >= cutoffStr);
    }

    if (expenseSearch.trim()) {
      const qLower = expenseSearch.trim().toLowerCase();
      list = list.filter((e) =>
        e.title.toLowerCase().includes(qLower) ||
        (e.notes && e.notes.toLowerCase().includes(qLower))
      );
    }

    return list;
  })();

  const dailyTrend = (() => {
    const dailyMap: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      if (e.date) {
        dailyMap[e.date] = (dailyMap[e.date] || 0) + (e.amount || 0);
      }
    });
    return Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-10); // Show last 10 days of transactions in chart
  })();

  const totalSpent = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const largestCharge = filteredExpenses.length > 0 ? Math.max(...filteredExpenses.map((e) => e.amount || 0)) : 0;
  const largestItem = filteredExpenses.find((e) => e.amount === largestCharge);

  const catBreakdown = filteredExpenses.reduce((acc, e) => {
    const c = e.category || "Uncategorized";
    acc[c] = (acc[c] || 0) + (e.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.keys(catBreakdown).length > 0
    ? Object.entries(catBreakdown).sort((a, b) => b[1] - a[1])[0][0] : "None";

  const allCategories = Array.from(
    new Set([
      "Food", "Travel", "Rent", "Utilities", "Entertainment", "Shopping", "Others",
      ...expenses.map((e) => e.category || "").filter(Boolean),
      ...customCategories
    ])
  ).sort();

  const watchingCount = watchlist.filter((i) => i.status === "watching").length;
  const planCount     = watchlist.filter((i) => i.status === "plan_to_watch").length;
  const completedCount = watchlist.filter((i) => i.status === "completed").length;
  const lastCompleted = watchlist.filter((i) => i.status === "completed").sort((a, b) => b.updatedAt - a.updatedAt)[0];

  const filteredWatchlist = watchlist
    .filter((i) => {
      if (mediaCategory === "anime") {
        return i.type === "anime";
      } else {
        if (i.type === "anime") return false;
        return watchlistFilter === "all" || i.type === watchlistFilter;
      }
    })
    .filter((i) => watchlistTab === "watching" ? i.status === "watching" : watchlistTab === "plan" ? i.status === "plan_to_watch" : i.status === "completed" || i.status === "dropped");

  const animeCount = watchlist.filter((i) => i.type === "anime").length;
  const movieCount = watchlist.filter((i) => i.type === "movie").length;
  const showCount  = watchlist.filter((i) => i.type === "show").length;

  /* ─── Loading / Login screens ─── */
  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "28px", height: "28px", border: "2px solid var(--border-subtle)", borderTopColor: "var(--text-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }}></div>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Initialising...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    const handleGoogleLogin = async () => {
      if (!firebaseAuth) return;
      try {
        await firebaseAuth.signInWithPopup(firebaseAuth.auth, new firebaseAuth.GoogleAuthProvider());
      } catch (e: any) {
        setAuthError(e.message);
      }
    };

    return (
      <LandingPage
        onLogin={handleGoogleLogin}
        authError={authError}
        firebaseAuthReady={!!firebaseAuth}
      />
    );
  }

  /* ─── Main Dashboard ─── */
  return (
    <div className="app-container">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Mobile Header */}
      <header className="mobile-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 22H22L12 2ZM12 6L18.8 19.6H5.2L12 6Z" fill="var(--text-primary)"/></svg>
          <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>PHub Dashboard</span>
        </div>
        <div>
          {user && (
            <img
              src={user.photoURL || undefined}
              alt="Profile"
              onClick={async () => {
                if (confirm("Sign out?")) {
                  if (firebaseAuth) {
                    await firebaseAuth.signOut(firebaseAuth.auth);
                    setExpenses([]);
                    setWatchlist([]);
                  }
                }
              }}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "var(--text-primary)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                objectFit: "cover"
              }}
            />
          )}
        </div>
      </header>

      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px", paddingLeft: "8px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 22H22L12 2ZM12 6L18.8 19.6H5.2L12 6Z" fill="var(--text-primary)"/></svg>
            <span style={{ fontSize: "19px", fontWeight: 700, letterSpacing: "-0.5px" }}>PHub Dashboard</span>
          </div>
          <nav>
            <div onClick={() => setActiveTab("expenses")} className={`nav-link ${activeTab === "expenses" ? "active" : ""}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              Expenses Ledger
            </div>
            <div onClick={() => setActiveTab("media")} className={`nav-link ${activeTab === "media" ? "active" : ""}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              Media Watchlist
            </div>
            <div onClick={() => setActiveTab("books")} className={`nav-link ${activeTab === "books" ? "active" : ""}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              Book Library
            </div>
            <div onClick={() => setActiveTab("notes")} className={`nav-link ${activeTab === "notes" ? "active" : ""}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Quick Notes
            </div>
          </nav>


          {/* AniList connection block */}
          <div style={{ marginTop: "24px", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
            <span className="label-mono" style={{ paddingLeft: "14px", marginBottom: "10px", display: "block" }}>Integrations</span>
            {anilistUser ? (
              <div style={{ padding: "10px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
                {anilistUser.avatar
                  ? <img src={anilistUser.avatar} alt="AL" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} />
                  : <img src="/anilist.svg" alt="AL" style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#020617", objectFit: "contain", padding: "2px" }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>AniList</p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>{anilistUser.name}</p>
                </div>
                <button onClick={disconnectAnilist} title="Disconnect AniList" style={{ backgroundColor: "transparent", color: "var(--text-muted)", padding: "2px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <button onClick={connectAnilist} className="nav-link" style={{ width: "100%", textAlign: "left" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                Connect AniList
              </button>
            )}
            {traktUser ? (
              <div style={{ padding: "10px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
                {traktUser.avatar
                  ? <img src={traktUser.avatar} alt="Trakt" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} />
                  : <img src="/trakt.svg" alt="Trakt" style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--accent-anime)", objectFit: "contain" }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Trakt</p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>{traktUser.name || traktUser.username}</p>
                </div>
                <button onClick={disconnectTrakt} title="Disconnect Trakt" style={{ backgroundColor: "transparent", color: "var(--text-muted)", padding: "2px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <button onClick={connectTrakt} className="nav-link" style={{ width: "100%", textAlign: "left" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                Connect Trakt
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div>
          <a href="/gpt" className="nav-link" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px", borderRadius: 0, fontSize: "12px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>
            Connect to ChatGPT
          </a>
          <a href="/api/openapi.json" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ marginBottom: "8px", fontSize: "12px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>
            OpenAPI Spec
          </a>
          <div className="profile-card">
            {user.photoURL
              ? <img src={user.photoURL} alt="profile" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} referrerPolicy="no-referrer" />
              : <div className="profile-avatar">{(user.displayName || user.email || "U")[0].toUpperCase()}</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName || "User"}</p>
              <p style={{ fontSize: "10px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
            </div>
            <button onClick={async () => { if (firebaseAuth) await firebaseAuth.signOut(firebaseAuth.auth); setExpenses([]); setWatchlist([]); }} title="Sign out" style={{ backgroundColor: "transparent", padding: "4px", color: "var(--text-muted)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Main Canvas ─── */}
      <main className="main-content">
        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ backgroundColor: "#fff", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "6px 12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>DATABASE</span>
              <span style={{ fontWeight: 600 }}>Firestore</span>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#22c55e" }}></span>
              <span style={{ color: "#22c55e", fontWeight: 600 }}>Active</span>
            </div>
            {anilistUser && (
              <div style={{ backgroundColor: "#fff", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "6px 12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>ANILIST</span>
                <span style={{ fontWeight: 600 }}>{anilistUser.name}</span>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#3b82f6" }}></span>
                <span style={{ color: "#3b82f6", fontWeight: 600 }}>Connected</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#22c55e" }}></span>
              All systems operational
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {activeTab === "expenses" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", padding: "3px", marginRight: "12px" }}>
                  <button
                    onClick={() => setExpenseTab("ledger")}
                    style={{
                      fontSize: "11px", fontWeight: 600, padding: "5px 12px",
                      backgroundColor: expenseTab === "ledger" ? "#fff" : "transparent",
                      color: expenseTab === "ledger" ? "var(--text-primary)" : "var(--text-secondary)",
                      borderRadius: "6px", border: "none", cursor: "pointer",
                      boxShadow: expenseTab === "ledger" ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    Ledger
                  </button>
                  <button
                    onClick={() => setExpenseTab("subscriptions")}
                    style={{
                      fontSize: "11px", fontWeight: 600, padding: "5px 12px",
                      backgroundColor: expenseTab === "subscriptions" ? "#fff" : "transparent",
                      color: expenseTab === "subscriptions" ? "var(--text-primary)" : "var(--text-secondary)",
                      borderRadius: "6px", border: "none", cursor: "pointer",
                      boxShadow: expenseTab === "subscriptions" ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    Subscriptions
                  </button>
                </div>

                {expenseTab === "ledger" && timeFilter === "salary" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Cycle Start Day:</span>
                    <select
                      value={salaryStartDay}
                      onChange={(e) => updateSalaryStartDay(Number(e.target.value))}
                      style={{ padding: "4px 8px", fontSize: "12px", borderRadius: "6px" }}
                    >
                      {[...Array(31)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                )}
                {expenseTab === "ledger" && (
                  <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "6px" }}>
                    <option value="all">All time</option>
                    <option value="salary">Current Salary Cycle</option>
                    <option value="30">Last 30 days</option>
                    <option value="7">Last 7 days</option>
                  </select>
                )}
              </div>
            )}
          </div>
        </header>

        {/* ─── EXPENSES TAB ─── */}
        {activeTab === "expenses" && expenseTab === "ledger" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }} className="animate-fade-in">
            <div className="responsive-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div className="stat-card"><span className="label-mono">Total Spent</span><span className="stat-value">₹{totalSpent.toLocaleString("en-IN")}</span><span className="stat-subtext">{timeFilter === "all" ? "All time" : `Last ${timeFilter} days`}</span></div>
              <div className="stat-card"><span className="label-mono">Charges Logged</span><span className="stat-value" style={{ color: "#b3666b" }}>{filteredExpenses.length}</span><span className="stat-subtext">Transactions</span></div>
              <div className="stat-card"><span className="label-mono">Largest Charge</span><span className="stat-value" style={{ color: "#e39282", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>₹{largestCharge.toLocaleString("en-IN")}</span><span className="stat-subtext" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{largestItem?.title || "—"}</span></div>
              <div className="stat-card"><span className="label-mono">Top Category</span><span className="stat-value" style={{ fontSize: "22px", marginTop: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topCategory}</span><span className="stat-subtext">Highest share</span></div>
            </div>

            {/* Chart */}
            <div className="bento-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Analytics</h3>
                <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", padding: "3px" }}>
                  <button
                    onClick={() => setActiveChart("category")}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "5px 12px",
                      backgroundColor: activeChart === "category" ? "#fff" : "transparent",
                      color: activeChart === "category" ? "var(--text-primary)" : "var(--text-secondary)",
                      borderRadius: "6px",
                      boxShadow: activeChart === "category" ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                      transition: "all 0.2s",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    Category Distribution
                  </button>
                  <button
                    onClick={() => setActiveChart("trend")}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "5px 12px",
                      backgroundColor: activeChart === "trend" ? "#fff" : "transparent",
                      color: activeChart === "trend" ? "var(--text-primary)" : "var(--text-secondary)",
                      borderRadius: "6px",
                      boxShadow: activeChart === "trend" ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                      transition: "all 0.2s",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    Daily Trend
                  </button>
                </div>
              </div>

              {activeChart === "category" ? (
                <div className="chart-container" style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: "180px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>
                  {Object.entries(catBreakdown).slice(0, 8).map(([cat, total], idx) => {
                    const maxAmt = Math.max(...Object.values(catBreakdown), 1);
                    const pct = (total / maxAmt) * 100;
                    const colors = ["#b3666b", "#e39282", "#1c1b18", "#6e6c64", "#d1b89a", "#eae8e0", "#9c9a92", "#c4c2ba"];
                    return (
                      <div key={cat} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flex: 1, maxWidth: "80px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)" }}>₹{(total/1000).toFixed(0)}k</span>
                        <div className="chart-bar-container" style={{ width: "22px", height: "140px", display: "flex", alignItems: "flex-end", backgroundColor: "var(--bg-secondary)", borderRadius: "4px 4px 0 0" }}>
                          <div style={{ width: "100%", height: `${pct}%`, backgroundColor: colors[idx % colors.length], borderRadius: "4px 4px 0 0", transition: "height 0.5s ease" }}></div>
                        </div>
                        <span style={{ fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase", color: "var(--text-muted)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }} title={cat}>{cat}</span>
                      </div>
                    );
                  })}
                  {Object.keys(catBreakdown).length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "13px", alignSelf: "center" }}>No transactions to plot.</p>}
                </div>
              ) : (
                <div className="chart-container" style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: "180px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>
                  {dailyTrend.map(([date, total], idx) => {
                    const maxAmt = Math.max(...dailyTrend.map(d => d[1]), 1);
                    const pct = (total / maxAmt) * 100;
                    // Format date to MM/DD
                    const dateParts = date.split("-");
                    const dateFormatted = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : date;
                    return (
                      <div key={date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flex: 1, maxWidth: "80px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)" }}>₹{total.toLocaleString("en-IN")}</span>
                        <div className="chart-bar-container" style={{ width: "22px", height: "140px", display: "flex", alignItems: "flex-end", backgroundColor: "var(--bg-secondary)", borderRadius: "4px 4px 0 0" }}>
                          <div style={{ width: "100%", height: `${pct}%`, backgroundColor: "#3b82f6", borderRadius: "4px 4px 0 0", transition: "height 0.5s ease" }}></div>
                        </div>
                        <span style={{ fontSize: "9px", fontFamily: "monospace", color: "var(--text-muted)", textAlign: "center", width: "100%" }}>{dateFormatted}</span>
                      </div>
                    );
                  })}
                  {dailyTrend.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "13px", alignSelf: "center" }}>No transaction history to plot.</p>}
                </div>
              )}
            </div>

            {/* Form + table */}
            <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="bento-card">
                  <span className="label-mono" style={{ marginBottom: "14px", display: "block" }}>Log Transaction</span>
                  <form onSubmit={addExpense} style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                    <input type="text" value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} placeholder="Description" required />
                    <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="Amount (₹)" required />
                    
                    <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} required style={{ width: "100%" }}>
                      <option value="">Select Category</option>
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder="New category..."
                        style={{ flex: 1, fontSize: "11px", padding: "6px 8px" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newCategoryInput.trim();
                          if (trimmed && !customCategories.includes(trimmed)) {
                            setCustomCategories((prev) => [...prev, trimmed]);
                            setExpenseCategory(trimmed);
                            setNewCategoryInput("");
                          }
                        }}
                        style={{
                          padding: "6px 12px",
                          fontSize: "11px",
                          backgroundColor: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          fontWeight: 600,
                          borderRadius: "6px",
                          border: "1px solid var(--border-subtle)",
                          cursor: "pointer"
                        }}
                      >
                        + Add
                      </button>
                    </div>

                    <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
                    <input type="text" value={expenseNotes} onChange={(e) => setExpenseNotes(e.target.value)} placeholder="Notes" />
                    <button type="submit" disabled={isAddingExpense} className="btn-primary" style={{ marginTop: "4px" }}>{isAddingExpense ? "Logging..." : "Log Item"}</button>
                  </form>
                </div>
                <div className="bento-card">
                  <span className="label-mono" style={{ marginBottom: "14px", display: "block" }}>Categories</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {Object.entries(catBreakdown).map(([cat, total]) => {
                      const pct = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
                      return (
                        <div key={cat} style={{ fontSize: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ fontWeight: 500 }}>{cat}</span><span style={{ fontFamily: "monospace", color: "var(--text-secondary)", fontSize: "11px" }}>{pct.toFixed(0)}%</span></div>
                          <div style={{ height: "3px", backgroundColor: "var(--bg-secondary)", borderRadius: "2px" }}><div style={{ width: `${pct}%`, height: "100%", backgroundColor: "var(--text-primary)", borderRadius: "2px" }}></div></div>
                        </div>
                      );
                    })}
                    {Object.keys(catBreakdown).length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>No categories yet.</p>}
                  </div>
                </div>
              </div>
              <div className="bento-card" style={{ display: "flex", flexDirection: "column", gap: "16px", height: "550px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <span className="label-mono">Ledger Sheet</span>
                  <input type="text" value={expenseSearch} onChange={(e) => setExpenseSearch(e.target.value)} placeholder="Search..." style={{ fontSize: "12px", padding: "6px 12px", width: "180px" }} />
                </div>
                <div style={{ overflowY: "auto", overflowX: "auto", flex: 1, paddingRight: "4px" }}>
                  {isFetchingExpenses ? <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px", fontSize: "13px" }}>Loading...</p> : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ color: "var(--text-secondary)" }}>
                          <th style={{ paddingBottom: "10px", fontWeight: 500, textAlign: "left", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1, borderBottom: "1px solid var(--border-subtle)" }}>Description</th>
                          <th style={{ paddingBottom: "10px", fontWeight: 500, textAlign: "left", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1, borderBottom: "1px solid var(--border-subtle)" }}>Category</th>
                          <th style={{ paddingBottom: "10px", fontWeight: 500, textAlign: "left", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1, borderBottom: "1px solid var(--border-subtle)" }}>Date</th>
                          <th style={{ paddingBottom: "10px", fontWeight: 500, textAlign: "right", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1, borderBottom: "1px solid var(--border-subtle)" }}>Amount</th>
                          <th style={{ paddingBottom: "10px", fontWeight: 500, textAlign: "center", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1, borderBottom: "1px solid var(--border-subtle)" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map((e) => (
                          <tr key={e.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <td style={{ padding: "11px 0", fontWeight: 500 }}>{e.title}</td>
                            <td style={{ padding: "11px 0" }}>{e.category ? <span style={{ backgroundColor: "var(--bg-secondary)", padding: "2px 8px", borderRadius: "9999px", fontSize: "11px" }}>{e.category}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                            <td style={{ padding: "11px 0", color: "var(--text-secondary)" }}>{e.date || "—"}</td>
                            <td style={{ padding: "11px 0", textAlign: "right", fontWeight: 600 }}>₹{(e.amount || 0).toLocaleString("en-IN")}</td>
                            <td style={{ padding: "11px 0", textAlign: "center" }}><button onClick={() => archiveExpenseItem(e.id)} style={{ backgroundColor: "transparent", color: "#ef4444", fontSize: "11px", padding: "2px 8px" }}>Archive</button></td>
                          </tr>
                        ))}
                        {filteredExpenses.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No transactions.</td></tr>}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MEDIA TAB ─── */}
        {activeTab === "media" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }} className="animate-fade-in">

            {/* Stats */}
            <div className="responsive-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
              <div className="stat-card"><span className="label-mono">Watching Now</span><span className="stat-value">{watchingCount}</span><span className="stat-subtext">Active items</span></div>
              <div className="stat-card"><span className="label-mono">Plan to Watch</span><span className="stat-value" style={{ color: "#b3666b" }}>{planCount}</span><span className="stat-subtext">Queued</span></div>
              <div className="stat-card"><span className="label-mono">Completed</span><span className="stat-value" style={{ color: "#e39282" }}>{completedCount}</span><span className="stat-subtext">Finished</span></div>
              <div className="stat-card">
                <span className="label-mono">Library</span>
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <div style={{ textAlign: "center" }}><p style={{ fontSize: "20px", fontWeight: 700 }}>{animeCount}</p><p style={{ fontSize: "10px", color: "var(--text-muted)" }}>Anime</p></div>
                  <div style={{ textAlign: "center" }}><p style={{ fontSize: "20px", fontWeight: 700 }}>{showCount}</p><p style={{ fontSize: "10px", color: "var(--text-muted)" }}>Shows</p></div>
                  <div style={{ textAlign: "center" }}><p style={{ fontSize: "20px", fontWeight: 700 }}>{movieCount}</p><p style={{ fontSize: "10px", color: "var(--text-muted)" }}>Movies</p></div>
                </div>
              </div>
            </div>

            {/* AniList sync banner */}
            {anilistUser ? (
              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                {anilistUser.avatar && <img src={anilistUser.avatar} alt="AL" style={{ width: "36px", height: "36px", borderRadius: "50%" }} />}
                <div style={{ flex: 1, minWidth: "150px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#1e40af" }}>AniList connected as {anilistUser.name}</p>
                  <p style={{ fontSize: "11px", color: "#3b82f6", marginTop: "2px" }}>
                    {anilistSyncMsg || "Import your full AniList library and keep progress synced both ways."}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button onClick={syncAnilistLibrary} disabled={isSyncingAnilist} className="btn-primary" style={{ backgroundColor: "#2563eb", borderColor: "#2563eb", fontSize: "12px", padding: "8px 16px", whiteSpace: "nowrap" }}>
                    {isSyncingAnilist ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "12px", height: "12px", border: "1.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }}></span>
                        Syncing...
                      </span>
                    ) : "↓ Sync Library"}
                  </button>
                  <button onClick={disconnectAnilist} title="Disconnect AniList" style={{ backgroundColor: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: "#fff", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "var(--accent-anime)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "12px" }}>AL</div>
                <div style={{ flex: 1, minWidth: "150px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600 }}>Connect AniList</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Sync your anime and manga watch progress automatically.</p>
                </div>
                <button onClick={connectAnilist} className="btn-primary" style={{ fontSize: "12px", padding: "8px 16px", whiteSpace: "nowrap" }}>Connect</button>
              </div>
            )}

            {/* Trakt sync banner */}
            {traktUser ? (
              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                {traktUser.avatar && <img src={traktUser.avatar} alt="Trakt" style={{ width: "36px", height: "36px", borderRadius: "50%" }} />}
                <div style={{ flex: 1, minWidth: "150px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#1e40af" }}>Trakt connected as {traktUser.name || traktUser.username}</p>
                  <p style={{ fontSize: "11px", color: "#3b82f6", marginTop: "2px" }}>
                    {traktSyncMsg || "Import your Trakt watchlist and watched history for movies & shows."}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button onClick={syncTraktLibrary} disabled={isSyncingTrakt} className="btn-primary" style={{ backgroundColor: "#2563eb", borderColor: "#2563eb", fontSize: "12px", padding: "8px 16px", whiteSpace: "nowrap" }}>
                    {isSyncingTrakt ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "12px", height: "12px", border: "1.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }}></span>
                        Syncing...
                      </span>
                    ) : "↓ Sync Library"}
                  </button>
                  <button onClick={disconnectTrakt} title="Disconnect Trakt" style={{ backgroundColor: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: "#fff", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "12px" }}>TR</div>
                <div style={{ flex: 1, minWidth: "150px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600 }}>Connect Trakt</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Sync your movies and TV shows watch progress automatically.</p>
                </div>
                <button onClick={connectTrakt} className="btn-primary" style={{ fontSize: "12px", padding: "8px 16px", whiteSpace: "nowrap" }}>Connect</button>
              </div>
            )}

            {/* Letterboxd Import */}
            <div style={{ backgroundColor: "#fff", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <img src="/letterboxd.svg" alt="LB" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "contain", backgroundColor: "#14181c" }} />
              <div style={{ flex: 1, minWidth: "150px" }}>
                <p style={{ fontSize: "13px", fontWeight: 600 }}>Import Letterboxd</p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Upload your Letterboxd CSV (watchlist or watched) to import your movies.</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef} 
                  style={{ display: "none" }} 
                  onChange={handleLetterboxdImport} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isImportingLb} 
                  className="btn-primary" 
                  style={{ fontSize: "12px", padding: "8px 16px", whiteSpace: "nowrap", backgroundColor: "#00e054", borderColor: "#00e054", color: "#fff" }}
                >
                  {isImportingLb ? "Importing..." : "Upload CSV"}
                </button>
              </div>
            </div>

            {/* Content grid */}
            <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px" }}>
              {/* Search */}
              <div className="bento-card" style={{ display: "flex", flexDirection: "column", gap: "16px", alignSelf: "start" }}>
                <div>
                  <span className="label-mono">Search & Add</span>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>AniList &amp; Trakt search</p>
                </div>
                <form onSubmit={searchMedia} style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <input type="text" value={mediaQuery} onChange={(e) => setMediaQuery(e.target.value)} placeholder="Search title..." />
                  <select value={mediaType} onChange={(e) => setMediaType(e.target.value as any)}>
                    <option value="anime">Anime (AniList)</option>
                    <option value="movie">Movies (Trakt)</option>
                    <option value="show">TV Shows (Trakt)</option>
                  </select>
                  <button type="submit" className="btn-primary">Search</button>
                </form>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "420px", overflowY: "auto" }}>
                  {searchResults.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "10px" }}>
                      {item.coverImage ? <img src={item.coverImage} alt={item.title} style={{ width: "34px", height: "48px", objectFit: "cover", borderRadius: "4px" }} /> : <div style={{ width: "34px", height: "48px", backgroundColor: "var(--bg-secondary)", borderRadius: "4px" }}></div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</p>
                        <p style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{item.year || "N/A"} · {item.type}{item.totalEpisodes ? ` · ${item.totalEpisodes} eps` : ""}</p>
                      </div>
                      <button onClick={() => addMediaToWatchlist(item)} className="btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }}>+ Add</button>
                    </div>
                  ))}
                  {isSearchingMedia && <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>Searching...</p>}
                </div>
              </div>

              {/* Watchlist */}
              <div className="bento-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    {/* Left: Category Switch Tabs */}
                    <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", padding: "3px" }}>
                      <button
                        onClick={() => {
                          setMediaCategory("general");
                          if (watchlistFilter === "anime") setWatchlistFilter("all");
                        }}
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "6px 14px",
                          backgroundColor: mediaCategory === "general" ? "#fff" : "transparent",
                          color: mediaCategory === "general" ? "var(--text-primary)" : "var(--text-secondary)",
                          borderRadius: "6px",
                          boxShadow: mediaCategory === "general" ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                          transition: "all 0.2s",
                          border: "none",
                          cursor: "pointer"
                        }}
                      >
                        🎬 Movies & Shows
                      </button>
                      <button
                        onClick={() => {
                          setMediaCategory("anime");
                        }}
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "6px 14px",
                          backgroundColor: mediaCategory === "anime" ? "#fff" : "transparent",
                          color: mediaCategory === "anime" ? "var(--text-primary)" : "var(--text-secondary)",
                          borderRadius: "6px",
                          boxShadow: mediaCategory === "anime" ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                          transition: "all 0.2s",
                          border: "none",
                          cursor: "pointer"
                        }}
                      >
                        🌸 Anime
                      </button>
                    </div>

                    {/* Right: Sub-filters and Status Tabs */}
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      {/* Sub-type filter for general (Movies & Shows) */}
                      {mediaCategory === "general" && (
                        <select
                          value={watchlistFilter === "anime" ? "all" : watchlistFilter}
                          onChange={(e) => setWatchlistFilter(e.target.value as any)}
                          style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "6px", backgroundColor: "#fff" }}
                        >
                          <option value="all">All Types</option>
                          <option value="show">Shows Only</option>
                          <option value="movie">Movies Only</option>
                        </select>
                      )}

                      {/* Status tabs */}
                      <div style={{ display: "flex", gap: "3px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", padding: "3px" }}>
                        {(["watching", "plan", "completed"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setWatchlistTab(tab)}
                            style={{
                              fontSize: "11px",
                              padding: "5px 10px",
                              backgroundColor: watchlistTab === tab ? "#fff" : "transparent",
                              color: watchlistTab === tab ? "var(--text-primary)" : "var(--text-secondary)",
                              borderRadius: "6px",
                              boxShadow: watchlistTab === tab ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                              transition: "all 0.2s",
                              border: "none",
                              cursor: "pointer"
                            }}
                          >
                            {tab === "watching" ? "🍿 Watching" : tab === "plan" ? "⏳ Plan" : "✅ Done"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", minHeight: "300px" }}>
                  {isFetchingWatchlist
                    ? <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "60px", fontSize: "13px" }}>Loading...</p>
                    : filteredWatchlist.length === 0
                    ? <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "60px", fontSize: "13px" }}>Nothing here yet.</p>
                    : filteredWatchlist.map((item) => (
                      <div key={item.id} style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
                        {item.coverImage ? <img src={item.coverImage} alt={item.title} style={{ width: "38px", height: "54px", objectFit: "cover", borderRadius: "6px" }} /> : <div style={{ width: "38px", height: "54px", backgroundColor: "var(--bg-secondary)", borderRadius: "6px" }}></div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <p style={{ fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{item.title}</p>
                            {/* Sync indicator */}
                            {item.anilistId && anilistUser && (
                              <span title="Synced with AniList" style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#3b82f6", flexShrink: 0 }}></span>
                            )}
                            {item.traktId && traktUser && (
                              <span title="Synced with Trakt" style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ef4444", flexShrink: 0 }}></span>
                            )}
                          </div>
                          <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                            <span style={{ textTransform: "capitalize" }}>{item.type}</span>{item.year ? ` (${item.year})` : ""}
                          </p>
                          {item.type !== "movie" && (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "5px" }}>
                              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Ep {item.progress}{item.totalEpisodes ? `/${item.totalEpisodes}` : ""}</span>
                              <button onClick={() => updateWatchItem(item, { progress: Math.max(0, item.progress - 1) })} style={{ backgroundColor: "var(--bg-secondary)", padding: "1px 6px", fontSize: "11px", borderRadius: "4px" }}>-</button>
                              <button onClick={() => { const n = item.progress + 1; updateWatchItem(item, { progress: n, ...(item.totalEpisodes && n >= item.totalEpisodes ? { status: "completed" } : {}) }); }} style={{ backgroundColor: "var(--bg-secondary)", padding: "1px 6px", fontSize: "11px", borderRadius: "4px" }}>+</button>
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                          <select value={item.status} onChange={(e) => updateWatchItem(item, { status: e.target.value as any })} style={{ fontSize: "11px", padding: "3px 6px", borderRadius: "6px" }}>
                            <option value="plan_to_watch">Plan</option>
                            <option value="watching">Watching</option>
                            <option value="completed">Completed</option>
                            <option value="dropped">Dropped</option>
                          </select>
                          <select value={item.rating || ""} onChange={(e) => updateWatchItem(item, { rating: e.target.value ? Number(e.target.value) : null })} style={{ fontSize: "11px", padding: "3px 6px", borderRadius: "6px" }}>
                            <option value="">Score</option>
                            {[...Array(10)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}/10</option>)}
                          </select>
                          <button onClick={() => deleteWatchItem(item.id)} style={{ backgroundColor: "transparent", color: "#ef4444", padding: "2px", fontSize: "11px" }}>✕</button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── SUBSCRIPTIONS TAB ─── */}
        {activeTab === "expenses" && expenseTab === "subscriptions" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Subscriptions</h1>
            
            <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
              <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px" }}>
                <div>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Monthly Burn Rate</p>
                  <p style={{ fontSize: "32px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
                    ${subscriptions.reduce((acc, sub) => acc + (sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost), 0).toFixed(2)}
                  </p>
                </div>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "var(--accent-expense)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="2" y1="16" x2="22" y2="16"/></svg>
                </div>
              </div>

              <div className="card" style={{ padding: "20px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Add Subscription</h2>
                <form onSubmit={addSubscription} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input type="text" placeholder="Name (e.g. Netflix)" value={subName} onChange={(e) => setSubName(e.target.value)} required style={{ flex: 1 }} />
                    <input type="text" placeholder="Icon (e.g. 🍿)" value={subIcon} onChange={(e) => setSubIcon(e.target.value)} style={{ width: "60px" }} />
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input type="number" placeholder="Cost ($)" value={subCost} onChange={(e) => setSubCost(e.target.value)} required step="0.01" style={{ flex: 1 }} />
                    <select value={subCycle} onChange={(e) => setSubCycle(e.target.value as "monthly" | "yearly")} style={{ flex: 1 }}>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <input type="date" placeholder="Next Billing Date" value={subNextDate} onChange={(e) => setSubNextDate(e.target.value)} required />
                  <button type="submit" disabled={isAddingSub} className="btn-primary" style={{ marginTop: "4px" }}>
                    {isAddingSub ? "Adding..." : "Add Subscription"}
                  </button>
                </form>
              </div>
            </div>

            <div className="card" style={{ padding: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Active Subscriptions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {subscriptions.map(sub => (
                  <div key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", backgroundColor: "var(--bg-body)", borderRadius: "12px" }}>
                    <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "10px", backgroundColor: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                        {sub.icon || "💳"}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "15px" }}>{sub.name}</p>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>Next: {sub.nextBillingDate}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontWeight: 700, fontSize: "15px" }}>${sub.cost.toFixed(2)}</p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{sub.billingCycle}</p>
                      </div>
                      <button onClick={() => deleteSubscription(sub.id)} style={{ backgroundColor: "transparent", color: "#ef4444", padding: "4px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
                {isFetchingSubscriptions && subscriptions.length === 0 && <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>Loading subscriptions...</p>}
                {!isFetchingSubscriptions && subscriptions.length === 0 && <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>No subscriptions added.</p>}
              </div>
            </div>
          </div>
        )}


        {/* ─── BOOKS TAB ─── */}
        {activeTab === "books" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Book Library</h1>

            <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
              <div className="card" style={{ padding: "20px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Search Google Books</h2>
                <form onSubmit={searchBooks} style={{ display: "flex", gap: "10px" }}>
                  <input type="text" placeholder="Title, Author..." value={mediaQuery} onChange={(e) => setMediaQuery(e.target.value)} required style={{ flex: 1 }} />
                  <button type="submit" disabled={isSearchingMedia} className="btn-primary" style={{ whiteSpace: "nowrap" }}>
                    {isSearchingMedia ? "..." : "Search"}
                  </button>
                </form>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto", marginTop: "16px" }}>
                  {searchResults.filter(item => item.type === "book").map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "10px" }}>
                      {item.coverImage ? <img src={item.coverImage} alt={item.title} style={{ width: "34px", height: "48px", objectFit: "cover", borderRadius: "4px" }} /> : <div style={{ width: "34px", height: "48px", backgroundColor: "var(--bg-secondary)", borderRadius: "4px" }}></div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</p>
                        <p style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{item.year || "N/A"}{item.totalEpisodes ? ` · ${item.totalEpisodes} pages` : ""}</p>
                      </div>
                      <button onClick={() => addMediaToWatchlist(item)} className="btn-secondary" style={{ padding: "4px 8px", fontSize: "11px", whiteSpace: "nowrap" }}>+ Add</button>
                    </div>
                  ))}
                  {isSearchingMedia && <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>Searching Google Books...</p>}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 600 }}>Your Library</h2>
                <div style={{ display: "flex", gap: "3px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", padding: "3px" }}>
                  {(["watching", "plan", "completed"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setWatchlistTab(tab)}
                      style={{
                        fontSize: "11px", padding: "5px 10px",
                        backgroundColor: watchlistTab === tab ? "#fff" : "transparent",
                        color: watchlistTab === tab ? "var(--text-primary)" : "var(--text-secondary)",
                        borderRadius: "6px", border: "none", cursor: "pointer",
                        boxShadow: watchlistTab === tab ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                        transition: "all 0.2s"
                      }}
                    >
                      {tab === "watching" ? "📖 Reading" : tab === "plan" ? "⏳ To Read" : "✅ Done"}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "16px" }}>
                {watchlist
                  .filter((w) => w.type === "book" && (watchlistTab === "plan" ? w.status === "plan_to_watch" : w.status === watchlistTab))
                  .map((item) => (
                    <div key={item.id} className="book-card group" style={{ display: "flex", flexDirection: "column", gap: "8px", position: "relative" }}>
                      <div style={{ width: "100%", aspectRatio: "2/3", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", overflow: "hidden", position: "relative", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}>
                        {item.coverImage ? <img src={item.coverImage} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.2s" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "var(--text-muted)", padding: "10px", textAlign: "center" }}>No cover</div>}
                        
                        {/* Hover Overlay Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-2" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", opacity: 0, transition: "opacity 0.2s", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "8px", gap: "6px" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
                          <select value={item.status} onChange={(e) => updateWatchItem(item, { status: e.target.value as any })} style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.9)", border: "none", width: "100%" }}>
                            <option value="plan_to_watch">To Read</option>
                            <option value="watching">Reading</option>
                            <option value="completed">Done</option>
                          </select>
                          <button onClick={() => deleteWatchItem(item.id)} style={{ backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            Delete
                          </button>
                        </div>
                      </div>
                      <div style={{ minWidth: 0, marginTop: "4px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.title}>{item.title}</p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                          {watchlistTab === "watching" && item.totalEpisodes && (
                            <div style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <input type="number" value={item.progress} onChange={(e) => updateWatchItem(item, { progress: Number(e.target.value) })} style={{ width: "45px", padding: "3px 6px", fontSize: "11px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }} />
                              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>/ {item.totalEpisodes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {watchlist.filter(w => w.type === "book" && (watchlistTab === "plan" ? w.status === "plan_to_watch" : w.status === watchlistTab)).length === 0 && <p style={{ gridColumn: "1 / -1", fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>No books here.</p>}
              </div>
            </div>
          </div>
        )}



        {/* ─── NOTES TAB ─── */}
        {activeTab === "notes" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 100px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Scratchpad</h1>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {isSavingNote ? "Saving..." : "Saved"}
              </span>
            </div>

            <div className="card" style={{ flex: 1, padding: "0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <textarea 
                value={noteContent} 
                onChange={(e) => updateNote(e.target.value)} 
                placeholder="Write your notes here... (Markdown supported mentally)" 
                style={{ 
                  flex: 1, padding: "24px", border: "none", resize: "none", 
                  backgroundColor: "transparent", color: "var(--text-primary)", 
                  fontSize: "15px", lineHeight: "1.6", outline: "none", fontFamily: "inherit" 
                }} 
              />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav" style={{ overflowX: "auto", justifyContent: "flex-start", padding: "0 8px", gap: "16px" }}>
        <div onClick={() => setActiveTab("expenses")} className={`mobile-nav-link ${activeTab === "expenses" ? "active" : ""}`} style={{ flexShrink: 0, padding: "10px 12px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <span style={{ marginTop: "2px" }}>Ledger</span>
        </div>
        <div onClick={() => setActiveTab("subscriptions")} className={`mobile-nav-link ${activeTab === "subscriptions" ? "active" : ""}`} style={{ flexShrink: 0, padding: "10px 12px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="2" y1="16" x2="22" y2="16"/></svg>
          <span style={{ marginTop: "2px" }}>Subs</span>
        </div>
        <div onClick={() => setActiveTab("habits")} className={`mobile-nav-link ${activeTab === "habits" ? "active" : ""}`} style={{ flexShrink: 0, padding: "10px 12px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span style={{ marginTop: "2px" }}>Habits</span>
        </div>
        <div onClick={() => setActiveTab("goals")} className={`mobile-nav-link ${activeTab === "goals" ? "active" : ""}`} style={{ flexShrink: 0, padding: "10px 12px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <span style={{ marginTop: "2px" }}>Goals</span>
        </div>
        <div onClick={() => setActiveTab("media")} className={`mobile-nav-link ${activeTab === "media" ? "active" : ""}`} style={{ flexShrink: 0, padding: "10px 12px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          <span style={{ marginTop: "2px" }}>Watchlist</span>
        </div>
        <div onClick={() => setActiveTab("books")} className={`mobile-nav-link ${activeTab === "books" ? "active" : ""}`} style={{ flexShrink: 0, padding: "10px 12px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span style={{ marginTop: "2px" }}>Library</span>
        </div>
        <div onClick={() => setActiveTab("notes")} className={`mobile-nav-link ${activeTab === "notes" ? "active" : ""}`} style={{ flexShrink: 0, padding: "10px 12px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span style={{ marginTop: "2px" }}>Notes</span>
        </div>
      </nav>
    </div>
  );
}
