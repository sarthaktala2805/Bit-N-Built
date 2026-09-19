# STAGEX AI — PRODUCT REQUIREMENTS DOCUMENT (PRD)

| | |
|---|---|
| **Product** | StageX AI |
| **Tagline** | Plan. Perform. Adapt. |
| **Powered by** | NeuroX |
| **Hackathon / Problem** | Bit N Build'26 — PS-5: Smart Anchor & Stage Flow Management System |
| **Document status** | Implementation-ready v1.0 (MVP) |
| **Primary source of truth** | *StageX AI — Complete Master Implementation Plan* ("Master Plan", cited as **MP §n**) |
| **Intended readers** | Developers and AI coding agents (Google Antigravity), UI designers (Google Stitch MCP), reviewers/judges |

> **How to read this document.** Requirements use unique IDs (`FR-`, `NFR-`, `AI-`, `UI-`, `DATA-`, `SEC-`, `TEST-`, `DEP-`). Every requirement traces to the Master Plan in Section 41 (Traceability Matrix). Where the Master Plan is silent or ambiguous, the PRD either (a) preserves the original wording and records the ambiguity in **Section 3.3 (Ambiguity & Decision Register)**, or (b) states a **Proposed Default** that is explicitly labelled as such. Nothing is silently changed. Items outside the MVP are marked **FUTURE / OPTIONAL** and live only in Section 43.

---

## TABLE OF CONTENTS

1. Executive Summary & Document Conventions
2. Product Overview
3. Source-of-Truth Rule, Scope, and Ambiguity Register
4. Brand Identity
5. PS-5 Requirement Mapping
6. User Roles
7. Complete User Flow
8. Information Architecture
9. Functional Requirements
10. Dynamic Delay Engine
11. Live Engine
12. Emergency Mode
13. AI System
14. Gemini API Architecture
15. AI Failure Handling
16. Teleprompter
17. Analytics
18. Event Health Score
19. Data Model
20. State Management (Zustand)
21. Local Storage & Persistence
22. No Fake Data Policy
23. No Dead Buttons Policy
24. Empty States
25. UI/UX Requirements
26. Google Stitch MCP Workflow
27. Design System
28. Responsive Design
29. Accessibility
30. Tech Stack
31. Project Location (Mandatory)
32. Project Structure
33. Security
34. Error Handling
35. Testing Strategy
36. Production Build
37. Deployment
38. Hackathon Priorities
39. Demo Flow
40. Acceptance Criteria
41. Requirements Traceability Matrix
42. Requirement ID Index
43. Future Scope (FUTURE / OPTIONAL)
44. Final PRD Quality Rule — Definition of Done
45. Concept Integrity Rules

---

## 1. EXECUTIVE SUMMARY & DOCUMENT CONVENTIONS

StageX AI is a real, functional stage-operations web application — not a static prototype. It lets an organizer create an event, add speakers, build a timed agenda, run the event live with a real countdown, absorb delays by automatically recalculating the schedule, handle emergencies, generate context-aware anchor scripts with Gemini, read them on a teleprompter, and review analytics computed from what actually happened.

**Conventions**

| Term | Meaning |
|---|---|
| **MUST / MUST NOT** | Mandatory requirement |
| **SHOULD** | Strongly recommended; deviation needs justification |
| **MAY** | Optional |
| **P0 / P1 / P2** | Hackathon priority (Section 38) |
| **Proposed Default** | PRD-authored decision for something the Master Plan leaves open; can be overridden, but must be documented |
| **Engine** | Pure TypeScript business-logic module in `lib/`, no React, no UI side effects |
| **Now** | Actual system time (`Date.now()`), never a simulated value |

---

## 2. PRODUCT OVERVIEW

### 2.1 Identity
- **Product name:** StageX AI
- **Tagline:** Plan. Perform. Adapt.
- **Team / powered by:** NeuroX
- **Hackathon problem:** Bit N Build'26 — PS-5, Smart Anchor & Stage Flow Management System

### 2.2 Problem
Live events (hackathons, workshops, seminars, conferences, cultural and college events) run on strict schedules, but real events never run to plan: speakers arrive late, sessions overrun, microphones and projectors fail, breaks become unplanned. Anchors and stage coordinators must simultaneously (a) know what is on stage and what is next, (b) re-plan the rest of the day in their head, and (c) improvise something engaging to say — usually on paper or scattered chat messages.

### 2.3 Vision
A single operations console where the stage team can **plan** the event, **perform** it with live awareness, and **adapt** instantly when reality deviates from the plan — with AI that speaks from the *real* event state rather than from generic templates.

### 2.4 Product goal
Deliver a polished, hackathon-ready, deployable MVP (Next.js on Vercel) that completes the 20-step acceptance flow in Section 40 with no fake data, no dead buttons, no exposed secrets, and no data loss on refresh.

### 2.5 Target users
Event organizers, stage coordinators, anchors/emcees, and (as script/teleprompter consumers and context providers) speakers. See Section 6.

### 2.6 Core value proposition
> **REAL-TIME EVENT STAGE OPERATIONS + DYNAMIC SCHEDULE ADAPTATION + CONTEXTUAL AI ASSISTANCE**

StageX AI is **NOT** merely an AI script generator. AI is one integrated stage of the live workflow:

```
Real Event Context → AI Generation → Usable Anchor Script → Teleprompter → Live Event Assistance
```

### 2.7 Positioning statement
"An intelligent stage-operations platform that helps event organizers and anchors plan, monitor, and adapt live events in real time." (MP §62)

---

## 3. SOURCE-OF-TRUTH RULE, SCOPE, AND AMBIGUITY REGISTER

### 3.1 Source-of-truth rule
The Master Plan is authoritative. This PRD converts it into a specification; it does not replace, simplify, or remove Master Plan requirements. Where this PRD adds precision (algorithms, field validation, formulas), it does so only to make the Master Plan implementable and labels such additions as **Proposed Default** or **Implementation Decision**.

### 3.2 MVP scope
In scope: the nine modules (Dashboard, Events, Speakers, Agenda, Live Stage, AI Copilot, Teleprompter, Analytics, Settings), the four engines (Schedule, Live, Analytics, AI Context), Gemini via a server route, LocalStorage persistence, Vercel deployment.

Out of scope (MP §2): Supabase, PostgreSQL, MongoDB, Firebase, WebSocket infrastructure, authentication systems — "unless a real requirement later makes them necessary."

### 3.3 Ambiguity & Decision Register

| ID | Ambiguity in Master Plan | PRD handling |
|---|---|---|
| AMB-01 | Event Health Score formula is not specified (MP §37 says only "must be deterministic"). | Section 18 provides a **Proposed Default** formula. Formula MUST be confirmed and committed in code (`analytics-engine.ts`) before the score is shown. If not confirmed, the score MUST NOT be displayed (it is optional: "If implemented"). |
| AMB-02 | "Planned buffer" (MP §26) is not defined as a data field; the Session model has no buffer field. | **Implementation Decision:** buffer = the *gap in minutes between the end of one session and the start of the next* (derived from schedule, no new field). See §10.5. |
| AMB-03 | Which session a delay attaches to (MP §24–25). | **Implementation Decision:** delay anchors on the current Live session, else the next Upcoming session; user MAY explicitly pick a different session. See §10.3. |
| AMB-04 | Teleprompter delivery (route vs. overlay) not specified. | **Implementation Decision:** full-screen overlay/route (`components/teleprompter/`) using the Fullscreen API with a CSS full-viewport fallback. |
| AMB-05 | "Reorder sessions" semantics in a time-based agenda not specified. | **Proposed Default:** slot re-flow (§9.3, FR-023). |
| AMB-06 | Gemini model name not specified. | **Implementation Decision:** model name is a single constant in the API route (optionally overridable by `GEMINI_MODEL`); the API key remains `GEMINI_API_KEY` only. |
| AMB-07 | "Live state" content in Zustand (MP §41) not specified. | Defined in §20.2 (active event id, selected script, UI-independent live pointers). Ticking "now" is NOT persisted. |
| AMB-08 | Settings module content (MP §16, §59 P2 "Additional settings") not specified. | MVP Settings contains only functional items (§9.9). Nothing decorative. |
| AMB-09 | Speaker "Photo" storage without a backend. | **Implementation Decision:** optional image stored as a downscaled data URL (max ~200 KB) in LocalStorage; if it exceeds limit or storage is full, the user is told and the speaker is saved without photo. |
| AMB-10 | Whether completing a session early pulls later sessions forward. | Not in Master Plan → **not implemented in MVP**. Listed as FUTURE (§43). |
| AMB-11 | Logo asset formats. MP §6 suggests SVG + PNG + favicon; the PRD brief specifies `public/brand/stagex-logo.png`. | PNG at `public/brand/stagex-logo.png` is mandatory; SVG is only used if an official vector is supplied. Never hand-trace/recreate the logo. |
| AMB-12 | Event date vs. real "today" — countdown uses real system time, but an event dated in the future/past would show nonsensical countdowns. | Live Stage shows a clear "event date differs from today" notice (§11.6); behavior is preserved, not faked. |

---

## 4. BRAND IDENTITY

### 4.1 Official identity

| Element | Value |
|---|---|
| Product name | **StageX AI** |
| Tagline | **Plan. Perform. Adapt.** |
| Powered by | **NeuroX** |
| Official logo | The attached **official provided brand asset** (the only official logo) |
| Asset path | `public/brand/stagex-logo.png` |
| Additional assets | `public/brand/favicon.png` (derived crop/scale of the official logo emblem only) ; `public/brand/stagex-logo.svg` **only if** an official vector is provided |

### 4.2 What the supplied logo visibly contains (do not embellish beyond this)
The provided logo is a circular emblem containing a stylised "S"-shaped ribbon, a presenter/anchor silhouette holding a microphone under stage spotlights, an agenda/timeline panel with a clock, and a small "AI" chip icon; below it the wordmark **StageX AI** (the **X** in a blue-violet-orange gradient), the tagline **Plan. Perform. Adapt.**, and **Powered by NeuroX**. Predominant colors: deep navy/black background with electric blue, violet, and amber/orange accents, plus cyan-to-violet-to-amber in the tagline.

### 4.3 Logo rules
- **MUST NOT** redesign, recreate, re-trace, recolor, distort, stretch, re-crop the artwork so elements are cut, add effects, or replace the logo. Proportions are locked.
- Scaling MUST be proportional (`object-contain`, explicit width/height or aspect ratio).
- **MUST NOT** invent additional logo variants, mascots, or icons that claim to be the logo.
- **Asset-preparation note (important):** the supplied PNG has an out-of-focus light/dark smudge pattern outside the emblem area (a background artifact of the source file). Preparing the asset MAY consist only of cropping/trimming the canvas to the logo and placing it on the app's dark surface. If a clean original/transparent-background export exists, it SHOULD be used instead. Do not repaint, upscale-regenerate, or redraw the artwork.
- The full lockup (emblem + wordmark + tagline + "Powered by NeuroX") is a large asset; a compact usage is required for small UI areas (see below). Any compact usage MUST be a straight crop of the official logo (e.g. emblem only) — never a redrawn version.

### 4.4 Where the logo is used (and where it is not)

| Location | Usage | Requirement ID |
|---|---|---|
| Application shell / navbar (sidebar top or header) | Compact official logo (emblem crop + text "StageX AI" from official lockup if legible; otherwise the full lockup scaled to fit) | UI-001 |
| Dashboard / first-run empty state | Full lockup shown once as branding above the empty-state message | UI-002 |
| Favicon / app icon / PWA-style icon | `favicon.png` derived from the emblem | UI-003 |
| Documentation (README header, PRD) | Official logo at top | UI-004 |
| Teleprompter, forms, tables, modals, analytics | **Do not** repeat the logo | UI-005 |

"Powered by NeuroX" appears in the logo lockup and MAY appear once in the footer/Settings "About" text. It MUST NOT be spammed across pages.

---

## 5. PS-5 REQUIREMENT MAPPING

Only requirements present in the provided source material are mapped (MP §63). No additional PS-5 requirements are invented.

| PS-5 area | How StageX AI satisfies it | Requirement IDs |
|---|---|---|
| **Event & agenda management** | Event CRUD, agenda builder with session types/statuses/ordering/fixed-time | FR-001–FR-004, FR-020–FR-026 |
| **Speaker / guest management** | Speaker profiles (name, designation, organization, bio, photo), assignment to sessions, speaker context fed to AI | FR-010–FR-014, AI-002 |
| **AI opening / speaker introduction scripts** | "Speaker Introduction" generation using event, speaker, designation, organization, bio, session | AI-002 |
| **Transition scripts** | "Transition Script" between current and next session | AI-003 |
| **Closing scripts** | "Closing Script" / vote-of-thanks | AI-006 |
| **Live dashboard** | Live Stage: current session, next session, countdown, upcoming agenda, status | FR-030–FR-033 |
| **Current / upcoming activities** | Live Engine computes current, next, upcoming from real schedule and real time | FR-030–FR-032 |
| **Dynamic agenda updates / delay handling** | Delay Engine with +5/+10/+15/custom, buffer consumption, fixed-time conflicts, change log | FR-040–FR-044 |
| **Unexpected announcements** | Announcement system with AI-assisted wording, recorded in history | FR-060, AI-005 |
| **Emergency situations** | Emergency Mode (7 types), guidance, AI filler, optional schedule adjustment | FR-050–FR-053, AI-004 |
| **Meaningful AI-powered workflow** | Context Engine → Gemini → script → teleprompter → live use | AI-001–AI-012, FR-080 |

