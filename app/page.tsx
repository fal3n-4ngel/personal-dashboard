"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  FirebaseUser,
  AniListUser,
  TraktUser,
  Expense,
  WatchlistItem,
  Subscription,
  InvestmentAsset,
  InvestmentCategory,
  SearchResult,
  InvestmentQuote,
} from "@/types";
import { getNextFutureBillingDate, getSalaryCycleRange } from "@/lib/dates";
import { anilistQuery } from "@/lib/anilist";
import { traktRequest } from "@/lib/trakt-client";
import type { SyncEntry } from "@/lib/firebase";

// Modular Dashboard Components
import LandingPage from "@/components/landing/LandingPage";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { ConfirmModal, ConfirmState } from "@/components/dashboard/ConfirmModal";
import { OnboardingModal } from "@/components/dashboard/OnboardingModal";
import { ExpensesTab } from "@/components/dashboard/ExpensesTab";
import { SubscriptionsTab } from "@/components/dashboard/SubscriptionsTab";
import { WatchlistTab } from "@/components/dashboard/WatchlistTab";
import { BooksTab } from "@/components/dashboard/BooksTab";
import { NotesTab } from "@/components/dashboard/NotesTab";
import { InvestmentsTab } from "@/components/dashboard/InvestmentsTab";

interface FirebaseAuthModule {
  auth: any;
  GoogleAuthProvider: any;
  signInWithPopup: any;
  signInWithRedirect: any;
  signOut: any;
}

