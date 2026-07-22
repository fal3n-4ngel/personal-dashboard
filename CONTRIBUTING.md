# Contributing to Personal Dashboard

Thank you for your interest in contributing to the Personal Dashboard! We welcome contributions, bug reports, and suggestions.

---

## 🛠️ Local Development Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/fal3n-4ngel/personal-dashboard.git
   cd personal-dashboard
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file in the root directory and populate it with the required Firebase and API configurations (use `.env.example` as a template):
   ```env
   NEXT_PUBLIC_IMDB_API_KEY=your_omdb_api_key
   NEXT_PUBLIC_ANILIST_CLIENT_ID=46468
   NEXT_PUBLIC_TRAKT_CLIENT_ID=your_trakt_client_id
   # Add your Firebase configuration keys here
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Code Quality

Before submitting a Pull Request, please ensure your changes pass our local checks:

- **Linting Check:** Run ESLint to verify syntax and guidelines.
  ```bash
  npm run lint
  ```
- **Build Check:** Validate that Next.js compiles the optimized bundle successfully.
  ```bash
  npm run build
  ```

---

## 🚀 Branching & Automation Workflows

We use automated GitHub Actions pipelines to check and deploy code:

### 1. Continuous Integration (CI)
Our CI workflow runs on **every push and pull request on all branches**. It validates:
- Code linting (`npm run lint`).
- Production builds (`npm run build`).

### 2. Auto-generated Releases
When you are ready to prepare a new release, create a new branch using the `release/` namespace:
- **Naming Pattern:** `release/v<major>.<minor>.<patch>` (e.g., `release/v1.0.0`).
- **Effect:** Creating this branch automatically triggers the release workflow, which:
  - Generates a git tag for that version.
  - Generates a clean release description summarizing all pull requests, commits, and contributors since the previous release.
  - Publishes a new GitHub Release.
