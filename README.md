# StageX AI

**Plan. Perform. Adapt.**  
*Powered by **NeuroX***  
*Bit N Build '26 — PS-5: Smart Anchor & Stage Flow Management System*

![StageX AI Logo](/public/brand/stagex-logo.png)

---

## 🎯 Executive Overview

**StageX AI** is a production-grade live stage operations platform built for event organizers, stage coordinators, and anchors. Unlike static mockups or generic AI text generators, StageX AI is an end-to-end operational console designed to solve the harsh realities of live events:

1. **Plan:** Build events, manage speaker dossiers, and create time-blocked session agendas.
2. **Perform:** Monitor stage flow with a sub-second system countdown, live elapsed timers, overdue detection, and prominent overtime alarms.
3. **Adapt:** Absorb unexpected speaker delays and overruns through an automated **Dynamic Delay Engine** that recalculates future session timings with buffer absorption and fixed-time conflict resolution.
4. **Assist:** Generate context-grounded anchor scripts (speaker intros, session transitions, emergency fillers, vote of thanks) powered by Google Gemini, read them directly on a fullscreen **Teleprompter**, and review ground-truth operational analytics.

---

## ⚡ Key Architectural Features

### 1. Dynamic Delay Engine (`lib/schedule-engine.ts`)
- **Overrun vs. Shift Handling:** Overrunning live sessions naturally extends their duration without modifying actual start times; upcoming sessions shift forward.
- **Buffer Absorption:** Naturally occurring schedule buffers (gaps between sessions) are automatically consumed before propagating delays to subsequent sessions.
- **Fixed-Time Conflict Protection:** Keynote or broadcast sessions marked as **Fixed Time** are protected against silent shifts. The engine returns a `needs_decision` conflict requiring explicit operator choice:
  - *Keep Fixed Time:* Truncates preceding sessions to fit within the locked boundary.
  - *Shift Fixed Session:* Moves the fixed session along with the ripple.
  - *Skip / Cancel Session:* Safely drops the session and continues the propagation chain.

### 2. Live Stage Engine (`lib/live-engine.ts`)
- **Strict Real-Time Computation:** Timer values are derived strictly from `Date.now()` and scheduled boundaries — eliminating timer drift caused by background tab throttling.
- **Overtime Detection:** Negative remaining times trigger high-visibility pulse banners (`OVERTIME +mm:ss`).
- **Start Overdue Alerts:** Alerts stage teams when upcoming sessions are overdue to commence.

### 3. Contextual Gemini AI Copilot (`lib/ai-context.ts` & `app/api/ai/route.ts`)
- **Server-Side Security:** Zero API keys or secrets are exposed to client JavaScript or stored in LocalStorage.
- **Structured Context Packaging:** Extracts current session, upcoming session, speaker biography, cumulative delay, and active emergency data into the system prompt.
- **Strict Anti-Hallucination Rules:** AI speaks exclusively from supplied event data without fabricating credentials, timing, or sponsor names.
- **Graceful Failure Isolation:** Non-AI stage operations continue uninterrupted if the network fails or the API key is not configured.

### 4. Fullscreen Teleprompter (`components/teleprompter/teleprompter-view.tsx`)
- High-contrast stage reading interface (large typography, customizable font sizing).
- Delta-timed auto-scroll driven by `requestAnimationFrame`.
- Spacebar play/pause and `Esc` quick-exit without losing state or position.
- Screen Wake Lock API support.

### 5. Ground-Truth Analytics & Deterministic Health Score (`lib/analytics-engine.ts`)
- **Zero Fake Data Policy:** All statistics, charts, and metrics are derived strictly from recorded user actions and actual execution times.
- **Schedule Deviation:** Minute-level delta tracking between planned schedule and actual session starts (`actualStartTime - originalStartTime`).
- **Deterministic Health Score Formula:**
  $$\text{Score} = \text{clamp}(100 - P_{\text{dev}} - P_{\text{drift}} - P_{\text{emg}} - P_{\text{skip}}, 0, 100)$$
  - $P_{\text{dev}} = \min(30, 2 \times \text{meanAbsStartDeviationMinutes})$
  - $P_{\text{drift}} = \min(20, \max(0, \text{currentDriftMinutes}))$
  - $P_{\text{emg}} = \min(20, 4 \times \text{resolved} + 8 \times \text{unresolved})$
  - $P_{\text{skip}} = \min(15, \text{round}(30 \times (\text{skipped} + \text{cancelled}) / \text{total}))$

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS (Curated dark theme inspired by the official StageX palette)
- **State Management:** Zustand (Master event store with atomic ActivityLog commits)
- **Persistence:** LocalStorage with schema versioning (`stagex-ai:v1`) and automated corruption recovery
- **AI Model:** Google Gemini API (`gemini-2.5-flash`)
- **Icons & Visuals:** Lucide React & Recharts
- **Testing:** Vitest automated test suite

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ (v20+ recommended)
- npm v9+

### Installation
```bash
# Clone or navigate to the project directory
cd D:\AI-Projects\StageX

# Install dependencies
npm install
```

### Environment Configuration
Create a `.env.local` file in the project root based on `.env.example`:
```bash
# Copy template
cp .env.example .env.local
```

Populate your Google Gemini API key:
```ini
GEMINI_API_KEY=your_actual_gemini_api_key_here
# Optional model override
GEMINI_MODEL=gemini-2.5-flash
```

> **Security Note:** The `GEMINI_API_KEY` is loaded exclusively inside the server-side API route (`/api/ai`). It is never bundled into client assets or saved to LocalStorage.

### Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Automated Tests
Execute the pure business-logic test suite (Schedule Engine vectors D-1 through D-8, Live Engine, Analytics):
```bash
npm run test
```

### Production Build
```bash
npm run build
```

---

## 📋 Complete User Acceptance Flow

1. **Dashboard First Run:** Experience the clean empty state with the official StageX AI branding (no fake data injected).
2. **Create Event:** Fill the event form with date, venue, and operating window.
3. **Add Speakers:** Register speaker profiles complete with designations, affiliations, and bios.
4. **Build Agenda:** Schedule session blocks with assigned speakers and optional fixed-time flags.
5. **Launch Live Stage:** Start the first session and watch the real system-clock countdown begin.
6. **Apply Dynamic Delay:** Inject a +10m delay and observe how buffers are consumed before subsequent sessions automatically shift.
7. **Emergency Protocol:** Activate a technical incident (e.g. "Projector Issue") to display guidance and trigger emergency AI fillers.
8. **Open Teleprompter:** Send generated scripts directly to the high-contrast teleprompter with auto-scroll.
9. **Review Analytics:** Inspect real session deviations, cumulative delay metrics, and the deterministic Event Health Score.
10. **Persistence Verification:** Refresh the browser; 100% of event states, timers, and activity history remain intact.

---

## 📄 License
Created for Bit N Build '26 by **Team NeuroX**.
