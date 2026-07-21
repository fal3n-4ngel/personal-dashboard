// Single source of truth for site identity — metadata, JSON-LD, the OpenAPI
// spec, and the OG/Twitter image generators all read from here so the
// production URL and author info never drift out of sync.
export const SITE_URL = "https://phub-dashboard.vercel.app";
export const SITE_NAME = "PHub Dashboard";
export const SITE_TAGLINE = "One dashboard. Everything you track.";
export const SITE_DESCRIPTION =
  "A private, self-hostable dashboard for expenses, movies/shows/anime, books, and notes — synced with AniList and Trakt, and wired up to ChatGPT via a Custom GPT Action.";

export const AUTHOR = {
  name: "Adithya Krishnan",
  url: "https://www.adithyakrishnan.com",
  email: "hello@adithyakrishnan.com",
  github: "https://github.com/fal3n-4ngel",
  githubHandle: "fal3n-4ngel",
};
