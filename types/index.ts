// Shared domain types for the dashboard — client-side mirrors of the API
// response/request shapes defined server-side in lib/firebase.ts.

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  idToken: string;
}

export interface AniListUser {
  id: number;
  name: string;
  avatar: string | null;
  token: string;
}

export interface TraktUser {
  username: string;
  name: string | null;
  avatar: string | null;
  accessToken: string;
  refreshToken: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number | null;
  category: string | null;
  date: string | null;
  notes: string | null;
}

export type MediaType = "movie" | "show" | "anime" | "book";
export type MediaStatus = "plan_to_watch" | "watching" | "completed" | "dropped";

export interface WatchlistItem {
  id: string;
  title: string;
  type: MediaType;
  status: MediaStatus;
  progress: number;
  totalEpisodes: number | null;
  rating: number | null;
  coverImage: string | null;
  year: number | null;
  updatedAt: number;
  anilistId?: number | null; // store AniList media ID for sync
  traktId?: number | null; // store Trakt media ID for sync
}

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  billingCycle: "monthly" | "yearly";
  nextBillingDate: string;
  icon: string | null;
  createdAt: number;
}

export type InvestmentCategory = "equity" | "crypto" | "mutual_fund" | "sip" | "gold" | "cash" | "other";

export interface InvestmentAsset {
  id: string;
  name: string;
  category: InvestmentCategory;
  amount: number;
  investedAmount: number;
  quantity?: number;
  buyPrice?: number;
  currentPrice?: number;
  currentPriceUsd?: number;
  currentPriceInr?: number;
  notes?: string;
  createdAt: number;
}

export interface Note {
  content: string;
  updatedAt: number;
}

export interface SearchResult {
  title: string;
  type: MediaType;
  totalEpisodes: number | null;
  coverImage: string | null;
  year: number | null;
  anilistId?: number | null;
  traktId?: number | null;
  imdbId?: string | null;
  tvdbId?: number | null;
}

export interface InvestmentQuote {
  symbol?: string;
  name?: string;
  exchange?: string;
  type?: string;
}