---

## 6. USER ROLES

The MVP has **no authentication and no role-based access control** (MP §2). Roles describe *needs*, not permissions; every user of a device can use every feature.

| Role | Primary needs | Key modules |
|---|---|---|
| **Event Organizer** | Create event; register speakers; build and adjust the agenda; review analytics afterward | Events, Speakers, Agenda, Analytics, Dashboard |
| **Stage Coordinator** | Know instantly what is live and next; start/complete/skip sessions; apply delays; trigger emergencies; keep the change log | Live Stage, Agenda, Emergency, Activity |
| **Anchor** | Get contextual scripts (intros, transitions, fillers, announcements, closings) and read them on a teleprompter; ask the Copilot situational questions | AI Copilot, Live Stage (script access), Teleprompter |
| **Speaker** | Have accurate name/designation/bio in the system so introductions are correct; (indirectly) see timing of their session | Speakers, Agenda (view) |

---

## 7. COMPLETE USER FLOW

| # | Step | Description | System behavior |
|---|---|---|---|
| 1 | **Empty State** | First visit; no data in LocalStorage | Dashboard shows "No events yet. Create your first event." with official logo. No sample data injected. |
| 2 | **Create Event** | User fills event form | Validation → Zustand → LocalStorage → ActivityLog "Event created". Event becomes active. |
| 3 | **Add Speakers** | User adds speaker profiles for that event | Validation → store → ActivityLog "Speaker added". |
| 4 | **Build Agenda** | User adds sessions (type, times, speaker, fixed flag) | Overlap/time validation; original times recorded; ActivityLog "Session added". |
| 5 | **Start Live Event** | User opens Live Stage and starts the first session | Session → Live, `actualStartTime = now`; ActivityLog "Session started". |
| 6 | **Monitor Current Session** | Live Stage shows current/next/upcoming | Live Engine derives everything from state + real time. |
| 7 | **Real Countdown** | Remaining = scheduledEnd − now; shows OVERTIME +mm:ss when negative | Recomputed each tick from `Date.now()`. |
| 8 | **Apply Delay** | +5 / +10 / +15 / custom | Schedule Engine validates, previews, applies; DelayRecord + ActivityLog. |
| 9 | **Dynamic Schedule Recalculation** | Affected future sessions shift; buffers absorbed first; fixed sessions prompt | Agenda, Live Stage, Analytics update immediately. |
| 10 | **Emergency Mode** | User picks an emergency type | Emergency record, ActivityLog, recommended action, AI filler option, optional delay. |
| 11 | **AI Script Generation** | User generates filler/intro/transition/etc. | AI Context Engine builds real context → `/api/ai` → Gemini → text → AIRecord + ActivityLog. |
| 12 | **Teleprompter** | User opens selected script full-screen | Displays the actual generated text with scroll/font controls. |
| 13 | **Continue Event** | Emergency resolved; live operations continue | Emergency `resolved = true`; ActivityLog entry. |
| 14 | **Complete Sessions** | User completes/skips sessions | `actualEndTime = now`, status updated, logs written. |
| 15 | **Analytics** | User opens Analytics | Metrics computed only from real records. |
| — | **Refresh** | Browser refresh | State rehydrated from LocalStorage; nothing lost. |

---

## 8. INFORMATION ARCHITECTURE

**Navigation (all items MUST lead to a real, functional page):**

| Module | Route (suggested) | Purpose |
|---|---|---|
| Dashboard | `/dashboard` (root `/` redirects here) | Real-data overview: counts, active event, status, recent activity; first-run empty state |
| Events | `/events` | Create/edit/delete/open events; event detail |
| Speakers | `/speakers` | Manage speakers for the active event; assign to sessions |
| Agenda | `/agenda` | Build and edit sessions; reorder; fixed-time flag; schedule view |
| Live Stage | `/live-stage` | Operational screen: current/next/upcoming, countdown, controls, delay, emergency, AI script, announcements |
| AI Copilot | `/ai` | Conversational assistant + script generators + script history; entry to teleprompter |
| Teleprompter | full-screen view launched from Live Stage / AI | Readable full-screen script display |
| Analytics | `/analytics` | Charts and metrics from real activity |
| Settings | `/settings` | Functional utilities only (reset data, storage status, About) |

**Global concept — Active Event.** Speakers, Agenda, Live Stage, AI, Analytics operate on the *active event* (`activeEventId`). "Open event" in Events sets it. If none is selected, those pages show an empty state directing the user to create/open an event.

**Derived event state (no extra stored field):**
- `Live` — at least one session has status Live.
- `Completed` — ≥1 session exists and every session is Completed, Skipped, or Cancelled.
- `Planned` — otherwise. ("Upcoming Events" on the dashboard = Planned events whose date ≥ today.)

---

## 9. FUNCTIONAL REQUIREMENTS

Format: **ID — Feature | Purpose | User action | System behavior & data | Success | Error | Acceptance**. Every action follows the pipeline in MP §15:

```
Button → Function → Business Logic Engine → Zustand update → LocalStorage → UI re-render
```

### 9.1 Event Management (P0)

| ID | Feature / Purpose | User action | System behavior & data | Success | Error | Acceptance criteria |
|---|---|---|---|---|---|---|
| **FR-001** | **Create Event** — register an event to plan | Opens "Create Event", fills name, type, date, venue, description, organizer, start time, end time; submits | Validate (§ DATA / `validation.ts`); create `Event` with id, `createdAt`, `updatedAt`; set as active if first event or on user confirm; write `ActivityLog{type:"event_created"}`; persist | Event appears in list, is openable, survives refresh | Inline field errors (empty name, invalid date, end ≤ start); nothing saved | Event with all fields saved; invalid form blocked with messages; log entry exists |
| **FR-002** | **Edit Event** — correct details | Edits fields, saves | Re-validate; update `updatedAt`; if start/end time shrinks below existing sessions → warn and block until resolved; log `event_updated` | Changes visible everywhere | Same validation errors; conflict message "Existing sessions fall outside the new event window" | Edited values persist after refresh |
| **FR-003** | **Delete Event** — remove an event | Chooses Delete, confirms in dialog stating what will be removed | Cascade-delete that event's speakers, sessions, delays, emergencies, AI records, activity logs; clear `activeEventId` if it was active | Event and all dependents gone | If storage write fails: show "Unable to save data locally." and keep in-memory state consistent | No orphaned records remain; dashboard counts update |
| **FR-004** | **Open / View Event** — see details, make active | Clicks an event | Sets `activeEventId`; shows details (all fields, counts of speakers/sessions, derived status) | Other modules now scoped to that event | Missing id → "Event not found" state with link back | Deep link to a deleted event shows graceful message |

Event types (select): Hackathon, Workshop, Seminar, Competition, Cultural Event, Conference, College Event, Other.

### 9.2 Speaker Management (P0)

| ID | Feature / Purpose | User action | System behavior & data | Success | Error | Acceptance |
|---|---|---|---|---|---|---|
| **FR-010** | **Add Speaker** | Fills full name (req.), designation, organization, short bio, optional photo | Validate; create `Speaker{eventId,…,createdAt}`; log `speaker_added` | Speaker listed; available for assignment and AI context | Name empty/too long; unsupported/oversized image (see AMB-09) | Speaker persists after refresh; no auto-created speakers exist |
| **FR-011** | **Edit Speaker** | Edits any field | Validate; update; log `speaker_updated` | Updated data used by future AI generations | Same as FR-010 | Edit reflected in agenda & AI context |
| **FR-012** | **Delete Speaker** | Deletes with confirmation showing assigned sessions | Remove speaker; for sessions referencing him/her set `speakerId = null` (session remains) and show "No speaker assigned."; log `speaker_deleted` | Speaker removed; sessions intact | Storage failure message | No dangling `speakerId` |
| **FR-013** | **View Speaker** | Opens speaker card/detail | Shows all fields + assigned sessions (derived from sessions) | Full profile visible | — | Assigned sessions list correct |
| **FR-014** | **Assign speaker to session** | Selects speaker in session form or from speaker view | Sets `Session.speakerId` (must belong to same event); log `session_updated` | Agenda and Live Stage show speaker | Speaker from other event rejected | One session has ≤ 1 speaker (MVP); a speaker MAY be assigned to multiple sessions |

### 9.3 Agenda Management (P0)

| ID | Feature / Purpose | User action | System behavior & data | Success | Error | Acceptance |
|---|---|---|---|---|---|---|
| **FR-020** | **Add Session** | Enters title, type, times/duration, speaker (optional), fixed flag | Validate; create `Session` with `status="Upcoming"`, `originalStartTime/EndTime = startTime/endTime`; log `session_added` | Session in chronological agenda | Invalid times / overlap / outside event window → "Please check the session times." | Session persists; original times recorded |
| **FR-021** | **Edit Session** | Edits fields | Re-validate schedule. Before the event starts (no session has `actualStartTime`): update `originalStart/End` together with `startTime/endTime`. After the event starts: original times are **locked** (needed for deviation analytics), only current times change and a `schedule_change` log is written | Updated agenda | Validation errors | Edits before start reset "original"; edits after start do not |
| **FR-022** | **Delete Session** | Confirms deletion | Remove session; remove/annotate related delay records? — MUST keep DelayRecord history (set nothing) but ActivityLog retains message; log `session_deleted` | Removed | Cannot delete a Live session without first completing/skipping | Live session delete blocked with clear message |
| **FR-023** | **Reorder Sessions** | Moves a session up/down (buttons; drag-and-drop MAY be added) | **Proposed Default (AMB-05):** slot re-flow — take the ordered list of *gaps* between session slots, re-pack sessions in new order keeping each session's duration, first session keeps the earliest start, each next start = previous end + gap at that position. Fixed-time, Live, Completed sessions cannot be moved by reorder (message explains; edit time explicitly instead). Validate result; log `session_reordered` | Agenda reflects new order and times | Blocked-move message; validation failure | Reorder result has no overlaps; durations preserved |
| **FR-024** | **Times, duration** | Sets start + end, or start + duration | Times `HH:mm` 24h in event-local date; `duration = end − start` (minutes, integer ≥ 1). Editing start+duration derives end; editing start+end derives duration. Sessions crossing midnight are rejected (MVP) | Consistent trio | Any inconsistency blocked | `duration` always equals `end − start` |
| **FR-025** | **Session type & status** | Chooses type | Types: Opening, Keynote, Talk, Workshop, Competition, Break, Announcement, Panel, Cultural Performance, Closing, Other. Statuses: Upcoming, Live, Completed, Delayed, Skipped, Cancelled | Type badge + status badge (text + icon, not color only) | — | All enumerated values selectable |
| **FR-026** | **Fixed-time sessions** | Toggles "Fixed time" on a session | Sets `isFixedTime`; Schedule Engine treats such a session as immovable unless the user explicitly confirms (§10.6) | Fixed badge visible in agenda & Live Stage | — | Delay across a fixed session always prompts |

**Session status transitions (allowed):**

```
Upcoming ──start──► Live ──complete──► Completed
Upcoming ──delay applied──► Delayed ──start──► Live
Upcoming/Delayed ──skip──► Skipped
Upcoming/Delayed/Live ──cancel──► Cancelled   (Cancelled MAY be set from Agenda or via fixed-time conflict flow)
Live ──skip──► Skipped (only if user confirms; records actualEndTime = now)
```
Completed, Skipped, Cancelled are terminal for the MVP. (No "un-complete" in MVP.)

### 9.4 Live Stage (P0) — see also §11

| ID | Feature | User action | System behavior | Success | Error | Acceptance |
|---|---|---|---|---|---|---|
| **FR-030** | **Current session** panel | Views screen | Title, speaker, type, start–end, remaining, elapsed, status (Live Engine) | Correct within 1 s | If none live: "No session is live. Start the next session." | Fields match store |
| **FR-031** | **Next session** panel | Views | Title, speaker, start time, countdown to start (using *current* scheduled start incl. delays) | Updates on delay | If none: "No further sessions." | Reflects delayed times |
| **FR-032** | **Upcoming agenda** | Views | Chronological list of not-yet-terminal sessions after the current one with (current time, original time when different) | List correct | Empty state | Order chronological |
| **FR-033** | **Countdown & Overtime** | — | `remaining = scheduledEnd − now`; if negative → `OVERTIME +mm:ss` (with text label + icon, not color only) | Correct with system clock | — | Verified via clock-mocked tests |
| **FR-034** | **Start Session** | Clicks Start | Allowed for Upcoming/Delayed; blocks if another session is Live (offer to complete it first); sets Live, `actualStartTime = now`; log `session_started` | Session Live | "Another session is live" | Actual start stored |
| **FR-035** | **Complete Session** | Clicks Complete | Only Live; `actualEndTime = now`, status Completed; log `session_completed` | Recorded | — | Analytics sees completion |
| **FR-036** | **Skip Session** | Clicks Skip → confirm | Upcoming/Delayed/Live → Skipped; log `session_skipped`. Skip does **not** auto-shift others in MVP (user may use Delay) | Skipped | — | Excluded from "next" |
| **FR-037** | **Session controls** | Uses controls | Start, Complete, Skip, Apply Delay, Emergency, Generate AI Script, Open Teleprompter — all mutate real state | No dead controls | — | Each control has a test |

