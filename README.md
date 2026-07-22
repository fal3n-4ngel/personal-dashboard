# PHub Dashboard

> **One dashboard to rule them all.** Replace 5 single-purpose apps with a self-hosted, privacy-first command center for your finances, watchlists, books, subscriptions, and quick notes—all hooked up directly to your favorite AI assistant.

---

## ✨ Features

* 💸 **Expense Ledger** — Log transactions, tag categories, configure location-specific currencies, and filter by custom salary pay periods.
* 📈 **Investment Portfolios** — Monitor equities, crypto, mutual funds, gold, and cash in one place with manual or live updates.
* 🎬 **Unified Watchlist** — Consolidate movies, TV shows, and anime. Sync bidirectionally with AniList & Trakt, import Letterboxd CSVs, and automatically enrich missing cover images with OMDb and TVMaze.
* 📚 **Book Library** — Search OpenLibrary to manage your reading list and track progress.
* 🔄 **Subscription Tracker** — Keep tabs on recurring monthly/yearly costs and calculate your true effective monthly spend.
* 📝 **Scratchpad Notes** — A lightweight, auto-saving space for quick thoughts.
* 🤖 **AI Assistant Integration** — Built-in OpenAPI 3.1 schema (`/api/openapi.json`) for Custom GPT Actions, Gemini Gems, or Claude Projects. *Log expenses or add movies just by sending a text.*

---

## 💡 Why This Exists
Well, it’s been a while since I worked on any public projects—mostly coz I rarely get time after work, and even when I do, it’s usually personal APIs or portfolio updates.

I already had a system to track my expenses and movies via my perosnal api, which I enhanced when ChatGPT released Custom GPTs so I could add stuff directly via chat (use ai without paying for api). Instead of putting AI inside my API, I put my API inside AI (sounded cool in my head).

Anyway, a friend saw it and wanted it too, so rather than handing over my personal API collection, I decided to build a proper dashboard instead. And here we are!

---

## 🛠 Tech Stack

* **Frontend Framework:** [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
* **Database & Auth:** [Firebase](https://firebase.google.com) (Google Sign-In + Firestore REST API)
* **Integrations:**
  * **Media:** AniList (GraphQL), Trakt (REST), OMDb API & TVMaze API (Posters)
* **Books:** OpenLibrary API
* **AI Actions:** OpenAPI 3.1 Spec



---

## 🔒 Security Model

Your financial and personal data shouldn't be handled loosely. PHub Dashboard enforces security at the database boundary:

* **No Master Server Credentials:** The Next.js backend does not hold an admin key. Every database call is routed through the [Firestore REST API](https://firebase.google.com/docs/firestore/use-rest-api) authenticated directly with the user’s personal Firebase ID token.
* **Database Encryption (AES-256-GCM):** Sensitive financial data fields (titles, categories, spent amounts, and notes) are encrypted on-the-fly using AES-256-GCM symmetric encryption before hitting Google Firestore, keeping your records protected at rest.
* **Enforced Database Rules:** Ownership checks in [`firestore.rules`](https://www.google.com/search?q=firestore.rules) guarantee users can only view or modify their own data.
* **Hardened API Routes:** All input data is strictly validated before hitting the database, and upstream external proxy routes (like Trakt) are strictly allowlisted to prevent SSRF vulnerabilities.

---

## 🚀 Quickstart & Self-Hosting

You can host your own private instance on Vercel or any Next.js-compatible platform in minutes.

### 1. Clone & Install

```bash
git clone https://github.com/fal3n-4ngel/PHub-Dashboard.git
cd PHub-Dashboard
npm install

```

### 2. Set Up Firebase

1. Go to the [Firebase Console](https://console.firebase.google.com) and create a project.
2. Enable **Google Sign-in** under **Authentication** → **Sign-in method**.
3. Create a **Firestore Database**.
4. Go to **Project Settings** → **General** → **Add Web App** and copy the configuration snippet.
5. Deploy the security rules (essential for keeping data isolated):
```bash
npm install -g firebase-tools   # Install CLI if needed
firebase login
firebase use --add              # Select your Firebase project
firebase deploy --only firestore:rules

```



### 3. Configure Environment Variables

```bash
cp .env.example .env.local

```

Fill in `FIREBASE_CONFIG` as a single-line JSON string in your `.env.local`:

```env
FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}
ENCRYPTION_KEY="your-custom-super-secret-key-phrase"
```

*(Optional API keys for Trakt, AniList, and OMDb API (`NEXT_PUBLIC_IMDB_API_KEY`) can also be added here. See [`.env.example`](file:///.env.example).)*

> [!TIP]
> **Bring-Your-Own-Config (BYOC) Mode:** You don't have to hardcode server-wide environment variables. Users can supply their credentials per request via custom headers (`X-Firebase-Config`, `X-Trakt-Client-Id`, etc.). See [`lib/credentials.ts`](https://www.google.com/search?q=lib/credentials.ts) for details.

### 4. Run the App

```bash
# Local development server (http://localhost:3000)
npm run dev

# Production build & start
npm run build && npm run start

```

---

## 🤖 ChatGPT Custom GPT Setup

You can converse with your dashboard, track expenses, add movies, and manage your notes directly through ChatGPT!

### 1. Using the Official Public Custom GPT (Recommended)
Simply open the official **[PHub Dashboard Assistant](https://chatgpt.com/g/g-6a60b01e38c8819187662d1e42c6bee7-phub-dashboard-public)**.
When you send your first message, ChatGPT will prompt you to log in. Click "Authorize" to link your account securely using OAuth 2.0. No copy-pasting API keys required!

### 2. Setting Up Your Own Custom GPT (For Self-Hosters)
If you are self-hosting your own instance, you can configure your own private Custom GPT:
1. In ChatGPT, open **Explore GPTs** ➔ **Create** ➔ **Configure** ➔ **Actions**.
2. **Import Schema:** Import the OpenAPI schema from `https://your-domain.com/api/openapi.json`.
3. **Configure Authentication:** Select **OAuth**:
   - **Client ID & Secret:** Set to any dummy string (e.g. `chatgpt-client` / `secret-123`).
   - **Authorization URL:** `https://your-domain.com/api/oauth/authorize`
   - **Token URL:** `https://your-domain.com/api/oauth/token`
   - **Token Exchange Method:** `Default (POST request)`.
4. Click **Save** and publish the GPT!

---

## 👥 Contributing & Sponsoring

We welcome contributions! Please check out our [CONTRIBUTING.md](file:///CONTRIBUTING.md) guide for details on:
- Setting up your local environment and running checks (`npm run lint`, `npm run build`).
- Deploying builds and lint validations with GitHub Actions.
- Automatic release generation when branches matching `release/v*` are pushed.

If you find this dashboard helpful, consider supporting its development via the GitHub Sponsor button!

---

## 📜 License

Distributed under the [MIT License](https://www.google.com/search?q=LICENSE). Feel free to fork, break, or modify it to fit your needs!