export default function Dashboard() {
  /* ─── State ─── */
  const [activeTab, setActiveTab] = useState<string>("expenses");
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseAuth, setFirebaseAuth] = useState<FirebaseAuthModule | null>(null);

  // Integrations
  const [anilistUser, setAnilistUser] = useState<AniListUser | null>(null);
  const [traktUser, setTraktUser] = useState<TraktUser | null>(null);

  // Currency & Navigation
  const [currency, setCurrency] = useState<string>("₹");
  const [expenseTab, setExpenseTab] = useState<"ledger" | "subscriptions">("ledger");

  // Expenses State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isFetchingExpenses, setIsFetchingExpenses] = useState(false);
  const [expensesLoaded, setExpensesLoaded] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Filters & Analytics
  const [timeFilter, setTimeFilter] = useState<"7" | "30" | "90" | "salary" | "all">("all");
  const [salaryDay, setSalaryDay] = useState<number>(1);
  const [activeChart, setActiveChart] = useState<"category" | "trend">("category");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState("");
  const [ledgerMinAmount, setLedgerMinAmount] = useState("");
  const [ledgerMaxAmount, setLedgerMaxAmount] = useState("");

  // Subscriptions State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isFetchingSubscriptions, setIsFetchingSubscriptions] = useState(false);
  const [subName, setSubName] = useState("");
  const [subIcon, setSubIcon] = useState("");
  const [subCost, setSubCost] = useState("");
  const [subCycle, setSubCycle] = useState<"monthly" | "yearly">("monthly");
  const [subNextDate, setSubNextDate] = useState("");
  const [isAddingSub, setIsAddingSub] = useState(false);

  // Watchlist State
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isFetchingWatchlist, setIsFetchingWatchlist] = useState(false);
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaType, setMediaType] = useState<"movie" | "show" | "anime" | "book">("movie");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchingMedia, setIsSearchingMedia] = useState(false);
  const [watchlistFilter, setWatchlistFilter] = useState<"all" | "anime" | "movie" | "show">("all");
  const [isEnrichingPosters, setIsEnrichingPosters] = useState(false);

  // Letterboxd CSV Import Modal
  const [showLetterboxdModal, setShowLetterboxdModal] = useState(false);
  const [letterboxdCsv, setLetterboxdCsv] = useState("");
  const [isImportingLetterboxd, setIsImportingLetterboxd] = useState(false);

  // Book Library State
  const [bookQuery, setBookQuery] = useState("");
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [bookResults, setBookResults] = useState<SearchResult[]>([]);
  const [bookFilter, setBookFilter] = useState<"all" | "reading" | "to_read" | "completed">("reading");

  // Notes State
  const [noteContent, setNoteContent] = useState("");
  const [isFetchingNote, setIsFetchingNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const saveNoteTimeout = useRef<NodeJS.Timeout | null>(null);

  // Investments State
  const [investments, setInvestments] = useState<InvestmentAsset[]>([]);
  const [isFetchingInvestments, setIsFetchingInvestments] = useState(false);
  const [invName, setInvName] = useState("");
  const [invCategory, setInvCategory] = useState<InvestmentCategory>("equity");
  const [invAmount, setInvAmount] = useState("");
  const [invQuantity, setInvQuantity] = useState("");
  const [invBuyPrice, setInvBuyPrice] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [invSuggestions, setInvSuggestions] = useState<InvestmentQuote[]>([]);
  const [showInvestmentsTab, setShowInvestmentsTab] = useState(true);

  // Onboarding & Confirm Dialogs
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const getHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${user?.idToken || ""}`,
  }), [user]);

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    isDestructive = true,
    confirmText = "Delete",
    cancelText = "Cancel"
  ) => {
    setConfirmDlg({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDlg((prev) => ({ ...prev, isOpen: false }));
      },
      confirmText,
      cancelText,
      isDestructive,
      variant: "confirm",
    });
  };

  const triggerAlert = (
    title: string,
    message: string,
    tone: "danger" | "success" | "info" = "info",
    confirmText = "OK"
  ) => {
    setConfirmDlg({
      isOpen: true,
      title,
      message,
      onConfirm: () => setConfirmDlg((prev) => ({ ...prev, isOpen: false })),
      confirmText,
      variant: "alert",
      tone,
    });
  };

  /* ─── AniList / Trakt Auth ─── */
  async function loadAnilistUser(token: string) {
    try {
      const data = await anilistQuery(`query { Viewer { id name avatar { large } } }`, {}, token);
      const viewer = data.data?.Viewer;
      if (viewer) {
        setAnilistUser({ id: viewer.id, name: viewer.name, avatar: viewer.avatar?.large || null, token });
      }
    } catch {
      localStorage.removeItem("anilist_token");
    }
  }

  function connectAnilist() {
    const clientId = process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID || "46468";
    window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&response_type=token`;
  }

  function disconnectAnilist() {
    localStorage.removeItem("anilist_token");
    setAnilistUser(null);
  }

  async function loadTraktUser(accessToken: string, refreshToken: string, idToken: string | undefined) {
    try {
      const profile = await traktRequest(idToken, "users/me?extended=full", { token: accessToken });
      if (profile?.username) {
        setTraktUser({
          username: profile.username,
          name: profile.name || profile.username,
          avatar: profile.images?.avatar?.full || null,
          accessToken,
          refreshToken,
        });
      }
    } catch {
      disconnectTrakt();
    }
  }

  function connectTrakt() {
    const clientId = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID || "L_cE2O_7uJ7nkzU_UDkivqetsef0OLyvpOH6o6b4Y_0";
    const redirectUri = encodeURIComponent(window.location.origin + "/api/auth/trakt/callback");
    window.location.href = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
  }

  function disconnectTrakt() {
    localStorage.removeItem("trakt_access_token");
    localStorage.removeItem("trakt_refresh_token");
    setTraktUser(null);
  }

  /* ─── AniList & Trakt Library Sync ─── */
  const [isSyncingAnilist, setIsSyncingAnilist] = useState(false);
  const [isSyncingTrakt, setIsSyncingTrakt] = useState(false);

  const syncAnilist = async () => {
    if (!anilistUser?.token) {
      connectAnilist();
      return;
    }
    setIsSyncingAnilist(true);
    try {
      const viewerData = await anilistQuery(`query { Viewer { id } }`, {}, anilistUser.token);
      const userId = viewerData?.data?.Viewer?.id;
      if (!userId) throw new Error("Could not fetch AniList profile.");

      const query = `
        query ($userId: Int) {
          MediaListCollection(userId: $userId, type: ANIME) {
            lists {
              entries {
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
      `;
      const data = await anilistQuery(query, { userId }, anilistUser.token);
      const lists = data?.data?.MediaListCollection?.lists || [];
      const entries: SyncEntry[] = [];

      for (const list of lists) {
        for (const entry of list.entries || []) {
          const media = entry.media;
          if (!media) continue;

          let status: WatchlistItem["status"] = "plan_to_watch";
          if (entry.status === "CURRENT") status = "watching";
          else if (entry.status === "COMPLETED") status = "completed";
          else if (entry.status === "DROPPED") status = "dropped";
          else if (entry.status === "PAUSED") status = "watching";

          const title = media.title?.english || media.title?.romaji || "Untitled Anime";
          entries.push({
            title,
            type: "anime",
            status,
            progress: entry.progress || 0,
            totalEpisodes: media.episodes || null,
            rating: entry.score ? Number(entry.score) : null,
            coverImage: media.coverImage?.large || null,
            year: media.startDate?.year || null,
            anilistId: media.id,
          });
        }
      }

      if (entries.length > 0) {
        const res = await fetch("/api/watchlist/sync", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ source: "anilist", entries }),
        });
        if (res.ok) {
          const result = await res.json();
          await fetchWatchlist();
          triggerAlert("AniList Sync Complete", `Successfully synced ${result.added || 0} new and ${result.updated || 0} updated anime titles!`, "success");
        } else {
          throw new Error("Server rejected sync payload.");
        }
      } else {
        triggerAlert("AniList Sync", "No anime items found in your AniList account.", "info");
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert("AniList Sync Error", err?.message || "Failed to sync with AniList.", "danger");
    } finally {
      setIsSyncingAnilist(false);
    }
  };

  const fetchOMDbPoster = async (imdbId: string | null | undefined): Promise<string | null> => {
    const apiKey = process.env.NEXT_PUBLIC_IMDB_API_KEY;
    if (!imdbId || !apiKey) return null;
    try {
      const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`);
      if (res.ok) {
        const data = await res.json();
        return data.Poster && data.Poster !== "N/A" ? data.Poster : null;
      }
    } catch (err) {
      console.error("OMDb poster error:", err);
    }
    return null;
  };

  const syncTrakt = async () => {
    if (!traktUser?.accessToken) {
      connectTrakt();
      return;
    }
    setIsSyncingTrakt(true);
    try {
      const idToken = user?.idToken;
      const movies = await traktRequest(idToken, "sync/watched/movies", { token: traktUser.accessToken });
      const shows = await traktRequest(idToken, "sync/watched/shows", { token: traktUser.accessToken });

      const entries: SyncEntry[] = [];

      if (Array.isArray(movies)) {
        for (const item of movies) {
          if (!item?.movie) continue;
          const existing = watchlist.find(
            (w) =>
              (w.traktId && w.traktId === item.movie.ids?.trakt) ||
              (w.title.toLowerCase().trim() === item.movie.title.toLowerCase().trim() && w.type === "movie")
          );

          let coverImage = existing?.coverImage || null;
          if (!coverImage && item.movie.ids?.imdb) {
            coverImage = await fetchOMDbPoster(item.movie.ids.imdb);
          }

          entries.push({
            title: item.movie.title,
            type: "movie",
            status: "completed",
            progress: 1,
            totalEpisodes: 1,
            rating: item.rating ? Number(item.rating) : null,
            coverImage,
            year: item.movie.year || null,
            traktId: item.movie.ids?.trakt,
          });
        }
      }

      if (Array.isArray(shows)) {
        for (const item of shows) {
          if (!item?.show) continue;
          
          let progress = 0;
          if (Array.isArray(item.seasons)) {
            for (const season of item.seasons) {
              if (Array.isArray(season.episodes)) {
                progress += season.episodes.length;
              }
            }
          }
          if (progress === 0 && item.plays) {
            progress = item.plays;
          }

          const existing = watchlist.find(
            (w) =>
              (w.traktId && w.traktId === item.show.ids?.trakt) ||
              (w.title.toLowerCase().trim() === item.show.title.toLowerCase().trim() && w.type === "show")
          );

          const totalEpisodes = existing?.totalEpisodes || null;
          let status: WatchlistItem["status"] = "watching";
          if (totalEpisodes && totalEpisodes > 0 && progress >= totalEpisodes) {
            status = "completed";
          }

          let coverImage = existing?.coverImage || null;
          if (!coverImage && item.show.ids?.imdb) {
            coverImage = await fetchOMDbPoster(item.show.ids.imdb);
          }
          // TVMaze fallback for TV shows
          if (!coverImage && item.show.ids?.imdb) {
            try {
              const tvmazeRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${item.show.ids.imdb}`);
              if (tvmazeRes.ok) {
                const tvmazeData = await tvmazeRes.json();
                coverImage = tvmazeData.image?.medium || null;
              }
            } catch (err) {
              console.error("TVMaze fallback error:", err);
            }
          }

          entries.push({
            title: item.show.title,
            type: "show",
            status,
            progress,
            totalEpisodes,
            rating: item.rating ? Number(item.rating) : null,
            coverImage,
            year: item.show.year || null,
            traktId: item.show.ids?.trakt,
          });
        }
      }

      if (entries.length > 0) {
        const res = await fetch("/api/watchlist/sync", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ source: "trakt", entries }),
        });
        if (res.ok) {
          const result = await res.json();
          await fetchWatchlist();
          triggerAlert("Trakt Sync Complete", `Successfully synced ${result.added || 0} new and ${result.updated || 0} updated movies & shows!`, "success");
        } else {
          throw new Error("Server rejected sync payload.");
        }
      } else {
        triggerAlert("Trakt Sync", "No watched items found in your Trakt account.", "info");
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert("Trakt Sync Error", err?.message || "Failed to sync with Trakt.", "danger");
    } finally {
      setIsSyncingTrakt(false);
    }
  };

  const enrichMissingPosters = async () => {
    const missing = watchlist.filter(
      (w) => !w.coverImage && (w.type === "movie" || w.type === "show")
    );
    if (missing.length === 0) {
      triggerAlert("All Good", "All your movies and shows already have cover images!", "success");
      return;
    }

    triggerConfirm(
      "Fetch Missing Posters",
      `Found ${missing.length} items with missing cover art. Fetch them now from OMDb/TVMaze?`,
      async () => {
        setIsEnrichingPosters(true);
        let successCount = 0;
        try {
          const apiKey = process.env.NEXT_PUBLIC_IMDB_API_KEY;
          for (const item of missing) {
            let imdbId = null;
            
            // 1. Try to resolve IMDb ID from Trakt if available
            if (item.traktId) {
              try {
                const details = await traktRequest(user?.idToken, `${item.type}s/${item.traktId}`);
                imdbId = details?.ids?.imdb || null;
              } catch (e) {
                console.error("Trakt details fetch error:", e);
              }
            }

            // 2. Fetch from OMDb
            let coverImage = null;
            if (apiKey) {
              try {
                const searchUrl = imdbId 
                  ? `https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`
                  : `https://www.omdbapi.com/?t=${encodeURIComponent(item.title)}&y=${item.year || ""}&apikey=${apiKey}`;
                const omdbRes = await fetch(searchUrl);
                if (omdbRes.ok) {
                  const omdbData = await omdbRes.json();
                  coverImage = omdbData.Poster && omdbData.Poster !== "N/A" ? omdbData.Poster : null;
                }
              } catch (e) {
                console.error("OMDb search error:", e);
              }
            }

            // 3. Fallback to TVMaze for TV shows
            if (!coverImage && item.type === "show") {
              try {
                const searchUrl = imdbId
                  ? `https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`
                  : `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(item.title)}`;
                const tvmazeRes = await fetch(searchUrl);
                if (tvmazeRes.ok) {
                  const tvmazeData = await tvmazeRes.json();
                  coverImage = tvmazeData.image?.medium || null;
                }
              } catch (e) {
                console.error("TVMaze fallback error:", e);
              }
            }

            // 4. Update the item in Firestore if a cover was found
            if (coverImage) {
              const res = await fetch(`/api/watchlist/${item.id}`, {
                method: "PATCH",
                headers: getHeaders(),
                body: JSON.stringify({ coverImage }),
              });
              if (res.ok) {
                successCount++;
              }
            }
          }

          if (successCount > 0) {
            await fetchWatchlist();
            triggerAlert("Enrichment Complete", `Successfully updated ${successCount} items with cover art!`, "success");
          } else {
            triggerAlert("Enrichment Complete", "Could not find any posters for the missing items.", "info");
          }
        } catch (err: any) {
          console.error("Enrichment error:", err);
          triggerAlert("Enrichment Error", err.message || "Failed to enrich posters.", "danger");
        } finally {
          setIsEnrichingPosters(false);
        }
      }
    );
  };

  /* ─── Handle OAuth Tokens & Firebase Auth ─── */
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const anilistToken = params.get("access_token");
    const traktAccessToken = params.get("trakt_access_token");
    const traktRefreshToken = params.get("trakt_refresh_token");

    if (anilistToken) {
      localStorage.setItem("anilist_token", anilistToken);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (traktAccessToken && traktRefreshToken) {
      localStorage.setItem("trakt_access_token", traktAccessToken);
      localStorage.setItem("trakt_refresh_token", traktRefreshToken);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    // Init Firebase Auth
    let unsubscribe: (() => void) | undefined;
    import("firebase/app").then(async ({ initializeApp, getApps }) => {
      const res = await fetch("/api/auth/config");
      const config = await res.json();
      const app = getApps().length ? getApps()[0] : initializeApp(config);

      const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } = await import("firebase/auth");
      const auth = getAuth(app);
      setFirebaseAuth({ auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut });

      unsubscribe = auth.onAuthStateChanged(async (fbUser: any) => {
        if (fbUser) {
          const idToken = await fbUser.getIdToken();
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            idToken,
          });
        } else {
          setUser(null);
        }
        setAuthLoading(false);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  /* ─── Handle Integrations Profile Load ─── */
  useEffect(() => {
    if (!user) return;
    const aniToken = localStorage.getItem("anilist_token");
    if (aniToken) loadAnilistUser(aniToken);

    const trAcc = localStorage.getItem("trakt_access_token");
    const trRef = localStorage.getItem("trakt_refresh_token");
    if (trAcc && trRef) loadTraktUser(trAcc, trRef, user.idToken);
  }, [user]);

  /* ─── API Fetchers ─── */
  const fetchExpenses = async () => {
    setIsFetchingExpenses(true);
    try {
      const res = await fetch("/api/expenses", { headers: getHeaders() });
      if (res.ok) setExpenses(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingExpenses(false);
      setExpensesLoaded(true);
    }
  };

  const fetchWatchlist = async () => {
    setIsFetchingWatchlist(true);
    try {
      const res = await fetch("/api/watchlist", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setWatchlist(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingWatchlist(false);
    }
  };

  const fetchSubscriptions = async () => {
    setIsFetchingSubscriptions(true);
    try {
      const res = await fetch("/api/subscriptions", { headers: getHeaders() });
      if (res.ok) {
        const loaded = (await res.json()) as any[];
        const rolled = loaded.map((sub) => {
          const futureDate = getNextFutureBillingDate(sub.nextBillingDate, sub.billingCycle);
          if (futureDate !== sub.nextBillingDate) {
            fetch(`/api/subscriptions/${sub.id}`, {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify({ nextBillingDate: futureDate }),
            }).catch((e) => console.error(e));
            return { ...sub, nextBillingDate: futureDate };
          }
          return sub;
        });
        setSubscriptions(rolled);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingSubscriptions(false);
    }
  };

  const fetchNote = async () => {
    setIsFetchingNote(true);
    try {
      const res = await fetch("/api/notes", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.content) setNoteContent(data.content);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingNote(false);
    }
  };

  const fetchInvestments = async () => {
    setIsFetchingInvestments(true);
    try {
      const res = await fetch("/api/portfolio", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data && Array.isArray(data.assets) ? data.assets : []);
        setInvestments(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingInvestments(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchWatchlist();
      fetchSubscriptions();
      fetchNote();
      fetchInvestments();
    }
  }, [user]);

  /* ─── Onboarding Guide Check ─── */
  useEffect(() => {
    if (!user || !expensesLoaded) return;
    if (localStorage.getItem("phub_onboarding_seen")) return;
    localStorage.setItem("phub_onboarding_seen", "1");

    const hasIntegration = !!localStorage.getItem("anilist_token") || !!localStorage.getItem("trakt_access_token");
    if (expenses.length === 0 && !hasIntegration) {
      setShowOnboarding(true);
    }
  }, [user, expensesLoaded, expenses.length]);

  /* ─── Expense Actions ─── */
  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount) return;
    setIsAddingExpense(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: expenseTitle.trim(),
          amount: parseFloat(expenseAmount),
          category: expenseCategory || null,
          date: expenseDate || new Date().toISOString().slice(0, 10),
          notes: expenseNotes.trim() || null,
        }),
      });
      if (res.ok) {
        setExpenseTitle("");
        setExpenseAmount("");
        setExpenseCategory("");
        setExpenseNotes("");
        fetchExpenses();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingExpense(false);
    }
  };

  const deleteExpense = async (id: string) => {
    triggerConfirm("Archive Expense", "Are you sure you want to archive this expense?", async () => {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== id));
    });
  };

  /* ─── Subscription Actions ─── */
  const addSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !subCost || !subNextDate) return;
    setIsAddingSub(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: subName.trim(),
          cost: parseFloat(subCost),
          billingCycle: subCycle,
          nextBillingDate: subNextDate,
          icon: subIcon.trim() || null,
        }),
      });
      if (res.ok) {
        setSubName("");
        setSubCost("");
        setSubIcon("");
        fetchSubscriptions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingSub(false);
    }
  };

  const deleteSubscription = async (id: string) => {
    triggerConfirm("Delete Subscription", "Are you sure you want to delete this subscription?", async () => {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    });
  };

  /* ─── Watchlist Actions ─── */
  const updateWatchItem = async (item: WatchlistItem, updates: Partial<WatchlistItem>) => {
    const nextUpdates = { ...updates };
    if (nextUpdates.progress !== undefined) {
      const total = nextUpdates.totalEpisodes !== undefined && nextUpdates.totalEpisodes !== null
        ? Number(nextUpdates.totalEpisodes)
        : (item.totalEpisodes !== undefined && item.totalEpisodes !== null ? Number(item.totalEpisodes) : null);
      
      if (total && total > 0 && Number(nextUpdates.progress) >= total) {
        nextUpdates.status = "completed";
      } else if (total && total > 0 && Number(nextUpdates.progress) < total && item.status === "completed" && nextUpdates.status === undefined) {
        nextUpdates.status = "watching";
      }
    }

    const res = await fetch(`/api/watchlist/${item.id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(nextUpdates),
    });
    if (res.ok) {
      setWatchlist((prev) => prev.map((w) => (w.id === item.id ? { ...w, ...nextUpdates, updatedAt: Date.now() } : w)));
    }
  };

  const deleteWatchItem = async (id: string) => {
    triggerConfirm("Delete Watchlist Item", "Are you sure you want to remove this item from your watchlist?", async () => {
      const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) setWatchlist((prev) => prev.filter((w) => w.id !== id));
    });
  };

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
        setSearchResults(
          (data.data?.Page?.media || []).map((m: any) => ({
            title: m.title.english || m.title.romaji,
            type: "anime",
            totalEpisodes: m.episodes || null,
            coverImage: m.coverImage?.large || null,
            year: m.startDate?.year || null,
            anilistId: m.id,
          }))
        );
      } else {
        const data = await traktRequest(user?.idToken, `search/${mediaType}?query=${encodeURIComponent(mediaQuery)}&limit=8`);
        if (Array.isArray(data)) {
          const enrichedResults = await Promise.all(
            data.map(async (item: any) => {
              const m = item.movie || item.show;
              const imdbId = m.ids?.imdb;
              let coverImage = null;
              if (imdbId) {
                coverImage = await fetchOMDbPoster(imdbId);
              }
              // TVMaze fallback for shows
              if (!coverImage && item.type === "show" && imdbId) {
                try {
                  const tvmazeRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`);
                  if (tvmazeRes.ok) {
                    const tvmazeData = await tvmazeRes.json();
                    coverImage = tvmazeData.image?.medium || null;
                  }
                } catch (err) {
                  console.error("TVMaze fallback error:", err);
                }
              }
              return {
                title: m.title,
                type: (item.type === "movie" ? "movie" : "show") as "movie" | "show",
                totalEpisodes: item.type === "show" ? m.aired_episodes || null : null,
                coverImage,
                year: m.year || null,
                traktId: m.ids?.trakt || null,
              };
            })
          );
          setSearchResults(enrichedResults);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingMedia(false);
    }
  };

  const addToWatchlist = async (res: SearchResult) => {
    const body: Omit<WatchlistItem, "id" | "updatedAt"> = {
      title: res.title,
      type: res.type,
      status: "plan_to_watch",
      progress: 0,
      totalEpisodes: res.totalEpisodes || null,
      rating: null,
      coverImage: res.coverImage || null,
      year: res.year || null,
      anilistId: res.anilistId || null,
      traktId: res.traktId || null,
    };
    const apiRes = await fetch("/api/watchlist", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (apiRes.ok) fetchWatchlist();
  };

  const handleLetterboxdImport = async () => {
    if (!letterboxdCsv.trim()) return;
    setIsImportingLetterboxd(true);
    try {
      const lines = letterboxdCsv.trim().split("\n");
      if (lines.length < 2) throw new Error("Invalid CSV format");

      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map((s) => s.replace(/(^"|"$)/g, "")) || [];
      const nameIdx = headers.findIndex((col) => col.includes("name"));
      const yearIdx = headers.findIndex((col) => col.includes("year"));
      if (nameIdx === -1) throw new Error("Could not find 'Name' column in CSV");

      const newItems: Omit<WatchlistItem, "id">[] = [];
      for (let i = 1; i < lines.length; i++) {
        const arr: string[] = [];
        let quote = false;
        let cell = "";
        const str = lines[i];
        for (let c = 0; c < str.length; c++) {
          const char = str[c];
          if (char === '"' && str[c + 1] === '"') {
            cell += '"';
            c++;
          } else if (char === '"') {
            quote = !quote;
          } else if (char === "," && !quote) {
            arr.push(cell.trim());
            cell = "";
          } else {
            cell += char;
          }
        }
        arr.push(cell.trim());

        if (!arr[nameIdx]) continue;
        const title = arr[nameIdx].replace(/(^"|"$)/g, "");
        const year = yearIdx !== -1 && arr[yearIdx] ? parseInt(arr[yearIdx], 10) || null : null;

        newItems.push({
          title,
          type: "movie",
          status: "plan_to_watch",
          progress: 0,
          totalEpisodes: null,
          rating: null,
          coverImage: null,
          year,
          updatedAt: Date.now(),
        });
      }

      if (newItems.length === 0) throw new Error("No valid movies found in CSV");

      triggerConfirm("Import Movies", `Found ${newItems.length} movies. Import them into your watchlist?`, async () => {
        const syncRes = await fetch("/api/watchlist/sync", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ items: newItems }),
        });
        if (syncRes.ok) {
          setShowLetterboxdModal(false);
          setLetterboxdCsv("");
          fetchWatchlist();
        }
      }, false, "Import");
    } catch (err) {
      triggerAlert("Import Failed", err instanceof Error ? err.message : "Failed to parse CSV", "danger");
    } finally {
      setIsImportingLetterboxd(false);
    }
  };

  /* ─── Book Library Actions ─── */
  const searchBooks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookQuery.trim()) return;
    setIsSearchingBooks(true);
    setBookResults([]);
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(bookQuery)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setBookResults(
          (data.docs || []).map((doc: any) => ({
            title: doc.title,
            type: "book",
            totalEpisodes: doc.number_of_pages_median || null,
            coverImage: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
            year: doc.first_publish_year || null,
          }))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingBooks(false);
    }
  };

  const addBook = async (b: SearchResult) => {
    const body: Omit<WatchlistItem, "id" | "updatedAt"> = {
      title: b.title,
      type: "book",
      status: "plan_to_watch",
      progress: 0,
      totalEpisodes: b.totalEpisodes || null,
      rating: null,
      coverImage: b.coverImage || null,
      year: b.year || null,
    };
    const apiRes = await fetch("/api/watchlist", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (apiRes.ok) fetchWatchlist();
  };

  /* ─── Notes Actions ─── */
  const updateNote = (newContent: string) => {
    setNoteContent(newContent);
    setIsSavingNote(true);
    if (saveNoteTimeout.current) clearTimeout(saveNoteTimeout.current);
    saveNoteTimeout.current = setTimeout(async () => {
      try {
        await fetch("/api/notes", { method: "POST", headers: getHeaders(), body: JSON.stringify({ content: newContent }) });
      } catch (err) {
        console.error(err);
      } finally {
        setIsSavingNote(false);
      }
    }, 1000);
  };

  /* ─── Investments Actions ─── */
  useEffect(() => {
    if (!invName.trim()) {
      setInvSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/portfolio/search?q=${encodeURIComponent(invName)}`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setInvSuggestions(data.quotes || []);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [invName, user]);

  const selectSuggestion = (s: InvestmentQuote) => {
    setInvName(s.symbol || s.name || "");
    if (s.type === "EQUITY") setInvCategory("equity");
    else if (s.type === "CRYPTOCURRENCY") setInvCategory("crypto");
    else if (s.type === "MUTUALFUND") setInvCategory("mutual_fund");
    setInvSuggestions([]);
  };

  const addInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim() || !invAmount) return;
    setIsAddingAsset(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: invName.trim(),
          category: invCategory,
          amount: parseFloat(invAmount),
          investedAmount: parseFloat(invAmount),
          quantity: invQuantity ? parseFloat(invQuantity) : undefined,
          buyPrice: invBuyPrice ? parseFloat(invBuyPrice) : undefined,
          notes: invNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        setInvName("");
        setInvAmount("");
        setInvQuantity("");
        setInvBuyPrice("");
        setInvNotes("");
        fetchInvestments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingAsset(false);
    }
  };

  const deleteInvestment = async (id: string) => {
    triggerConfirm("Delete Asset", "Are you sure you want to delete this asset from your portfolio?", async () => {
      const updatedList = investments.filter((a) => a.id !== id);
      setInvestments(updatedList);
      await fetch(`/api/portfolio/${id}`, { method: "DELETE", headers: getHeaders() });
    });
  };

  const updateMarketPrices = async () => {
    setIsUpdatingPrices(true);
    try {
      const res = await fetch("/api/portfolio/prices", { headers: getHeaders() });
      if (res.ok) fetchInvestments();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  /* ─── Calculated Expense Analytics ─── */
  const allCategories = useMemo(() => {
    const defaultCats = ["Food", "Transport", "Entertainment", "Shopping", "Groceries", "Utilities", "Drinks", "Home", "Health", "Other"];
    const loadedCats = new Set<string>();
    expenses.forEach((e) => {
      if (e.category) loadedCats.add(e.category);
    });
    customCategories.forEach((c) => loadedCats.add(c));
    return Array.from(new Set([...defaultCats, ...Array.from(loadedCats)]));
  }, [expenses, customCategories]);

  const filteredExpenses = useMemo(() => {
    let list = expenses;

    // Time filter
    if (timeFilter !== "all") {
      const now = new Date();
      if (timeFilter === "salary") {
        const { startStr, endStr } = getSalaryCycleRange(salaryDay);
        list = list.filter((e) => e.date && e.date >= startStr && e.date <= endStr);
      } else {
        const days = parseInt(timeFilter, 10);
        const cutoff = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
        list = list.filter((e) => e.date && e.date >= cutoff);
      }
    }

    // Search filter
    if (expenseSearch.trim()) {
      const q = expenseSearch.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q) || (e.notes && e.notes.toLowerCase().includes(q)));
    }

    // Category filter
    if (ledgerCategoryFilter) {
      list = list.filter((e) => e.category === ledgerCategoryFilter);
    }

    // Amount range filter
    if (ledgerMinAmount) {
      const min = parseFloat(ledgerMinAmount);
      if (!isNaN(min)) list = list.filter((e) => (e.amount || 0) >= min);
    }
    if (ledgerMaxAmount) {
      const max = parseFloat(ledgerMaxAmount);
      if (!isNaN(max)) list = list.filter((e) => (e.amount || 0) <= max);
    }

    return list;
  }, [expenses, timeFilter, salaryDay, expenseSearch, ledgerCategoryFilter, ledgerMinAmount, ledgerMaxAmount]);

  const totalSpent = useMemo(() => filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0), [filteredExpenses]);

  const largestItem = useMemo(() => {
    if (filteredExpenses.length === 0) return null;
    return filteredExpenses.reduce((max, e) => ((e.amount || 0) > (max.amount || 0) ? e : max), filteredExpenses[0]);
  }, [filteredExpenses]);

  const largestCharge = largestItem?.amount || 0;

  const catBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const cat = e.category || "Uncategorized";
      breakdown[cat] = (breakdown[cat] || 0) + (e.amount || 0);
    });
    return Object.fromEntries(Object.entries(breakdown).sort(([, a], [, b]) => b - a));
  }, [filteredExpenses]);

  const topCategory = useMemo(() => Object.keys(catBreakdown)[0] || "None", [catBreakdown]);

  const dailyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      if (e.date) map[e.date] = (map[e.date] || 0) + (e.amount || 0);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-10);
  }, [filteredExpenses]);

  /* ─── Sign In Screen ─── */
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <p className="text-sm text-text-muted">Loading PHub Dashboard…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LandingPage
        onLogin={() => {
          if (firebaseAuth) {
            firebaseAuth.signInWithPopup(firebaseAuth.auth, new firebaseAuth.GoogleAuthProvider());
          }
        }}
        firebaseAuthReady={!!firebaseAuth}
      />
    );
  }

  /* ─── Main App Render ─── */
  return (
    <div className="flex min-h-screen max-md:flex-col max-md:overflow-x-hidden">

      {/* Mobile Header & Bottom Navigation */}
      <MobileHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        showInvestmentsTab={showInvestmentsTab}
        triggerConfirm={triggerConfirm}
        firebaseAuth={firebaseAuth}
        setExpenses={setExpenses}
        setWatchlist={setWatchlist}
        setExpensesLoaded={setExpensesLoaded}
        disconnectAnilist={disconnectAnilist}
        disconnectTrakt={disconnectTrakt}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        anilistUser={anilistUser}
        traktUser={traktUser}
        connectAnilist={connectAnilist}
        disconnectAnilist={disconnectAnilist}
        syncAnilist={syncAnilist}
        isSyncingAnilist={isSyncingAnilist}
        connectTrakt={connectTrakt}
        disconnectTrakt={disconnectTrakt}
        syncTrakt={syncTrakt}
        isSyncingTrakt={isSyncingTrakt}
        showInvestmentsTab={showInvestmentsTab}
        setShowOnboarding={setShowOnboarding}
        triggerConfirm={triggerConfirm}
        firebaseAuth={firebaseAuth}
        setExpenses={setExpenses}
        setWatchlist={setWatchlist}
        setExpensesLoaded={setExpensesLoaded}
      />

      {/* Main Canvas */}
      <main className="ml-[250px] flex max-w-[1300px] flex-1 flex-col gap-7 px-10 py-8 min-[769px]:max-[1100px]:ml-[210px] min-[769px]:max-[1100px]:gap-[22px] min-[769px]:max-[1100px]:px-7 min-[769px]:max-[1100px]:py-6 max-md:ml-0 max-md:w-full max-md:max-w-full max-md:gap-3.5 max-md:p-3.5 max-md:pb-[calc(68px+env(safe-area-inset-bottom))]">
        {/* Expenses & Subscriptions */}
        {activeTab === "expenses" && (
          <>
            <ExpensesTab
              currency={currency}
              setCurrency={setCurrency}
              expenseTab={expenseTab}
              setExpenseTab={setExpenseTab}
              timeFilter={timeFilter}
              setTimeFilter={setTimeFilter}
              salaryDay={salaryDay}
              setSalaryDay={setSalaryDay}
              totalSpent={totalSpent}
              filteredExpenses={filteredExpenses}
              largestCharge={largestCharge}
              largestItem={largestItem}
              topCategory={topCategory}
              activeChart={activeChart}
              setActiveChart={setActiveChart}
              catBreakdown={catBreakdown}
              dailyTrend={dailyTrend}
              addExpense={addExpense}
              expenseTitle={expenseTitle}
              setExpenseTitle={setExpenseTitle}
              expenseAmount={expenseAmount}
              setExpenseAmount={setExpenseAmount}
              expenseCategory={expenseCategory}
              setExpenseCategory={setExpenseCategory}
              allCategories={allCategories}
              newCategoryInput={newCategoryInput}
              setNewCategoryInput={setNewCategoryInput}
              customCategories={customCategories}
              setCustomCategories={setCustomCategories}
              expenseDate={expenseDate}
              setExpenseDate={setExpenseDate}
              expenseNotes={expenseNotes}
              setExpenseNotes={setExpenseNotes}
              isAddingExpense={isAddingExpense}
              deleteExpense={deleteExpense}
              expenseSearch={expenseSearch}
              setExpenseSearch={setExpenseSearch}
              ledgerCategoryFilter={ledgerCategoryFilter}
              setLedgerCategoryFilter={setLedgerCategoryFilter}
              ledgerMinAmount={ledgerMinAmount}
              setLedgerMinAmount={setLedgerMinAmount}
              ledgerMaxAmount={ledgerMaxAmount}
              setLedgerMaxAmount={setLedgerMaxAmount}
              isFetchingExpenses={isFetchingExpenses}
              expensesLoaded={expensesLoaded}
            />

            {expenseTab === "subscriptions" && (
              <SubscriptionsTab
                subscriptions={subscriptions}
                currency={currency}
                subName={subName}
                setSubName={setSubName}
                subIcon={subIcon}
                setSubIcon={setSubIcon}
                subCost={subCost}
                setSubCost={setSubCost}
                subCycle={subCycle}
                setSubCycle={setSubCycle}
                subNextDate={subNextDate}
                setSubNextDate={setSubNextDate}
                isAddingSub={isAddingSub}
                addSubscription={addSubscription}
                deleteSubscription={deleteSubscription}
                isFetchingSubscriptions={isFetchingSubscriptions}
              />
            )}
          </>
        )}

        {/* Media Watchlist */}
        {activeTab === "media" && (
          <WatchlistTab
            watchlist={watchlist}
            watchlistFilter={watchlistFilter}
            setWatchlistFilter={setWatchlistFilter}
            mediaQuery={mediaQuery}
            setMediaQuery={setMediaQuery}
            mediaType={mediaType}
            setMediaType={setMediaType}
            searchMedia={searchMedia}
            isSearchingMedia={isSearchingMedia}
            searchResults={searchResults}
            addToWatchlist={addToWatchlist}
            updateWatchItem={updateWatchItem}
            deleteWatchItem={deleteWatchItem}
            isFetchingWatchlist={isFetchingWatchlist}
            showLetterboxdModal={showLetterboxdModal}
            setShowLetterboxdModal={setShowLetterboxdModal}
            letterboxdCsv={letterboxdCsv}
            setLetterboxdCsv={setLetterboxdCsv}
            handleLetterboxdImport={handleLetterboxdImport}
            isImportingLetterboxd={isImportingLetterboxd}
            anilistUser={anilistUser}
            connectAnilist={connectAnilist}
            disconnectAnilist={disconnectAnilist}
            syncAnilist={syncAnilist}
            isSyncingAnilist={isSyncingAnilist}
            traktUser={traktUser}
            connectTrakt={connectTrakt}
            disconnectTrakt={disconnectTrakt}
            syncTrakt={syncTrakt}
            isSyncingTrakt={isSyncingTrakt}
            enrichMissingPosters={enrichMissingPosters}
            isEnrichingPosters={isEnrichingPosters}
          />
        )}

        {/* Book Library */}
        {activeTab === "books" && (
          <BooksTab
            watchlist={watchlist}
            bookQuery={bookQuery}
            setBookQuery={setBookQuery}
            searchBooks={searchBooks}
            isSearchingBooks={isSearchingBooks}
            bookResults={bookResults}
            addBook={addBook}
            bookFilter={bookFilter}
            setBookFilter={setBookFilter}
            updateWatchItem={updateWatchItem}
            deleteWatchItem={deleteWatchItem}
            isFetchingWatchlist={isFetchingWatchlist}
          />
        )}

        {/* Quick Notes */}
        {activeTab === "notes" && (
          <NotesTab
            noteContent={noteContent}
            updateNote={updateNote}
            isSavingNote={isSavingNote}
            isFetchingNote={isFetchingNote}
          />
        )}

        {/* Investments & Portfolio */}
        {activeTab === "investments" && (
          <InvestmentsTab
            investments={investments}
            currency={currency}
            invName={invName}
            setInvName={setInvName}
            invCategory={invCategory}
            setInvCategory={setInvCategory}
            invQuantity={invQuantity}
            setInvQuantity={setInvQuantity}
            invBuyPrice={invBuyPrice}
            setInvBuyPrice={setInvBuyPrice}
            invAmount={invAmount}
            setInvAmount={setInvAmount}
            invNotes={invNotes}
            setInvNotes={setInvNotes}
            isAddingAsset={isAddingAsset}
            addInvestment={addInvestment}
            deleteInvestment={deleteInvestment}
            isUpdatingPrices={isUpdatingPrices}
            updateMarketPrices={updateMarketPrices}
            isFetchingInvestments={isFetchingInvestments}
            invSuggestions={invSuggestions}
            setInvSuggestions={setInvSuggestions}
            selectSuggestion={selectSuggestion}
          />
        )}
      </main>

      {/* Themed Confirm & Alert Modal */}
      <ConfirmModal confirmDlg={confirmDlg} setConfirmDlg={setConfirmDlg} />

      {/* Feature Guide Onboarding Modal */}
      <OnboardingModal
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
        showInvestmentsTab={showInvestmentsTab}
      />

      {/* Letterboxd Import Modal */}
      {showLetterboxdModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex w-[450px] flex-col gap-4 rounded-card border border-border-subtle bg-white p-6 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold tracking-[0.8px] text-text-secondary uppercase">Import Letterboxd CSV</span>
              <button onClick={() => setShowLetterboxdModal(false)} className="cursor-pointer border-none bg-transparent p-1 text-base">✕</button>
            </div>
            <p className="text-xs leading-[1.4] text-text-muted">
              Paste the contents of your Letterboxd <code>watchlist.csv</code> or <code>watched.csv</code> file below. We will parse it and add the movies to your library automatically.
            </p>
            <textarea
              rows={8}
              placeholder={`Date,Name,Year,Letterboxd URI
2026-07-22,Interstellar,2014,https://boxd.it/...
2026-07-22,The Prestige,2006,https://boxd.it/...`}
              value={letterboxdCsv}
              onChange={(e) => setLetterboxdCsv(e.target.value)}
              className="w-full resize-y rounded-md border border-border-subtle bg-bg-primary p-2.5 font-mono text-[11px] outline-none"
            />
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setShowLetterboxdModal(false)} className="h-9 cursor-pointer rounded-md border border-border-subtle bg-transparent px-4 text-xs font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary">
                Cancel
              </button>
              <button
                onClick={handleLetterboxdImport}
                disabled={isImportingLetterboxd || !letterboxdCsv.trim()}
                className="h-9 cursor-pointer rounded-md border border-text-primary bg-text-primary px-5 text-xs font-medium text-white transition-all duration-200 hover:border-[#2e2d27] hover:bg-[#2e2d27] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImportingLetterboxd ? "Importing..." : "Import Movies"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