### 9.5 Delay (see Section 10) — **FR-040 … FR-044**
### 9.6 Emergency (see Section 12) — **FR-050 … FR-053**

### 9.7 Announcements (P1) — FR-060

| Aspect | Requirement |
|---|---|
| Purpose | Let the anchor/coordinator create unplanned announcements and keep a history |
| User action | "New Announcement" → Title (req.), Message (req.), Priority (Low / Normal / High / Urgent — Proposed Default set; Master Plan lists "Priority" without values), Time (defaults to now, editable) |
| AI assist | Optional "Improve wording with AI" using AI-005 with the real event context; the user edits before saving |
| System behavior | Stores announcement as `ActivityLog{type:"announcement_created"}` with structured payload (title, message, priority, time). (No separate table required by Master Plan §35: "Announcements must be stored in activity/history.") |
| Success | Appears in Activity History and can be opened in Teleprompter |
| Error | Missing title/message blocked; AI failure shows AI error text and does not block manual saving |
| Acceptance | Created announcement visible after refresh, counted in activity, not lost when AI is unavailable |

### 9.8 Dashboard, Activity, Analytics — FR-070, FR-071, FR-072, FR-073, FR-074
- **FR-070 Dashboard (P0/P1):** Shows only real data: Total Events, Upcoming Events, Active Event (name + derived status), Total Speakers, Total Sessions, Current Event Status, Recent Activity. With zero events: "No events yet. Create your first event." plus a working "Create event" button. No placeholder numbers.
- **FR-071 Activity History (P1):** chronological log of meaningful actions (list in §19.7), filterable by type (MAY), with empty state.
- **FR-072 Analytics (P1):** §17.
- **FR-073 Schedule Deviation (P1):** §17.3.
- **FR-074 Event Health Score (P1, optional):** §18.

### 9.9 Settings (P2-adjacent, minimal) — FR-075

| Item | Behavior |
|---|---|
| Reset all data | Confirmation dialog → clears StageX LocalStorage keys → app returns to first-run empty state |
| Storage status | Shows real byte size of stored data and whether LocalStorage is available |
| About | Product name, tagline, "Powered by NeuroX", version |
| Rules | No toggle/control that does nothing. Additional settings only if fully implemented (P2). |

### 9.10 Script access from operations — FR-080
Generate AI Script and Open Teleprompter controls on Live Stage and on the AI page use the same pipeline (§13). "Open Teleprompter" is enabled only when a generated (or manually pasted/edited) script is selected; otherwise it prompts the user to generate one.

---

## 10. DYNAMIC DELAY ENGINE (CORE FEATURE)

Implemented in `lib/schedule-engine.ts` as **pure functions** (no store, no DOM, no `Date.now()` inside; `now` is passed in), enabling unit tests.

### 10.1 Requirements

| ID | Requirement | Priority |
|---|---|---|
| **FR-040** | Provide delay options +5, +10, +15 minutes and Custom delay (integer minutes). | P0 |
| **FR-041** | Consume planned buffer (gaps between sessions) before shifting all future sessions. | P0 |
| **FR-042** | Detect conflicts with fixed-time sessions and require an explicit user decision (Keep fixed / Shift fixed / Skip-cancel). Never change a fixed session silently. | P0 |
| **FR-043** | Every schedule modification produces real ActivityLog entries (and a DelayRecord for delays). | P0 |
| **FR-044** | Validate delay input and resulting schedule; never save an invalid schedule. | P0 |

### 10.2 Inputs / outputs

```ts
applyDelay(input: {
  sessions: Session[];        // event's sessions
  anchorSessionId: string;
  minutes: number;            // integer, validated
  reason?: string;
  now: number;                // epoch ms, injected
  eventWindow: {start: string; end: string};
  fixedDecision?: 'keep' | 'shift' | 'skip';   // present only after user confirmation
}): {
  status: 'ok' | 'needs_decision' | 'invalid';
  proposedSessions: Session[];
  changes: {sessionId: string; from: {start: string; end: string}; to: {start: string; end: string}}[];
  bufferConsumedMinutes: number;
  remainingShiftMinutes: number;     // delay that reached the end of the day
  conflicts: {sessionId: string; reason: string}[];
  errors: string[];
}
```

The UI shows a **preview** (`proposedSessions`, `changes`) before commit whenever `needs_decision` or when the user opts to preview. Commit = Zustand action that replaces sessions and appends DelayRecord + ActivityLog entries atomically.

### 10.3 Anchor session rule (AMB-03, Implementation Decision)
- If a session is **Live** → anchor = that session. Its **actual start is unchanged**; its `endTime += minutes` (the delay is an overrun/extension). Subsequent sessions are shifted per §10.4.
- Else anchor = the **next Upcoming/Delayed** session. Its `startTime` and `endTime` both `+= minutes`; subsequent sessions per §10.4. (This matches the Master Plan example.)
- The user MAY manually choose another Upcoming session as anchor (e.g., "speaker will arrive late"). Sessions earlier than the anchor are never modified. Completed, Skipped, Cancelled sessions are never modified.

### 10.4 Core algorithm (shift with buffer absorption)

Let sessions after the anchor (ignoring terminal-status sessions) be `S1…Sn` in chronological order; `gap_i = S_i.originalCurrentStart − S_{i-1}.originalCurrentEnd` (for `S1`, `S_{i-1}` is the anchor's **pre-delay** end). Let `carry_0 = minutes` (the anchor's end moved by `minutes`).

```
for i in 1..n:
    absorbed_i = min(carry_{i-1}, gap_i)        // buffer consumed
    carry_i    = carry_{i-1} − absorbed_i        // remaining shift for this session
    S_i.start += carry_i ; S_i.end += carry_i     // unchanged if carry_i == 0
    if S_i is Upcoming and carry_i > 0: status = Delayed
bufferConsumed = Σ absorbed_i ; remainingShift = carry_n
```
Once `carry` reaches 0, all later sessions are untouched.

Validation after computing: every session start < end; no overlap; all times within the event window (end ≤ event end). If a shifted session would end after event end: return a warning (not blocking) "Schedule now extends past the event end time" and allow the user to proceed; overlaps are blocking errors.

### 10.5 Worked examples

**Example A — no buffer (Master Plan example)**

| Session | Before | After +10 |
|---|---|---|
| Opening | 10:00–10:15 | 10:10–10:25 |
| Keynote | 10:15–11:00 | 10:25–11:10 |
| Workshop | 11:00–12:00 | 11:10–12:10 |
| Break | 12:00–12:30 | 12:10–12:40 |

Gaps are all 0 → nothing absorbed; every later session shifts +10. Sessions marked Delayed.

**Example B — buffer (MP §26)**

| Session | Before | After +10 |
|---|---|---|
| Opening (anchor) | 10:00–10:15 | 10:10–10:25 |
| *(5 min gap)* | 10:15–10:20 | consumed |
| Keynote | 10:20–11:00 | 10:25–11:05 |

`gap_1 = 5` → absorbed 5, `carry_1 = 5`. Keynote shifts +5 only (10:20→10:25). `bufferConsumed = 5`, `remainingShift = 5`.

**Example C — Live overrun.** Keynote is Live 10:20–11:00 and runs long; user applies +10 → Keynote end 11:10 (start stays 10:20, actual start unchanged). Next session begins at 11:00, gap 0 → shifts to 11:10.

### 10.6 Fixed-time sessions (MP §27)

During the pass, if session `S_i` has `isFixedTime` and `carry_i > 0` (i.e., it would move), the engine returns `status:"needs_decision"` with a conflict entry. The UI shows a confirmation dialog with a preview, and the user chooses one:

| Choice | Engine behavior |
|---|---|
| **Keep fixed time** | `S_i` stays. Sessions before `S_i` that were shifted are **truncated** so `end ≤ S_i.start` (their durations shrink; the dialog lists each truncated session with old→new times). If any session would be left with duration < 1 minute (or start ≥ fixed start), that session is listed as "would be skipped" and requires the user's explicit confirmation to set Skipped (never silent). After `S_i`, `carry` resets to 0 (delay absorbed by the fixed anchor point). |
| **Shift fixed session** | `S_i` shifts like any other; its `isFixedTime` flag is kept; log states that a fixed session was moved by explicit user choice. |
| **Skip / cancel session** | User chooses Skipped or Cancelled for `S_i`; it is removed from the shift chain and `gap` for the next session is measured from the last non-removed session's end; delay continues to propagate. |

Every fixed-time decision is logged with the chosen option.

### 10.7 Validation rules (FR-044)
- `minutes`: integer, 1 ≤ minutes ≤ 240 (Proposed Default upper bound; configurable constant). Custom delay: same rule. Reject decimals, empty, negative, NaN.
- Anchor must exist and not be terminal.
- Resulting schedule: no overlaps, `start < end`, `duration ≥ 1`.
- Invalid → nothing saved; message "Please check the session times."

### 10.8 Recording (FR-043)
On commit, atomically:
1. `DelayRecord{eventId, sessionId (anchor), minutes, reason, timestamp}`.
2. `ActivityLog` entries:
   - `delay_applied` — e.g., "Delay +10 minutes applied" (timestamp = actual time).
   - One `schedule_change` per changed session — e.g., "Keynote shifted from 11:00 → 11:10".
   - `buffer_consumed` (if > 0) — e.g., "5 minutes of buffer absorbed before Keynote".
   - `fixed_time_decision` (if applicable).
3. Persist to LocalStorage.
4. Live Stage, Agenda, Analytics re-render from the updated store.

### 10.9 Analytics impact
`DelayRecord` feeds Total Delay, Maximum Delay, Delayed Sessions, Schedule Changes; sessions' `original*` vs current/actual times feed Schedule Deviation and Health (Sections 17–18).

### 10.10 Test vectors (MUST be automated)

| Case | Setup | Expected |
|---|---|---|
| D-1 | Example A | As table above |
| D-2 | Example B | Buffer 5 consumed; Keynote +5 |
| D-3 | Gap ≥ delay | No later session moves; buffer consumed = delay |
| D-4 | Fixed session after anchor, delay 10 | `needs_decision`; nothing saved until choice |
| D-5 | Keep fixed, overlap would remove a session | Listed; requires confirmation |
| D-6 | Delay 0, −5, 2.5, "abc", 1000 | `invalid`, no state change |
| D-7 | Shift pushes last session beyond event end | Warning; allowed |
| D-8 | Terminal-status sessions in range | Untouched |

---

## 11. LIVE ENGINE

Implemented in `lib/live-engine.ts`. Pure functions taking `(sessions, now, eventDate)`.

### 11.1 Definitions (FR-030–FR-033)

| Concept | Rule |
|---|---|
| **Current session** | The session whose `status == "Live"`. (Sessions are started by explicit user action; the engine never auto-marks Live.) If more than one is Live (data anomaly), pick the one with the latest `actualStartTime` and surface a warning. |
| **Next session** | The first session, in chronological order by current `startTime`, with status Upcoming or Delayed and start ≥ current session's start (or the first such session if none is Live). |
| **Upcoming sessions** | All Upcoming/Delayed sessions after the current one, chronological. |
| **Elapsed time** | `now − actualStartTime` (current session) |
| **Remaining time** | `scheduledEnd − now`, where `scheduledEnd = eventDate + session.endTime` (uses the *current* scheduled end, i.e., after any delay extension) |
| **Overtime** | If `remaining < 0`: display `OVERTIME +mm:ss` where `mm:ss = |remaining|`; text-labelled and icon-marked in addition to color |
| **Countdown to next** | `nextStart − now`; if negative (next session's scheduled start has passed but it hasn't been started): display "Start overdue +mm:ss" |
| **Session status (display)** | From stored status; the UI additionally shows *derived flags*: "Overtime" (Live and remaining < 0), "Start overdue" (Upcoming/Delayed and start < now). Derived flags are not persisted. |

### 11.2 Real time only
The countdown MUST use `Date.now()`/`new Date()` compared with `eventDate + HH:mm`. **No stored decrementing counters, no fake timers.** A `setInterval(…, 1000)` (or `requestAnimationFrame` throttled to 1 Hz) triggers re-render, but the displayed value is always recomputed from the clock so that tab throttling, sleep, or refresh never cause drift.

### 11.3 Formatting
`hh:mm:ss` if ≥ 1 h else `mm:ss`; overtime prefixed with `OVERTIME +`. Time zone = the user's browser local time.

### 11.4 Performance
Only the countdown component subscribes to the tick. Store selectors are narrow. No network calls in the tick.

### 11.5 Edge cases

| Case | Behavior |
|---|---|
| No sessions | Empty-state prompt to build agenda |
| No session Live | "No session is live." + Start button for the next session |
| Last session Live | Next = "No further sessions" |
| All sessions terminal | "All sessions are finished" + link to Analytics |
| Delay applied while Live | Remaining recomputed from new end; Overtime clears if end extended past now |
| Two sessions overlapping in stored data (corrupt) | Validation flags; UI shows schedule warning |
| Browser tab sleeping | On wake, values recompute correctly |
| Refresh while a session is Live | Session remains Live (persisted); `actualStartTime` retained; countdown continues correctly |
| System clock changed | Values follow the new clock (documented behavior) |
| Event date ≠ today (AMB-12) | Banner: "This event is dated <date>. Countdowns use real system time." |
| Midnight crossing | Not supported in MVP (rejected at validation) |

