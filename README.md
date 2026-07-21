# Phub — Personal Hub Dashboard

One dashboard for the stuff you'd otherwise track in five different apps: an expense ledger, a unified movie/show/anime watchlist, a book library, subscriptions, and a scratchpad — plus a ChatGPT Custom GPT integration, so you can log an expense or add something to your watchlist just by texting ChatGPT.

Self-hostable, MIT-licensed, backed by your own Firebase project. Nobody but you (and whoever you invite) can see your data.

## Why this exists

I've been running a personal API to track my expenses and watchlist for a while. When ChatGPT shipped Custom GPTs, I hooked mine up via an OpenAPI schema — suddenly I could just tell ChatGPT "spent 400 on lunch" and it'd log it for me. A friend saw it and wanted the same thing, so instead of copy-pasting my setup for him I turned it into an actual multi-user site. This is that: **Phub**.

Feels a little strange calling it "my project" when most of the actual code was written by Antigravity and Claude — but it's not quite vibe-coded either, since the core modules (the data model, the API surface, the sync logic) were already mine from the original personal version. These tools mostly built the multi-user shell around something that already worked.

Anyway — try it out, star it, fork it, break it, whatever. Issues and PRs are welcome.

## What's inside

- **Expense Ledger** — log transactions, tag categories, see spending breakdowns. Set a custom salary start day and filter analytics to your actual pay period instead of calendar months.
- **Unified Watchlist** — movies, shows, and anime in one place. Sync your AniList library and Trakt history bidirectionally (progress/status changes push back to the source), or import a Letterboxd CSV export.
- **Book Library** — search OpenLibrary to add books, track reading progress.
- **Subscriptions** — track recurring costs (monthly/yearly) and see your effective monthly spend.
- **Notes** — a simple auto-saving scratchpad.
- **ChatGPT integration** — an OpenAPI 3.1 schema (`/api/openapi.json`) built for ChatGPT Custom GPT Actions, plus an in-app guide at `/gpt` that walks you through wiring it up, including copying a fresh auth token.

## How it's built

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
- [Firebase](https://firebase.google.com) — Google sign-in (Auth) + Firestore (data)
- No ORM, no separate backend — API routes talk to the Firestore REST API directly, authenticated as the signed-in user (see [Security model](#security-model) below)
- AniList (GraphQL) and Trakt (REST) for media sync, OpenLibrary for book search, TMDb (optional) for poster art

## Self-hosting

If you can clone a repo, you can run your own instance — nothing here is exclusive to any one Firebase project or domain.

### 1. Clone and install

```bash
git clone https://github.com/fal3n-4ngel/personal-dashboard.git
cd personal-dashboard
npm install
```

### 2. Create a Firebase project

1. Create a project at the [Firebase Console](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → enable **Google**.
3. **Firestore Database** → create a database (any region).
4. **Project settings** → General → add a Web App → copy the config object.
5. Deploy this repo's security rules (they scope every document to its owner — see below):
   ```bash
   npm install -g firebase-tools   # if you don't have it
   firebase login
   firebase use --add               # pick your project
   firebase deploy --only firestore:rules
   ```
   The Firestore rules in [`firestore.rules`](firestore.rules) are what actually enforce that users can only read/write their own data — the API alone is not the security boundary. **Don't skip this step.**

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `FIREBASE_CONFIG` with the Web App config from step 2, collapsed to one line of JSON. Everything else (Trakt, AniList, TMDb) is optional — the app runs fine without them, you just won't get media sync until you add the keys. See [`.env.example`](.env.example) for where to get each one.

### 4. Run it

```bash
npm run dev       # local dev server at http://localhost:3000
# or
npm run build && npm run start   # production build
```

### 5. Deploy

The easiest path is [Vercel](https://vercel.com/new): import the repo, paste the same env vars into the project settings, deploy. Any Next.js-compatible host works too.

### Bring-your-own-config mode

You don't strictly need step 3's env vars at all — every one of them can also be supplied per-request as a header (`X-Firebase-Config`, `X-Trakt-Client-Id`, etc. — see [`lib/credentials.ts`](lib/credentials.ts)). This is what lets a single deployment double as a config-it-yourself API for anyone who wants to point their own Firebase project at it without redeploying.

## Security model

A dashboard holding your expenses is worth taking seriously, so a quick summary of how data access actually works:

- The server never holds a privileged Firebase credential. Every Firestore read/write goes through the [Firestore REST API](https://firebase.google.com/docs/firestore/use-rest-api) authenticated with the **caller's own Firebase ID token** — so [`firestore.rules`](firestore.rules) (per-user ownership checks) is the real enforcement layer, not the API code.
- API routes validate every input (lengths, enums, ranges, batch caps) before it reaches the database.
- The Trakt proxy route allowlists which upstream paths and methods it'll relay, to close off SSRF via a crafted `path`.
- Security headers (`X-Frame-Options`, HSTS, etc.) are set repo-wide via `next.config.ts`.

If you find a security issue, please open a private report rather than a public issue.

## ChatGPT Custom GPT integration

Sign in, then go to **Connect to ChatGPT** in the sidebar (or visit `/gpt`) for a step-by-step guide: import the OpenAPI schema as a GPT Action, paste in a fresh auth token, and you're able to log expenses or manage your watchlist by chatting with ChatGPT. Tokens expire after about an hour — the `/gpt` page has a one-click way to copy a fresh one.

## License

[MIT](LICENSE)
