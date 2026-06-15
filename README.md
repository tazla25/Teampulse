# TeamPulse ⚡

AI-powered productivity companion for developers, built with **Next.js, Tailwind CSS, Supabase, and Manifest V3 Chrome Extension**.

> 💡 **Core Philosophy:** *"We don't monitor. We understand."*
> Unlike invasive corporate trackers that log keystrokes or take screenshots, **TeamPulse** is employee-first. Employees track their own active browsing habits and focus periods to self-regulate, while managers only see aggregated, anonymous team health trends and workload risks.

---

## 📁 Repository Structure

```text
teampulse-app/
├── extension/          # Manifest V3 Chrome Extension (Tracks tabs & runs Focus Timer)
│   ├── manifest.json   # Extension definitions and permissions
│   ├── background.js   # Event tracking service worker & periodic sync queue
│   ├── content.js      # Blocker screen overlay for distracting sites during focus
│   ├── popup.html      # Popup window template
│   ├── popup.js        # Controller fetching storage stats and Pomodoro ticking
│   ├── styles.css      # Popup and overlay stylesheets
│   └── icon.png        # Sleek branding logo
├── web/                # Next.js Web Dashboard & Backend Sync API
│   ├── app/
│   │   ├── api/
│   │   │   ├── sync/        # Endpoint POST /api/sync for extension payloads
│   │   │   └── team-health/ # Endpoint GET /api/team-health for manager aggregates
│   │   ├── dashboard/       # Employee view and personal metrics dashboard
│   │   ├── team/            # Manager dashboard for team metrics and invites
│   │   ├── login/           # Auth login screen using Supabase
│   │   ├── layout.tsx
│   │   └── page.tsx         # Modern dark-mode marketing landing page
│   ├── components/          # Shared charts components built with Recharts
│   ├── lib/
│   │   └── supabase.ts      # Supabase JavaScript client initializer
│   ├── package.json
│   ├── tailwind.config.js   # Theme configurations
│   └── tsconfig.json
└── supabase-schema.sql # Postgres tables schema, RLS policies, and RPC aggregates
```

---

## 🛠️ Step-by-Step Setup Guide

### 1. Database Setup (Supabase)
1. Create a free project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase Dashboard.
3. Paste the contents of [supabase-schema.sql](./supabase-schema.sql) and click **Run**.
4. Enable **Google Provider** in Auth Settings if you wish to use Google login (optional; email/password registration is enabled by default).

### 2. Web Application Setup (Next.js)
1. Navigate to the `web/` directory:
   ```bash
   cd web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the `web/` directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the local server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` in your browser. Register an account and sign in.
6. Check your role settings in the database profiles table. To test the **Manager View**, toggle your user record `role` column to `'manager'`.

### 3. Chrome Extension Setup
1. Open Google Chrome or any Chromium-based browser.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in top-right corner).
4. Click **Load unpacked** and select the `extension/` directory of this project.
5. Once loaded, click the TeamPulse logo in your toolbar to see today's Score, Top Sites, and the Pomodoro Focus Session timer.

---

## 🔄 How Syncing Works
1. When you navigate websites, the extension background worker records active domain durations in `chrome.storage.local`.
2. Every **5 minutes**, the alarm fires and posts the local queue to `http://localhost:3000/api/sync` (or your Vercel deployment URL).
3. The sync API checks the JWT token, extracts your user details, and writes logs to `activity_logs`.
4. *Testing Tip:* In the Web Dashboard, we've included a **🔌 Simulate Extension Sync** button. Clicking this instantly pushes mock tracking data into your database, letting you preview active charts immediately.

---

## 🔒 Privacy & GDPR Compliance
- **Data Minimization:** We only store high-level domain names (`github.com`), never full URLs (`github.com/user/secret-repo/issues/1`) or page content.
- **Export Data:** Users can download their complete history as a JSON file from the Settings panel.
- **Permanent Purge:** Users can permanently delete their tracking profile and logs at any time via a self-serve button.