---

## 12. EMERGENCY MODE (P1 workflow; AI filler is P0)

Emergency types: Speaker Delayed, Microphone Issue, Projector Issue, Technical Problem, Unexpected Break, Venue Change, Custom Issue.

### 12.1 Common behavior

| ID | Requirement |
|---|---|
| **FR-050** | User selects a type (+ optional description; description REQUIRED for Custom Issue). System creates `Emergency{eventId, type, description, timestamp, resolved:false}`, writes `ActivityLog{type:"emergency_activated"}`, and switches Live Stage to an emergency banner (text + icon). |
| **FR-051** | System shows a **Recommended Next Action** from a deterministic rule table (below — rule-based text authored in code, not AI, not fabricated data). Includes actions: "Generate AI filler", "Apply delay", "Open teleprompter". |
| **FR-052** | User can **Resolve** the emergency → `resolved = true`, log `emergency_resolved`; banner clears. Multiple simultaneous emergencies are allowed; each resolves independently. |
| **FR-053** | Optional schedule adjustment: from the emergency panel the user can open the Delay dialog pre-filled with `reason = emergency type` (still subject to all delay rules). No automatic schedule change without user confirmation. |
| **AI-004** | "Generate AI filler" uses AI Context (event, current session, next session, speaker, delay, this emergency). |

### 12.2 Per-type behavior

| Type | Trigger | State update | Activity log message pattern | UI response | AI assistance | Optional schedule adjustment |
|---|---|---|---|---|---|---|
| **Speaker Delayed** | User selects; may pick which speaker/session (defaults to next session's speaker) | Emergency record with description "Speaker <name> delayed" (from real data; if no speaker, text says "No speaker assigned.") | "Emergency: Speaker Delayed — <session>" | Banner; recommended: keep audience engaged, contact speaker, consider delay | Filler while speaker arrives (uses speaker name/designation only if real) | Suggest +5/+10/+15 delay on that session |
| **Microphone Issue** | Selected | Emergency record | "Emergency: Microphone Issue" | Banner; recommended: switch to backup mic, pause session briefly | Short holding script for the anchor | Optional small delay |
| **Projector Issue** | Selected | Emergency record | "Emergency: Projector Issue" | Banner; recommended: continue verbally/no-slides, technician check | Filler that references the current session without slides | Optional delay |
| **Technical Problem** | Selected + optional description | Emergency record | "Emergency: Technical Problem — <desc>" | Banner; recommended: pause, inform audience, technician | Neutral apology/holding script | Optional delay |
| **Unexpected Break** | Selected | Emergency record; user is offered "insert a Break session" (creates a real Break session in agenda after validation) | "Emergency: Unexpected Break" | Banner; recommended: announce break duration, reconvene time | Break announcement/filler | Delay by expected break length |
| **Venue Change** | Selected + required description (new location) | Emergency record (description mandatory); optionally updates event `venue` **only if user confirms** | "Emergency: Venue Change — <desc>" | Banner; recommended: announce new location clearly | Announcement script for the change | Delay for relocation |
| **Custom Issue** | Selected + required description | Emergency record | "Emergency: <desc>" | Banner; generic recommended action | Filler using user-entered description | Optional delay |

Recommended-action strings are static UI copy per type (deterministic guidance), clearly presented as "Suggested next steps", not as AI output and not as live data.

### 12.3 Data
`Emergency` model in §19.5. Emergency counts feed Analytics ("Emergency Events") and Health.

---

## 13. AI SYSTEM

### 13.1 Capabilities

| ID | Capability | Input context (real, from state) | Output |
|---|---|---|---|
| **AI-001** | Context construction | `ai-context.ts` builds a structured context object from the store | JSON context sent to the API |
| **AI-002** | **Speaker Introduction** (P0) | Event (name, type, venue, organizer), session (title, type, time), speaker (name, designation, organization, bio) | 30–60 s anchor script |
| **AI-003** | **Transition Script** (P1) | Current session, next session, next speaker, delay info | Script bridging sessions |
| **AI-004** | **Emergency Filler** (P0) | Emergency type/description, current + next session, speaker, delay | Short filler (~30 s default; length selectable) |
| **AI-005** | **Announcement** (P1) | User's title/message/priority + event context | Polished announcement |
| **AI-006** | **Closing Script** (P1) | Event details, completed sessions summary (titles), organizer | Closing / vote-of-thanks |
| **AI-007** | **AI Copilot** (P1) | Full compact event-state snapshot + user question | Answer grounded in state |

Generation happens **only on explicit user request** (no background/auto AI calls) — performance rule (MP §51).

### 13.2 AI context object (AI-001)

```json
{
  "event": {"name":"", "type":"", "date":"", "venue":"", "organizer":"", "description":""},
  "now": "ISO time supplied by client",
  "currentSession": {"title":"","type":"","start":"","end":"","status":"","remainingSeconds":0,"overtime":false},
  "nextSession": {"title":"","type":"","start":"","speaker":{"name":"","designation":"","organization":"","bio":""}},
  "speaker": {"name":"","designation":"","organization":"","bio":""},
  "delay": {"cumulativeMinutes": 0, "latest": {"minutes":0,"reason":""}},
  "emergency": {"type":"","description":"","activeCount":0},
  "schedule": [{"title":"","start":"","end":"","status":"","originalStart":""}],
  "request": {"type":"speaker_intro|transition|filler|announcement|closing|copilot", "tone":"", "length":"", "userText":""}
}
```
Rules:
- Fields without real data are **omitted** (never filled with placeholders like "John Doe"). If a required field for the chosen generator is missing (e.g., Speaker Introduction without a speaker), the UI blocks the request and shows "No speaker assigned." (AI-008).
- The request is **not generic** when real context exists (AI-009).
- Optional user controls: tone (Formal / Energetic / Warm / Humorous — Proposed Default set), length (Short ≈ 30 s / Medium ≈ 60 s / Long ≈ 90 s), language: English default (other languages FUTURE).

### 13.3 Prompting rules (server-side system instruction)
1. Use **only** supplied context; do not invent names, titles, credentials, dates, statistics, achievements, or events.
2. If a needed fact is missing, write around it or say it's unavailable — never fabricate.
3. Output is plain spoken-language text suitable for reading aloud (no markdown headings/bullets unless requested; no stage directions unless labelled in brackets).
4. Respect requested tone and length.
5. For emergencies: calm, reassuring, no blame, no false promises about timing that aren't in context.
6. Copilot: answer questions about the event using the snapshot; if the answer isn't present, say it isn't available.

### 13.4 AI Copilot behavior (AI-007, P1)
Supported question examples (MP §32): "Who is speaking next?", "How much delay has happened?", "What should I say while the speaker is arriving?", "Give me a 30-second filler.", "Introduce the next speaker.", "Which sessions are affected by the delay?" The Copilot sends the current snapshot with each question (no reliance on stale chat memory for facts). Conversation transcript shown in UI; each exchange stored as `AIRecord{type:"copilot"}`. Copilot MUST NOT invent unavailable information.
*Note:* facts that are purely deterministic (e.g., cumulative delay = sum of DelayRecords) SHOULD be computed by the engines and included in the snapshot so the model quotes them rather than recomputes them.

### 13.5 AI output handling
- Generated text is shown in an editable text area (user may correct before use).
- "Use in Teleprompter", "Copy", "Save to history" are real actions. (Generation is auto-recorded as `AIRecord` + `ActivityLog{type:"ai_generated"}`.)
- No AI response is fabricated locally; **no fake AI** (MP §65). If Gemini is unavailable, no substitute text is presented as AI output.

### 13.6 AI requirement list

| ID | Requirement | Priority |
|---|---|---|
| AI-001 | Structured context builder from real state | P0 |
| AI-002 | Speaker Introduction | P0 |
| AI-003 | Transition Script | P1 |
| AI-004 | Emergency Filler | P0 |
| AI-005 | Announcement assist | P1 |
| AI-006 | Closing Script | P1 |
| AI-007 | AI Copilot | P1 |
| AI-008 | Missing-context guard (block + message) | P0 |
| AI-009 | Real context mandatory; no generic prompt when data exists | P0 |
| AI-010 | On-demand only; no background AI calls | P0 |
| AI-011 | Every generation recorded (AIRecord + ActivityLog) | P1 |
| AI-012 | Loading, cancel/timeout, and error states | P0 |

---

## 14. GEMINI API ARCHITECTURE

```
Browser (UI)
   │  POST /api/ai   {requestType, context}
   ▼
app/api/ai/route.ts   (server-only; reads process.env.GEMINI_API_KEY)
   │  validates input → builds prompt → calls Gemini
   ▼
Gemini API
   │  text
   ▼
route.ts → { ok:true, text } | { ok:false, error }
   ▼
UI → AIRecord + ActivityLog + display
```

| ID | Requirement |
|---|---|
| **SEC-001** | API key exists **only** in server environment variable `GEMINI_API_KEY`. |
| **SEC-002** | Key never appears in client bundles, `NEXT_PUBLIC_*` variables, LocalStorage, logs, error messages, or GitHub. |
| **SEC-003** | `.env` (and `.env.local`) listed in `.gitignore`; `.env.example` committed with `GEMINI_API_KEY=` (empty/placeholder text, no real secret). |
| **AI-013** | Route accepts only `POST`, JSON content type; validates `requestType` ∈ allowed set; caps payload size (Proposed Default ≤ 30 KB) and `userText` length (≤ 2,000 chars); rejects otherwise with HTTP 400. |
| **AI-014** | Route sets a server-side timeout (Proposed Default 20 s) and returns a normalized error. |
| **AI-015** | Route responses are `{ok, text?, error?, code?}`; `code` ∈ `INVALID_REQUEST`, `MISSING_CONTEXT`, `RATE_LIMIT`, `UPSTREAM_ERROR`, `EMPTY_RESPONSE`, `NOT_CONFIGURED`, `TIMEOUT`. Raw upstream errors/stack traces are logged server-side (without key) and **never** sent to the client. |
| **AI-016** | If `GEMINI_API_KEY` is missing, route returns `NOT_CONFIGURED`; UI shows the friendly failure message (and Settings MAY show "AI not configured" by calling a lightweight status check — only if implemented fully). |
| **AI-017** | Model is a single constant (AMB-06). Response size limited (max output tokens constant). |
| **AI-018** | The route MUST NOT persist request data server-side (stateless). |

`.env.example`:
```
GEMINI_API_KEY=
# Optional
GEMINI_MODEL=
```

---

## 15. AI FAILURE HANDLING

The app MUST NOT crash on any AI failure; **all non-AI functionality continues** (AI-019).

| Situation | Detection | User-facing behavior | State |
|---|---|---|---|
| Gemini API error (5xx) | `UPSTREAM_ERROR` | "AI generation failed. Please try again." + Retry button | No AIRecord created (or created with failed flag? — **no**, only successful generations are recorded); no analytics increment |
| Network failure (offline / fetch throws) | catch in client | "AI generation failed. Please check your connection and try again." | Same |
| Invalid request (validation) | `INVALID_REQUEST` | Field-level guidance ("Add a title first") | Nothing sent |
| Empty response | `EMPTY_RESPONSE` | "AI generation failed. Please try again." | Nothing recorded |
| Rate limit / quota | `RATE_LIMIT` | "AI is busy right now. Please wait a moment and try again." | — |
| Timeout | `TIMEOUT` | "AI took too long. Please try again." | — |
| Missing context | client guard (AI-008) | e.g., "No speaker assigned." / "Add a session first." — request is not sent | — |
| Missing API key | `NOT_CONFIGURED` | "AI generation failed. Please try again." (details only in server logs / README setup) | — |

Additionally: duplicate submissions are prevented while a request is in flight (button disabled + spinner with accessible status); a manual **AI-unavailable test** (temporarily removing the key) is part of the test plan (TEST-AI-3).

---

## 16. TELEPROMPTER

Implemented in `components/teleprompter/`. Displays the **actual selected script** (AI-generated or edited by the user). It MUST NOT show placeholder lorem text.

| ID | Requirement | Priority |
|---|---|---|
| **FR-090** | **Full-screen mode**: Fullscreen API on supported browsers; fallback to fixed full-viewport overlay (covers iOS Safari limitation). | P0 |
| **FR-091** | **Large text**: default ≥ 32 px on desktop, ≥ 28 px on mobile; high contrast (light text on near-black); generous line height; max line length for readability. | P0 |
| **FR-092** | **Font-size controls**: increase/decrease (e.g., 5 steps or ±2 px), with visible current size; persisted in Settings state (non-secret) MAY be. | P0 |
| **FR-093** | **Auto-scroll**: adjustable speed control (slow ↔ fast); scroll driven by `requestAnimationFrame` with delta-time so speed is consistent across devices. | P0 |
| **FR-094** | **Play / Pause**: toggles auto-scroll; keyboard: Space. | P0 |
| **FR-095** | **Manual scroll**: touch/mouse/keyboard scroll works at any time; manual scroll while playing does not break state (either pauses or continues from new position — pick and be consistent; Proposed Default: pauses on manual interaction, indicated in UI). | P0 |
| **FR-096** | **Exit**: always-visible Exit button + `Esc`; returns to the previous page without losing script or position. | P0 |
| **FR-097** | **Responsive**: works on desktop, tablet, mobile; controls reachable one-handed on mobile; safe-area insets respected. | P0 |
| **FR-098** | **Minimal distractions**: no navigation chrome, no logo, no decorative elements; controls MAY auto-hide after inactivity but MUST reappear on tap/move/keypress. | P0 |
| **FR-099** | Screen-wake: SHOULD request Screen Wake Lock (if supported) while open; failure is silent and non-blocking. | P1 |

Acceptance: generating a filler on Live Stage → "Open Teleprompter" → the exact text displays; scroll/pause/size/exit all function; works at 320 px width without horizontal scroll.

---

## 17. ANALYTICS (P1)

Implemented in `lib/analytics-engine.ts` as pure functions over the active event's stored records. **No hardcoded/random values.** With no recorded activity: "Analytics will appear after event activity is recorded."

### 17.1 Metric definitions

| Metric | Definition (all per active event) |
|---|---|
| **Total Sessions** | Count of sessions |
| **Completed Sessions** | Count with status Completed |
| **Delayed Sessions** | Count of distinct sessions with `startTime ≠ originalStartTime` **or** `actualStartTime > originalStartTime` (i.e., shifted or started late) |
| **Skipped Sessions** | Count with status Skipped |
| **Cancelled Sessions** | Count with status Cancelled (shown if > 0) |
| **Total Delay** | Σ `DelayRecord.minutes` |
| **Maximum Delay** | max `DelayRecord.minutes` (single delay); 0/"—" if none |
| **Emergency Events** | Count of `Emergency` records (with resolved/unresolved split) |
| **AI Generations** | Count of `AIRecord` (with breakdown by type) |
| **Schedule Changes** | Count of `ActivityLog` entries with type `schedule_change` |
| **Event Duration** | *Planned:* event `endTime − startTime`. *Actual:* (max `actualEndTime` among completed sessions) − (min `actualStartTime`); shown only when both exist |
| **Schedule Deviation** | See §17.3 |
| **Event Health Score** | See Section 18 (optional) |

### 17.2 Charts (Recharts; each chart MUST have data-driven content or an empty state)
- Delays by record (bar) — from DelayRecord.
- Planned vs actual start per session (bar/line) — from sessions with actual data.
- Sessions by status (bar or list with counts; text labels/patterns, not color alone).
- AI generations by type (bar).
Charts are hidden and replaced by an explanatory empty state when their source data is empty. Charts MUST have text alternatives (table or summary) for accessibility.

### 17.3 Schedule Deviation (FR-073)
For each session with `actualStartTime`:
```
deviationMinutes = round((actualStartTime − originalStartTime[eventDate]) / 60000)
```
Displayed as:
```
Session: Keynote
Planned:  11:00 AM
Actual:   11:12 AM
Deviation: +12 min
```
Negative = early (e.g., −3 min). Sessions without actual start are not shown in deviation. **Only shown when actual data exists.** Also expose `endDeviation` for sessions with `actualEndTime`.

### 17.4 Analytics requirement IDs
FR-072 (Analytics page), FR-073 (deviation), DATA-020 (metrics derived, never stored), TEST-AN-1…5.

---

## 18. EVENT HEALTH SCORE (OPTIONAL P1)

**Status:** Optional ("If implemented", MP §37). If implemented it MUST be deterministic, formula in code, documented in README, and shown alongside its breakdown. **AMB-01:** The Master Plan lists possible factors (schedule deviation, delays, delay recovery, completed sessions, emergency events) but no formula.

> **Rule:** The formula below is a **Proposed Default / Implementation Decision that must be confirmed and documented before implementation.** Until confirmed, do not show a health score. It must never be random, hardcoded, or fabricated.

**Availability:** show only when ≥ 1 session has `actualStartTime`; otherwise display "Not enough data yet."

**Proposed Default formula**

```
score = clamp( 100 − P_dev − P_drift − P_emg − P_skip , 0, 100 )   // integer, rounded

P_dev   = min(30, 2 × meanAbsStartDeviationMinutes)          // over sessions with actualStartTime
P_drift = min(20, max(0, currentDriftMinutes))               // recovery: buffer absorption lowers drift
P_emg   = min(20, 4 × resolvedEmergencies + 8 × unresolvedEmergencies)
P_skip  = min(15, round(30 × (skippedSessions + cancelledSessions) / totalSessions))
```
- `currentDriftMinutes` = (latest started/completed session's `actualStartTime` − its `originalStartTime`) in minutes, or the largest current shift of remaining sessions vs. original, whichever is larger. (Captures "delay recovery": when buffers absorb delay, drift falls.)
- Completed sessions influence the score indirectly by increasing the sample of deviations and by `P_skip` denominators.

**Bands (text label + icon, not color alone):** 80–100 *On track*, 60–79 *Minor issues*, 40–59 *At risk*, 0–39 *Critical*.

**UI:** show the score, band label, and the four penalty components so it is explainable. Implementation requirements: DATA-021 (pure function), TEST-AN-6 (unit tests including boundary cases and determinism: same input → same output).

---

## 19. DATA MODEL

TypeScript interfaces live in `types/index.ts`. All ids: unique strings (e.g., `crypto.randomUUID()`; never random *data*, only identifiers). All timestamps: epoch milliseconds (number) or ISO strings — **Implementation Decision:** epoch ms (`number`) for `createdAt`, `updatedAt`, `timestamp`, `actual*`. Session schedule times `startTime`, `endTime`, `originalStartTime`, `originalEndTime`: `"HH:mm"` strings interpreted on the event's `date`.

### 19.1 Event

| Field | Type | Req. | Purpose | Validation |
|---|---|---|---|---|
| id | string | Yes | Identifier | unique |
| name | string | Yes | Event name | trimmed, 2–120 chars |
| type | enum | Yes | Hackathon, Workshop, Seminar, Competition, Cultural Event, Conference, College Event, Other | must be enumerated value |
| date | string `YYYY-MM-DD` | Yes | Event date | valid calendar date |
| venue | string | Yes (Proposed Default) | Location | 0–160 chars (Proposed: required) |
| description | string | No | Details | ≤ 1,000 chars |
| organizer | string | No | Organizer name | ≤ 120 chars |
| startTime | `HH:mm` | Yes | Event start | valid time |
| endTime | `HH:mm` | Yes | Event end | must be > startTime |
| createdAt | number | Yes | Created | set by system |
| updatedAt | number | Yes | Last edit | set by system |

### 19.2 Speaker

| Field | Type | Req. | Purpose | Validation |
|---|---|---|---|---|
| id | string | Yes | Id | unique |
| eventId | string | Yes | Parent event | must exist |
| name | string | Yes | Full name | 2–100 chars |
| designation | string | No | Title | ≤ 120 |
| organization | string | No | Org | ≤ 120 |
| bio | string | No | Short bio (AI context) | ≤ 800 chars |
| image | string \| null | No | Photo data URL | image MIME, ≤ ~200 KB after downscale (AMB-09) |
| createdAt | number | Yes | Created | system |

*(Session assignment is stored on `Session.speakerId`; "Session Assignment" in the Master Plan speaker fields is a UI view derived from sessions.)*

### 19.3 Session

| Field | Type | Req. | Purpose | Validation |
|---|---|---|---|---|
| id | string | Yes | Id | unique |
| eventId | string | Yes | Parent | must exist |
| title | string | Yes | Title | 2–140 chars |
| type | enum | Yes | Opening, Keynote, Talk, Workshop, Competition, Break, Announcement, Panel, Cultural Performance, Closing, Other | enumerated |
| speakerId | string \| null | No | Assigned speaker | must belong to same event |
| startTime | `HH:mm` | Yes | Current scheduled start | within event window |
| endTime | `HH:mm` | Yes | Current scheduled end | > startTime, within window |
| duration | number (min) | Yes | end − start | integer ≥ 1, equals computed |
| status | enum | Yes | Upcoming, Live, Completed, Delayed, Skipped, Cancelled | allowed transitions only |
| isFixedTime | boolean | Yes | Immovable flag | — |
| originalStartTime | `HH:mm` | Yes | Planned start (locked after event begins) | set at creation |
| originalEndTime | `HH:mm` | Yes | Planned end (locked after event begins) | set at creation |
| actualStartTime | number \| null | No | Actual start epoch ms | set on Start |
| actualEndTime | number \| null | No | Actual end epoch ms | set on Complete/Skip-from-Live |

Sequencing: agenda order is by `startTime` (ties broken by creation order). No overlaps allowed among non-Cancelled/Skipped sessions (Cancelled/Skipped sessions are excluded from overlap checks).

### 19.4 DelayRecord
| Field | Type | Req. | Purpose | Validation |
|---|---|---|---|---|
| id | string | Yes | Id | unique |
| eventId | string | Yes | Event | exists |
| sessionId | string | Yes | Anchor session | exists at time of creation |
| minutes | number | Yes | Delay minutes | integer 1–240 |
| reason | string | No | Reason/emergency link | ≤ 200 chars |
| timestamp | number | Yes | When applied | system |

### 19.5 Emergency
| Field | Type | Req. | Purpose | Validation |
|---|---|---|---|---|
| id | string | Yes | Id | unique |
| eventId | string | Yes | Event | exists |
| type | enum | Yes | Speaker Delayed, Microphone Issue, Projector Issue, Technical Problem, Unexpected Break, Venue Change, Custom Issue | enumerated |
| description | string | Conditional | Required for Custom Issue and Venue Change | ≤ 300 |
| timestamp | number | Yes | Activated at | system |
| resolved | boolean | Yes | Resolved state | default false |

*(Optional extension: `resolvedAt` number|null — Implementation Decision to support duration analytics; allowed as additive field.)*

### 19.6 AIRecord
| Field | Type | Req. | Purpose | Validation |
|---|---|---|---|---|
| id | string | Yes | Id | unique |
| eventId | string | Yes | Event | exists |
| type | enum | Yes | speaker_intro, transition, filler, announcement, closing, copilot | enumerated |
| prompt | string | Yes | Human-readable request summary/user question (not the API key, not raw system prompt) | ≤ 4,000 |
| generatedText | string | Yes | Output (user-edited copy MAY be stored in addition, as `editedText?`) | non-empty |
| timestamp | number | Yes | When | system |

### 19.7 ActivityLog
| Field | Type | Req. | Purpose | Validation |
|---|---|---|---|---|
| id | string | Yes | Id | unique |
| eventId | string | Yes | Event | exists |
| type | enum | Yes | See list | enumerated |
| message | string | Yes | Human-readable text | non-empty |
| timestamp | number | Yes | When the action happened | system |
| meta | object | No | Structured payload (e.g., from/to times, announcement fields) | JSON-serializable |

Log types: `event_created`, `event_updated`, `speaker_added`, `speaker_updated`, `speaker_deleted`, `session_added`, `session_updated`, `session_deleted`, `session_reordered`, `session_started`, `session_completed`, `session_skipped`, `delay_applied`, `schedule_change`, `buffer_consumed`, `fixed_time_decision`, `emergency_activated`, `emergency_resolved`, `ai_generated`, `announcement_created`.

### 19.8 Data requirement IDs
DATA-001 Event, DATA-002 Speaker, DATA-003 Session, DATA-004 DelayRecord, DATA-005 Emergency, DATA-006 AIRecord, DATA-007 ActivityLog, DATA-010 referential integrity (cascade/nullify rules), DATA-011 id uniqueness, DATA-020 analytics are derived (never stored), DATA-021 health function pure, DATA-030 storage schema versioning.

---

## 20. STATE MANAGEMENT (ZUSTAND)

Store file: `store/event-store.ts` (single store MAY be split into slices; one persisted root).

### 20.1 State & actions

| Slice | State | Actions (each validates via engines/`validation.ts`, then commits) |
|---|---|---|
| Events | `events: Event[]`, `activeEventId` | createEvent, updateEvent, deleteEvent, setActiveEvent |
| Speakers | `speakers: Speaker[]` | addSpeaker, updateSpeaker, deleteSpeaker |
| Sessions | `sessions: Session[]` | addSession, updateSession, deleteSession, reorderSession, assignSpeaker, startSession, completeSession, skipSession, cancelSession |
| Live | `selectedScriptId`, `liveFlags` (non-derivable flags only) | selectScript |
| Delays | `delays: DelayRecord[]` | applyDelay (calls Schedule Engine; commits sessions + delay + logs atomically) |
| Emergencies | `emergencies: Emergency[]` | activateEmergency, resolveEmergency |
| AI | `aiRecords: AIRecord[]` | addAIRecord |
| Activity | `activityLogs: ActivityLog[]` | appendLog (internal; also called by every action above) |
| Meta | `schemaVersion`, `hydrated` | resetAll, hydrate |

### 20.2 Live state (AMB-07)
"Live state" = persisted operational pointers only (`activeEventId`, `selectedScriptId`). The ticking current time is **never** stored; it lives in a component-level hook/ephemeral state. Current/next session are **derived** by the Live Engine from `sessions`.

### 20.3 Change propagation
```
UI event → store action → engine validation/calculation → set() new immutable state
        → persist middleware writes LocalStorage
        → selectors re-render only affected components (Live Stage, Agenda, Dashboard, Analytics, Activity)
```
Rules: complex logic MUST NOT live in components; every state-changing action writes its ActivityLog entry in the same `set()` (atomic); actions return `{ok, error?}` so UI can present errors (no thrown raw errors to UI).

---

## 21. LOCAL STORAGE

Implemented in `lib/storage.ts` and the Zustand `persist` middleware.

| ID | Requirement |
|---|---|
| **NFR-010** | **Persistence:** all user-created data (events, speakers, sessions, delays, emergencies, AI records, activity logs, active event, selected script, non-secret UI prefs) saved automatically after every state change. |
| **NFR-011** | **Load on startup:** hydrate before rendering data-dependent UI; show a neutral loading state (no flash of "No events yet" for users who have data — avoid hydration mismatch). |
| **NFR-012** | **Versioned schema:** key `stagex-ai:v1` containing `{schemaVersion, state}`; unknown/older versions go through a migration function or are rejected safely. |
| **NFR-013** | **Corrupted data handling:** on JSON parse failure or schema-validation failure, the app MUST NOT crash: copy the raw string to a backup key (`stagex-ai:corrupt-backup`, single slot), start with a clean empty state, and show a dismissible notice "Saved data could not be read and was reset. A backup copy was kept." (Partial recovery per-collection is MAY.) |
| **NFR-014** | **Storage failure:** quota exceeded / disabled storage → catch, show "Unable to save data locally.", keep app running in-memory, retry on next change. Photo fallback per AMB-09. |
| **NFR-015** | **Reset:** Settings → Reset all data (confirmation) removes all StageX keys and returns to first-run empty state. |
| **SEC-004** | **No secrets** in LocalStorage — API keys, tokens, or server responses containing secrets are never stored. |
| **NFR-016** | Refresh test: every entity type survives a browser refresh. Multi-tab: on `storage` event, state rehydrates (MAY; last-write-wins). |

---

## 22. NO FAKE DATA POLICY (MANDATORY)

**The application MUST NOT contain:** random data (`Math.random()` for any displayed content), fake statistics, fake speakers, fake events, fake sessions, fake analytics, fake activity logs, fake attendees, random schedules, hardcoded numbers presented as measurements, fake AI responses presented as real, or automatically injected demo data.

- Fresh install = clean empty state. **FR-100.**
- **Demo option (optional, P2):** an explicit user-initiated "Load demo event" MAY exist; the created event MUST be named/labelled **"Demo Event — Editable Sample"**, be fully editable/deletable, and never appear unless the user clicks it. Never silently injected.
- Random ids are allowed (identifiers only).
- Static UI copy (labels, empty-state text, suggested next steps for emergencies) is allowed; it must not pose as user data.
- CI/code review check: search codebase for `Math.random`, hard-coded arrays of people/events, and static metric literals.

---

## 23. NO DEAD BUTTONS POLICY (MANDATORY)

Every visible interactive control MUST perform a real action: no "Coming Soon", placeholder actions, fake navigation, decorative toggles, or non-functional tabs. If a feature is not implemented in the MVP it MUST NOT be visible. **FR-101.**

Verification (TEST-UI-1): a click-through checklist of every button/link/toggle in every module, recorded pass/fail; buttons that cannot act in the current state are **disabled with an accessible explanation** (e.g., "Complete is available while a session is live") rather than silently doing nothing.

---

## 24. EMPTY STATES

Each empty state MUST show a clear message and a working action.

| Location | Message | Action |
|---|---|---|
| Dashboard / Events (no events) | "No events yet. Create your first event." | Create Event |
| Speakers (no active event) | "Open or create an event to manage speakers." | Go to Events |
| Speakers (none) | "No speakers added. Add your first speaker." | Add Speaker |
| Agenda (none) | "No sessions scheduled. Create your first session." | Add Session |
| Live Stage (no sessions / none live) | "No sessions scheduled." / "No session is live. Start the next session." | Go to Agenda / Start |
| Activity history (none) | "No activity yet. Actions you take will appear here." | — (or link to first action) |
| Analytics (no activity) | "Analytics will appear after event activity is recorded." | Go to Live Stage |
| AI history (none) | "No scripts generated yet." | Generate a script |
| Teleprompter (no script) | "No script selected. Generate or paste a script first." | Go to AI |
| Speaker missing on session | "No speaker assigned." | Assign speaker |

---

## 25. UI/UX REQUIREMENTS

Qualities: premium, modern, professional, clean, high-impact, minimal, fast, responsive, usable.

| ID | Requirement |
|---|---|
| **UI-006** | Consistent, minimal visual language across all nine modules. |
| **UI-007** | Use color to communicate actual state (live, upcoming, overtime, delayed, emergency) **and** always pair with text/icon. |
| **UI-008** | Avoid: excessive gradients, random glassmorphism, too many colors, oversized cards, excessive animation, fake visual statistics, decorative UI without function. Gradients MAY appear only where they echo the official brand (e.g., primary accent). |
| **UI-009** | **Live Stage is the highest-priority screen** (MP §12): within seconds the coordinator must see: current session, countdown, speaker, session status, next session, upcoming agenda, delay controls, emergency controls, and AI script access. Recommended layout: dominant countdown/current-session card; adjacent next-session card; agenda list; persistent action bar (Start/Complete/Skip, +5/+10/+15/Custom, Emergency, Generate AI Script, Teleprompter). On mobile: current-session + countdown first, sticky action bar, agenda below. |
| **UI-010** | Loading, empty, success, and error states designed for every async/stateful feature. |
| **UI-011** | Confirmation dialogs for destructive actions (delete event/speaker/session, skip, reset) and fixed-time conflicts. |
| **UI-012** | Forms: inline validation, clear labels, disabled submit only with explanation. |
| **UI-013** | Navigation reflects every module; current page indicated (`aria-current`). |
| **UI-014** | Toasts/inline messages are dismissible, accessible (`role="status"`/`alert`), and never expose stack traces. |

**Palette direction (derived only from the official logo; do not add unrelated brand colors):** dark navy/near-black surfaces; primary accents electric blue and violet; highlight/warning accent amber-orange; cyan as a minor accent. Final tokens are set in Tailwind config during the Stitch/design phase and must be consistent (Section 27).

---

## 26. GOOGLE STITCH MCP

Google Stitch MCP is already configured in Google Antigravity. Stitch is a **design/UX assistant only** (MP §7–9).

**Workflow**
```
Stitch → Generate/Explore UI → Review → Refine → Approve design direction
      → Implement in Next.js + Tailwind → Connect real business logic → Test (functional + responsive)
```

**Design targets for Stitch:** Dashboard, Events, Speakers, Agenda, Live Stage, AI Copilot, Teleprompter, Analytics, Settings, empty states, responsive layouts, reusable components.

| ID | Rule |
|---|---|
| **UI-015** | Preserve StageX AI branding; use the provided official logo asset; never let Stitch redraw/replace it. |
| **UI-016** | Maintain one visual language; reusable components. |
| **UI-017** | Consider desktop, tablet, mobile from the first design. |
| **UI-018** | **Stitch MUST NOT override functional requirements.** Any Stitch-produced element that is a fake statistic, fake data, dead button, or non-functional control MUST be removed or wired to real logic during implementation. |
| **UI-019** | Stitch output is a reference, not production code: do not paste generated markup wholesale; rebuild as typed React components bound to the store. |
| **UI-020** | Analytics design must render real computed metrics; Live Stage design must bind to the real schedule/countdown engines; AI Copilot design must bind to the real AI workflow. |
| **UI-021** | If Stitch is unavailable, implementation proceeds using the design system in Section 27; Stitch is not a blocking dependency. |

---

## 27. DESIGN SYSTEM

Consistency required across Dashboard, Events, Speakers, Agenda, Live Stage, AI Copilot, Teleprompter, Analytics, Settings.

| Area | Requirement |
|---|---|
| Typography | One sans-serif family (e.g., via `next/font`), defined scale (display for countdown, h1–h3, body, caption), tabular numerals for timers/times |
| Colors | Design tokens in Tailwind theme: background, surface, border, text-primary/secondary, accent-blue, accent-violet, accent-amber, semantic states (live, upcoming, delayed, overtime, emergency, success, error) with WCAG AA contrast |
| Spacing | 4-px base scale; consistent page padding and card gaps |
| Buttons | Primary / secondary / ghost / destructive; sizes; loading + disabled states; min tap target 44×44 px |
| Cards | One card style with consistent radius/border/shadow |
| Inputs | Shared text/select/time/date/textarea components with label, helper, error |
| Tables / lists | Shared list/table component with responsive fallback (cards on mobile) |
| Modals / dialogs | Focus-trapped, `Esc` closes, restores focus |
| Status indicators | Badge with **icon + text + color** for every session and emergency status |
| Navigation | Sidebar (desktop/tablet-landscape) + bottom bar or drawer (mobile) |
| Icons | Lucide React only, consistent stroke/size |
| Logo | Official asset only, per §4 |

Reusable components live in `components/ui/`.

---

## 28. RESPONSIVE DESIGN

| Device | Test width | Requirement |
|---|---|---|
| Small mobile | 320 px | No horizontal overflow; single column; sticky action bar; readable countdown |
| Mobile | 375 px | Same; forms full-width |
| Tablet | 768 px | Two-column where useful; navigation adapts |
| Laptop | 1024 px | Sidebar + main + optional side panel |
| Desktop | 1440 px | Live Stage uses multi-panel layout; max content width to avoid stretching |

Rules: proper responsive behavior, **not scaled-down desktop**; tables collapse to cards; modals become full-screen sheets on mobile; touch targets ≥ 44 px; no hover-only functionality; teleprompter is fully usable on mobile (FR-097). **NFR-020:** verified on a real mobile device (MP §57): Dashboard, event creation, agenda, Live Stage, AI generation, Teleprompter.

---

## 29. ACCESSIBILITY

| ID | Requirement |
|---|---|
| **NFR-030** | Full keyboard operability of all controls, dialogs, menus, forms; logical tab order; no keyboard traps except intentional modal focus-trap with Esc exit |
| **NFR-031** | Visible focus indicators on all interactive elements |
| **NFR-032** | Semantic HTML (`nav`, `main`, `header`, `button`, headings hierarchy, lists, tables with headers) |
| **NFR-033** | Every form control has a programmatically associated `<label>`; icon-only buttons have `aria-label` |
| **NFR-034** | Text contrast ≥ WCAG AA (4.5:1; 3:1 for large text); teleprompter aims for AAA-like high contrast |
| **NFR-035** | Screen readers: live regions for important changes (delay applied, emergency activated, AI generated/failed); countdown announced sparingly (do not announce every second — e.g., update `aria-live` only at meaningful thresholds or provide a static accessible time) |
| **NFR-036** | Form validation messages tied to fields (`aria-describedby`, `aria-invalid`) |
| **NFR-037** | State is never communicated by color alone (icon + text always) |
| **NFR-038** | Respect `prefers-reduced-motion`; minimal animation |

---

## 30. TECH STACK

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| State | Zustand (+ persist middleware) |
| Icons | Lucide React |
| Charts | Recharts |
| AI | Gemini API via server route |
| Persistence | Browser LocalStorage |
| Source control | GitHub |
| Hosting | Vercel |

**Explicitly avoided (MVP):** Supabase, PostgreSQL, MongoDB, Firebase, WebSocket infrastructure, authentication systems. Minimize other dependencies (NFR-040). A small testing dev-dependency (e.g., Vitest) for engine unit tests is permitted as dev-only.

---

## 31. PROJECT LOCATION (MANDATORY)

| ID | Requirement |
|---|---|
| **NFR-050** | Verify `D:\AI-Projects` exists before doing anything. |
| **NFR-051** | Project root MUST be exactly **`D:\AI-Projects\StageX`**. |
| **NFR-052** | Do **NOT** create the project on Desktop, Documents, Downloads, OneDrive, `C:\Users\…`, temp folders, or anywhere else. |
| **NFR-053** | Do **NOT** create a nested duplicate (`D:\AI-Projects\StageX\StageX`). If `D:\AI-Projects\StageX` already contains a project, inspect and use it. Verify the current working directory before creating files. |
| **NFR-054** | All development commands (`npm install`, `npm run dev`, `npm run lint`, `npm run build`) MUST run from `D:\AI-Projects\StageX` (`cd /d D:\AI-Projects\StageX`). Never run them from `D:\AI-Projects`. |
| **NFR-055** | **Git root** MUST be `D:\AI-Projects\StageX` — never initialize Git in `D:\AI-Projects`. Never commit `.env`, API keys, secrets, `node_modules`, `.next`, or personal credentials. |
| **NFR-056** | The project MUST open directly in VS Code or Google Antigravity from that folder. |

Note: when scaffolding with `create-next-app`, use the current directory (`.`) so that files land in `D:\AI-Projects\StageX` directly.

---

## 32. PROJECT STRUCTURE

```text
D:\
└── AI-Projects\
    └── StageX\
        ├── app\
        │   ├── api\
        │   │   └── ai\
        │   │       └── route.ts          # secure Gemini server route
        │   ├── dashboard\
        │   ├── events\
        │   ├── speakers\
        │   ├── agenda\
        │   ├── live-stage\
        │   ├── ai\
        │   ├── analytics\
        │   ├── settings\
        │   ├── layout.tsx
        │   └── page.tsx                  # redirects to /dashboard
        ├── components\
        │   ├── dashboard\
        │   ├── events\
        │   ├── speakers\
        │   ├── agenda\
        │   ├── live-stage\
        │   ├── teleprompter\
        │   ├── ai\
        │   ├── analytics\
        │   └── ui\
        ├── lib\
        │   ├── schedule-engine.ts        # delays, shifting, buffer, fixed conflicts, validation
        │   ├── live-engine.ts            # current/next/countdown/overtime/status
        │   ├── analytics-engine.ts       # stats, deviation, health
        │   ├── ai-context.ts             # builds structured AI context
        │   ├── storage.ts                # safe LocalStorage, versioning, corruption handling
        │   └── validation.ts             # event/session/speaker/delay validation
        ├── store\
        │   └── event-store.ts
        ├── types\
        │   └── index.ts
        ├── public\
        │   └── brand\
        │       ├── stagex-logo.png       # official logo
        │       ├── stagex-logo.svg       # only if official vector provided
        │       └── favicon.png
        ├── .env.example
        ├── .gitignore
        ├── package.json
        ├── package-lock.json
        └── README.md
```
README MUST cover: overview, setup, environment variables, run/build commands, health formula (if implemented), deployment, and the no-fake-data/no-dead-button principles.

---

## 33. SECURITY

| ID | Requirement |
|---|---|
| **SEC-001–003** | (see §14) API key server-only, never exposed, `.env` ignored, `.env.example` committed |
| **SEC-005** | No `NEXT_PUBLIC_` variable holds a secret |
| **SEC-006** | `.gitignore` includes at least: `.env`, `.env.local`, `.env*.local`, `node_modules`, `.next`, `*.log`, `.vercel` |
| **SEC-007** | Client never calls Gemini directly; only `/api/ai` |
| **SEC-008** | Validate and size-limit API input; reject unknown `requestType` |
| **SEC-009** | Errors returned to client are normalized; stack traces and upstream error bodies never leave the server |
| **SEC-010** | Sanitize/escape rendered AI and user text (React default escaping; never `dangerouslySetInnerHTML` with user/AI content) |
| **SEC-011** | LocalStorage holds only user-created event data and non-secret prefs |
| **SEC-012** | Pre-commit/PR check: grep for key-like strings and `.env` staging |
| **SEC-013** | Vercel environment variable is set in the Vercel dashboard (Production/Preview), never in the repo |
| **SEC-014** | Optional basic abuse protection on `/api/ai` (e.g., in-memory per-IP throttle) — MAY; must not block legitimate use |

---

## 34. ERROR HANDLING

Principles: friendly messages, no raw stack traces, app never white-screens (React error boundary at layout level with "Something went wrong. Reload" + reload action that works), non-affected modules keep functioning.

| Scenario | Message (user-facing) | Behavior |
|---|---|---|
| Invalid event | Field-specific: "Event name is required." / "End time must be after start time." | Save blocked |
| Invalid schedule | "Please check the session times." (+ detail: which sessions overlap) | Save blocked; nothing persisted |
| Missing speaker | "No speaker assigned." | Non-blocking display; AI speaker-intro blocked until assigned |
| AI failure | "AI generation failed. Please try again." | Retry option; rest of app works |
| Storage failure | "Unable to save data locally." | App continues in memory |
| Corrupted storage | "Saved data could not be read and was reset. A backup copy was kept." | Clean state |
| Network failure | "Network error. Check your connection." (AI only; app is otherwise offline-capable after load) | — |
| Invalid session timing | "Session end must be after start." / "Session falls outside the event's time window." | Save blocked |
| Fixed-time conflict | Dialog: "This delay affects a fixed-time session (<title>). Choose how to proceed." | Decision required |
| Deleted/missing entity | "This item no longer exists." | Redirect to list |
| Invalid delay | "Enter a whole number of minutes between 1 and 240." | Rejected |

**NFR-060:** all engine and store actions return typed results; UI maps error codes to messages centrally.

---

## 35. TESTING STRATEGY

### 35.1 Approach
- **Unit tests** (Vitest or equivalent) for pure engines: `schedule-engine`, `live-engine`, `analytics-engine`, `ai-context`, `validation`, `storage`. Clock is injected (`now` parameter) — never depend on real time in tests.
- **Manual/E2E scenario tests** for UI flows (Playwright MAY be added; manual checklist is mandatory).
- After each development phase (MP §52): run app → test → fix → verify → continue.

### 35.2 Test requirements

| ID | Area | Scenario / Expected |
|---|---|---|
| **TEST-F-1** | Event CRUD | Create, edit, delete, open; validation errors; cascade delete |
| **TEST-F-2** | Speaker CRUD | Add, edit, delete (session speaker becomes "No speaker assigned."), view |
| **TEST-F-3** | Agenda CRUD | Add, edit, delete, reorder, fixed flag, overlap rejection, outside-window rejection |
| **TEST-F-4** | Session controls | Start (sets actualStart), Complete (sets actualEnd), Skip; blocked starts when another live |
| **TEST-UI-1** | No dead buttons | Click-through every control in every module |
| **TEST-UI-2** | Empty states | Fresh browser profile → all empty states correct, no data injected |
| **TEST-R-1** | Responsive | 320/375/768/1024/1440 px; no horizontal scroll; Live Stage usable on mobile |
| **TEST-A-1** | Accessibility | Keyboard-only walkthrough; focus visibility; Lighthouse/axe checks on main pages |
| **TEST-S-1** | Persistence | Create event + speakers + sessions + delay + emergency + AI record; refresh; everything present |
| **TEST-S-2** | Corruption | Manually corrupt the LocalStorage JSON; app loads to clean state with notice and backup |
| **TEST-S-3** | Storage failure | Simulate quota error/disabled storage; message shown; no crash |
| **TEST-AI-1** | AI intro | Uses real speaker/session/event fields; output references them; no invented facts (manual review) |
| **TEST-AI-2** | AI filler/transition/announcement/closing | Context-specific output; recorded in AIRecord + ActivityLog |
| **TEST-AI-3** | **AI failure test** | Remove/invalidate `GEMINI_API_KEY` or go offline: friendly error, no crash, non-AI features still work |
| **TEST-AI-4** | Security | Search built client bundle and network calls: key absent; no direct calls to Gemini from browser |
| **TEST-AI-5** | Missing context | Speaker intro with no speaker → blocked with message |
| **TEST-D-1…8** | **Delay engine** | Vectors D-1…D-8 in §10.10, plus +5, +10, +15, custom via UI; verify Agenda, Live Stage, log, DelayRecord, analytics update |
| **TEST-E-1** | Emergency | Each of 7 types: record created, log written, banner, guidance, AI filler available, resolve works, optional delay pre-fill |
| **TEST-C-1** | Countdown | With injected clock: remaining = end − now; overtime formatting; refresh continuity; delay changes remaining; tab sleep recompute |
| **TEST-C-2** | Live edge cases | All cases in §11.5 |
| **TEST-AN-1…6** | Analytics | Each metric in §17.1 against constructed fixtures; deviation; empty state; health determinism (same input → same score) and boundary cases |
| **TEST-T-1** | Teleprompter | Displays actual script; font size; play/pause; auto-scroll; manual scroll; exit; fullscreen fallback; mobile |
| **TEST-B-1** | Build | `npm run lint` and `npm run build` pass |
| **TEST-DEP-1** | Deployment | Production URL passes the acceptance flow |
| **TEST-DATA-1** | No fake data | Code search for `Math.random`/hardcoded people/metrics; fresh profile shows zero data |

### 35.3 Concrete acceptance scenarios

**Scenario S1 — Delay end-to-end.** Create event 10:00–13:00; sessions Opening 10:00–10:15, Keynote 10:15–11:00, Workshop 11:00–12:00, Break 12:00–12:30. Start Opening. Apply +10. Expected: Opening (Live) end 10:25; Keynote 10:25–11:10; Workshop 11:10–12:10; Break 12:10–12:40; DelayRecord(10); log lines "Delay +10 minutes applied" and shift lines; Live Stage countdown reflects new end; Analytics: Total Delay 10, Delayed Sessions ≥ 3, Schedule Changes ≥ 3.

**Scenario S2 — Fixed session.** Mark Break as fixed 12:00. Apply +10 → dialog appears; choose Keep fixed → Workshop truncated to end 12:00 (listed), Break stays; choose Shift → Break 12:10; choose Cancel → Break Cancelled and later sessions unaffected beyond carry rules; each choice logged.

**Scenario S3 — Emergency + AI + Teleprompter.** Trigger "Projector Issue" during Keynote; generate filler → text references event name, keynote title/speaker (if assigned) and the projector issue; open in Teleprompter → same text; resolve emergency.

**Scenario S4 — Refresh continuity.** During S1 (Opening Live, +10 delay), refresh: session remains Live, times remain shifted, countdown continues correctly, log intact.

---

## 36. PRODUCTION BUILD

Run from `D:\AI-Projects\StageX`:

```text
npm install
npm run lint
npm run build
```

Definition (DEP-001): **zero** TypeScript errors, zero lint errors (warnings reviewed), successful `next build`, no missing imports, no broken routes (all nav links load), no broken images (logo, favicon), no critical console errors, no hydration warnings on load, environment issues resolved (missing `GEMINI_API_KEY` must not crash build or non-AI pages).

---

## 37. DEPLOYMENT

Flow:
```
Local Development (D:\AI-Projects\StageX)
   → GitHub (repo root = StageX folder)
   → Vercel (import repo)
   → Environment Variables (GEMINI_API_KEY [, GEMINI_MODEL])
   → Production Deploy
   → Production Testing (desktop + real mobile device)
```

| ID | Requirement |
|---|---|
| **DEP-002** | Push StageX repository to GitHub from `D:\AI-Projects\StageX` (never from parent). Confirm no secrets in history. |
| **DEP-003** | Connect repository to Vercel; framework preset Next.js; build command `npm run build`. |
| **DEP-004** | Configure `GEMINI_API_KEY` in Vercel project settings (Production + Preview). Redeploy after adding. |
| **DEP-005** | Verify production build/deployment succeeded; open production URL. |
| **DEP-006** | Execute the acceptance flow (Section 40) on the production URL, including AI generation and teleprompter. |
| **DEP-007** | Test on a real mobile device (MP §57). |
| **DEP-008** | Confirm API key is not exposed in production client bundles/network responses. |
| **DEP-009** | Record the production URL in README. |

---

## 38. HACKATHON PRIORITIES

**P0 — MUST WORK**
Event creation · Speaker management · Agenda · Live Stage · Real countdown · Delay engine · AI speaker intro · AI emergency filler · Teleprompter · Local persistence · Production deployment

**P1 — SHOULD WORK**
Transition scripts · Emergency workflow · Announcements · Activity history · Analytics · Schedule deviation *(also Closing script, Copilot, Health Score if implemented — see notes)*

**P2 — ONLY IF TIME REMAINS**
Advanced exports · Advanced customization · Advanced charts · Additional settings

*Note:* The Master Plan lists Closing scripts and AI Copilot as required capabilities (MP §30, §32) and they are in the Phase 6 build list, but they are not named in the P0/P1 lists. The PRD classifies **Closing Script and Copilot as P1** and **Event Health Score as P1-optional**. Never sacrifice P0 functionality for visual polish.

**Phase order (MP §52):** 1 Foundation → 2 CRUD → 3 Live Stage → 4 Schedule Engine → 5 Emergency → 6 AI → 7 Teleprompter → 8 Analytics → 9 Persistence → 10 Production. Continue to the next phase only when the current phase works. Implementation order per feature (MP §64): data → business logic → state update → persistence → UI → connect → test → error handling → responsive test.

---

## 39. DEMO FLOW

```
Problem
  → Create Event
  → Add Speakers
  → Build Agenda
  → Start Live Stage
  → Show real countdown
  → Apply +10 minute delay
  → Show automatic schedule recalculation
  → Trigger Emergency
  → Generate AI Filler
  → Open Teleprompter
  → Continue event
  → Complete sessions
  → Show real Analytics
```

Suggested narration points: (1) live events never run to plan; (2) everything is created live by the presenter, starting from an empty state (no sample data); (3) delay ripples through the agenda instantly with a visible change log; (4) the AI filler quotes the real speaker/session/emergency; (5) teleprompter shows the exact script; (6) analytics reflect only what just happened; (7) refresh shows persistence. Rehearse with realistic (user-entered) data ahead of time — the demo data is entered by the presenter, not shipped in the app.

---

## 40. ACCEPTANCE CRITERIA

A fresh user MUST be able to (each item pass/fail):

| # | Criterion | Requirement refs |
|---|---|---|
| 1 | Open StageX AI | DEP-005 |
| 2 | See a clean empty state (no fake data) | FR-100, FR-070 |
| 3 | Create an event | FR-001 |
| 4 | Add speakers | FR-010 |
| 5 | Create sessions (agenda) | FR-020 |
| 6 | Start a live event | FR-034 |
| 7 | See a real countdown (system time) | FR-033 |
| 8 | Apply a +10 delay (and +5, +15, custom) | FR-040 |
| 9 | See future sessions update (buffer/fixed rules honored) | FR-041, FR-042 |
| 10 | Trigger an emergency | FR-050 |
| 11 | Generate contextual AI content using actual event context | AI-004, AI-009 |
| 12 | Open it in the teleprompter | FR-090–FR-098 |
| 13 | Continue the event (resolve emergency) | FR-052 |
| 14 | Complete sessions | FR-035 |
| 15 | View real analytics from actual activity | FR-072 |
| 16 | Refresh the browser | NFR-016 |
| 17 | Confirm data persists | NFR-010 |
| 18 | Verify the app works on mobile | NFR-020 |
| 19 | Build successfully (lint + build) | DEP-001 |
| 20 | Deploy successfully to Vercel | DEP-002–DEP-008 |

**Final quality checklist (MP §65):** no random data · no fake statistics · no dead buttons · no fake AI · no exposed API key · no broken navigation · no broken mobile layout · no unnecessary backend · no TypeScript errors · no production build errors · user data persists · countdown works · delay engine works · AI works · teleprompter works · analytics use actual data · Emergency Mode works · event workflow works end-to-end · Stitch design translated into functional UI · branding consistent · project at `D:\AI-Projects\StageX`.

---

## 41. REQUIREMENTS TRACEABILITY MATRIX

| Req ID | Requirement | Source | Feature/Module | Implementation | Acceptance Criteria | Priority |
|---|---|---|---|---|---|---|
| FR-001 | Create event | MP §18 | Events | Event form → `createEvent` | Event saved, valid, persisted | P0 |
| FR-002 | Edit event | MP §18 | Events | Edit form → `updateEvent` | Edits persist | P0 |
| FR-003 | Delete event | MP §18 | Events | Confirm dialog → cascade delete | No orphan data | P0 |
| FR-004 | Open/view event | MP §18 | Events | `setActiveEvent`, detail view | Modules scoped to event | P0 |
| FR-010 | Add speaker | MP §19 | Speakers | Speaker form → `addSpeaker` | Speaker saved, no auto speakers | P0 |
| FR-011 | Edit speaker | MP §19 | Speakers | `updateSpeaker` | Persisted, used in AI | P0 |
| FR-012 | Delete speaker | MP §19 | Speakers | `deleteSpeaker` + null out sessions | No dangling refs | P0 |
| FR-013 | View speaker | MP §19 | Speakers | Detail card | Profile + sessions | P0 |
| FR-014 | Assign speaker to session | MP §19, §20 | Speakers/Agenda | `assignSpeaker` | Shown on agenda/live | P0 |
| FR-020 | Add session | MP §20 | Agenda | Session form → `addSession` | Saved w/ original times | P0 |
| FR-021 | Edit session | MP §20 | Agenda | `updateSession` | Valid; original locked after start | P0 |
| FR-022 | Delete session | MP §20 | Agenda | `deleteSession` | Live session protected | P0 |
| FR-023 | Reorder sessions | MP §20 | Agenda | `reorderSession` (slot re-flow) | No overlaps, durations kept | P0 |
| FR-024 | Start/end time & duration | MP §20, §50 | Agenda | Time validation | duration = end − start | P0 |
| FR-025 | Session type & status | MP §20 | Agenda | Enums, badges | All values selectable | P0 |
| FR-026 | Fixed-time flag | MP §20, §27 | Agenda | `isFixedTime` | Delay prompts for fixed | P0 |
| FR-030 | Current session display | MP §21 | Live Stage | Live Engine | Fields match store | P0 |
| FR-031 | Next session display | MP §21 | Live Stage | Live Engine | Reflects delays | P0 |
| FR-032 | Upcoming agenda | MP §21 | Live Stage | Live Engine | Chronological | P0 |
| FR-033 | Real countdown / overtime | MP §22 | Live Stage | Clock-derived remaining | Correct; OVERTIME +mm:ss | P0 |
| FR-034 | Start session | MP §23 | Live Stage | `startSession` | Live + actualStart | P0 |
| FR-035 | Complete session | MP §23 | Live Stage | `completeSession` | Completed + actualEnd | P0 |
| FR-036 | Skip session | MP §23 | Live Stage | `skipSession` | Skipped, logged | P1 |
| FR-037 | Session controls all functional | MP §23 | Live Stage | Action bar | No dead controls | P0 |
| FR-040 | Delay options (+5/+10/+15/custom) | MP §24–25 | Delay | `applyDelay` | Future sessions shift | P0 |
| FR-041 | Buffer consumption | MP §26 | Delay | Gap absorption | Buffer used first | P0 |
| FR-042 | Fixed-time conflict confirmation | MP §27 | Delay | Decision dialog | Never silent | P0 |
| FR-043 | Change log for schedule mods | MP §28 | Activity | ActivityLog writes | Real entries | P0 |
| FR-044 | Delay/schedule validation | MP §25, §50 | Delay | `validation.ts` | Invalid rejected | P0 |
| FR-050 | Emergency activation (7 types) | MP §29 | Emergency | `activateEmergency` | Record + log + banner | P1 |
| FR-051 | Recommended next action | MP §29 | Emergency | Rule table | Shown per type | P1 |
| FR-052 | Resolve emergency | MP §29 | Emergency | `resolveEmergency` | Continue event | P1 |
| FR-053 | Optional schedule adjustment | MP §29 | Emergency/Delay | Delay dialog prefill | User confirmed only | P1 |
| FR-060 | Announcements | MP §35 | Live Stage/AI | Announcement form + log | Stored in history | P1 |
| FR-070 | Dashboard (real data) | MP §17 | Dashboard | Selectors | No fake stats | P0/P1 |
| FR-071 | Activity history | MP §39 | Activity | Log list | Real entries | P1 |
| FR-072 | Analytics | MP §36 | Analytics | Analytics Engine | Real metrics | P1 |
| FR-073 | Schedule deviation | MP §38 | Analytics | Deviation calc | Only w/ actual data | P1 |
| FR-074 | Event health score (optional) | MP §37 | Analytics | Deterministic fn | Formula in code | P1 (opt.) |
| FR-075 | Settings (reset, storage status, about) | MP §16, §42 | Settings | `resetAll` | No dead controls | P1 |
| FR-080 | AI/Teleprompter access from live ops | MP §23, §34 | Live Stage/AI | Buttons → AI pipeline | Script opens | P0 |
| FR-090…099 | Teleprompter features | MP §13, §34 | Teleprompter | Teleprompter components | Displays real script | P0 |
| FR-100 | Clean empty start / no fake data | MP §2, §65 | Global | No seed data | Fresh profile empty | P0 |
| FR-101 | No dead buttons | MP §2, §65 | Global | Click-through | All controls act | P0 |
| AI-001 | Context builder | MP §31, §49 | AI Context Engine | `ai-context.ts` | Real context only | P0 |
| AI-002 | Speaker introduction | MP §30 | AI | `/api/ai` speaker_intro | Uses speaker/session/event | P0 |
| AI-003 | Transition script | MP §30 | AI | transition | Bridges sessions | P1 |
| AI-004 | Emergency filler | MP §30, §29 | AI/Emergency | filler | Uses emergency+context | P0 |
| AI-005 | Announcement assist | MP §30, §35 | AI | announcement | Real wording assist | P1 |
| AI-006 | Closing script | MP §30 | AI | closing | Vote of thanks | P1 |
| AI-007 | AI Copilot | MP §32 | AI Copilot | copilot | Grounded answers | P1 |
| AI-008 | Missing-context guard | MP §44, §31 | AI | Client guard | "No speaker assigned." | P0 |
| AI-009 | No generic prompt with real data | MP §31 | AI | Context mandatory | Output cites real data | P0 |
| AI-010 | AI only on request | MP §51 | AI | Manual triggers | No background calls | P0 |
| AI-011 | Record generations | MP §39, §40 | AI | AIRecord + log | Counted in analytics | P1 |
| AI-012 | Loading/error states | MP §44, §55 | AI | UI states | No crash | P0 |
| AI-013–018 | API route rules | MP §33 | `/api/ai` | Validation, timeout, normalized errors | Key safe; errors friendly | P0 |
| AI-019 | AI failure isolation | MP §55 | AI | Error handling | Non-AI works | P0 |
| SEC-001…003 | API key protection & env files | MP §33, §5 | Security | env vars, `.gitignore` | Key absent from client/repo | P0 |
| SEC-004…014 | Storage/secrets/input safety | MP §5, §33, §42 | Security | See §33 | Checks pass | P0 |
| DATA-001…007 | Data models | MP §40 | Types | `types/index.ts` | Fields preserved | P0 |
| DATA-010…011, 020…021, 030 | Integrity, derived analytics, versioning | MP §41–42, §36–37 | Data | Store/engines | No orphans | P0 |
| NFR-010…016 | Persistence & corruption handling | MP §42, §56 | Storage | `storage.ts` | Refresh keeps data | P0 |
| NFR-020 | Mobile verification | MP §46, §57 | Responsive | Real-device test | No overflow | P0 |
| NFR-030…038 | Accessibility | MP §47 | Global | Semantic HTML, ARIA | Keyboard, contrast | P1 |
| NFR-040 | Minimal dependencies | MP §2, §51 | Global | Dependency policy | No unnecessary infra | P0 |
| NFR-050…056 | Project location & Git root | MP §3–5 | Workspace | Path checks | Root = `D:\AI-Projects\StageX` | P0 |
| NFR-060 | Central error mapping | MP §44 | Global | Typed results | Friendly errors | P0 |
| UI-001…005 | Logo usage | MP §6 | Branding | Assets in `public/brand` | Official logo only | P0 |
| UI-006…014 | UI/UX principles | MP §10–13, §45 | Global/Live Stage | Design system | Live Stage readable in seconds | P0 |
| UI-015…021 | Stitch workflow | MP §7–9 | Design | Stitch → implement | No fake elements retained | P1 |
| TEST-* | Test plan | MP §53–57 | QA | Section 35 | All pass | P0 |
| DEP-001…009 | Build & deploy | MP §53, §58 | Deployment | Section 36–37 | Prod URL passes acceptance | P0 |

---

## 42. REQUIREMENT ID INDEX

| Prefix | Meaning | Range used |
|---|---|---|
| FR | Functional | FR-001–004, 010–014, 020–026, 030–037, 040–044, 050–053, 060, 070–075, 080, 090–099, 100–101 |
| NFR | Non-functional | NFR-010–016, 020, 030–038, 040, 050–056, 060 |
| AI | AI | AI-001–019 |
| UI | UI/UX | UI-001–021 |
| DATA | Data | DATA-001–007, 010–011, 020–021, 030 |
| SEC | Security | SEC-001–014 |
| TEST | Testing | TEST-F-*, TEST-UI-*, TEST-R-*, TEST-A-*, TEST-S-*, TEST-AI-*, TEST-D-*, TEST-E-*, TEST-C-*, TEST-AN-*, TEST-T-*, TEST-B-*, TEST-DEP-*, TEST-DATA-* |
| DEP | Deployment | DEP-001–009 |

---

## 43. FUTURE SCOPE (FUTURE / OPTIONAL — NOT PART OF THE MVP)

Kept separate from MVP requirements. Do not implement until the MVP acceptance criteria are met.

| Item | Status |
|---|---|
| Auto-pull-forward of later sessions when a session finishes early (AMB-10) | **FUTURE / OPTIONAL** |
| Export of schedule, activity log, or analytics (PDF/CSV) | **FUTURE / OPTIONAL** (P2 "advanced exports") |
| Multi-language script generation | **FUTURE / OPTIONAL** |
| Optional "Load demo event" (must be labelled "Demo Event — Editable Sample") | **FUTURE / OPTIONAL** |
| Multi-device sync / shared live view | **FUTURE / OPTIONAL** (would require a backend; excluded from MVP) |
| Authentication and roles | **FUTURE / OPTIONAL** |
| Advanced charts / customization / additional settings | **FUTURE / OPTIONAL** (P2) |
| Voice/TTS readout of scripts | **FUTURE / OPTIONAL** |

---

## 44. FINAL PRD QUALITY RULE — DEFINITION OF DONE

A developer or AI coding agent reading this PRD should know:

- **What to build:** the nine modules, four engines, secure AI route, persistence, deployment (§8–§14, §32).
- **Why:** real-time stage operations + dynamic adaptation + contextual AI for live events (§2, §5).
- **How it behaves:** flows, statuses, transitions, edge cases (§7, §9, §11, §12).
- **What data it needs:** schemas, validation, referential rules (§19).
- **How state changes:** action → engine → Zustand → LocalStorage → UI (§20, §21).
- **How delays work:** anchor rule, buffer absorption algorithm, fixed-time decisions, examples and test vectors (§10).
- **How AI works:** context object, prompting rules, failure handling, security (§13–§15).
- **How the UI should behave:** Live Stage priority, design system, responsive and accessibility rules (§25–§29).
- **What must not be implemented:** fake data, dead buttons, unnecessary backend/auth, exposed secrets, logo alteration, nested project folder (§3, §22, §23, §31, §4).
- **How to test it:** §35. **How to deploy it:** §36–§37.
- **What counts as done:** §40 acceptance criteria + §44.

Completion requires: all P0 requirements passing; P1 requirements implemented or explicitly deferred with rationale; all TEST-* items passed; production URL verified.

---

## 45. CONCEPT INTEGRITY RULES

- Product name is **StageX AI**. Do not rename.
- Tagline is **Plan. Perform. Adapt.** Do not change.
- Team credit is **Powered by NeuroX**. Do not change.
- The attached logo is the **only** official logo. Do not replace, redesign, recreate, recolor, or distort it.
- The concept is **real-time stage operations + dynamic schedule adaptation + contextual AI assistance** — never reduce it to a basic AI script generator, and never add unrelated features.
- Priority order for all trade-offs: **Functionality → Reliability → Usability → Responsive Design → Visual Polish.**

---

*End of STAGEX_AI_PRD.md — StageX AI — Plan. Perform. Adapt. — Powered by NeuroX*
