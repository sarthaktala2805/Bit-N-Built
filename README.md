# StageX AI

### Plan. Perform. Adapt.

**Powered by NeuroX**

**Bit N Build '26 — Gujarat Round**  
**PS-5: Smart Anchor & Stage Flow Management System**

<p align="center">
  <img
    src="./public/brand/stagex-logo.png"
    alt="StageX AI Logo"
    width="430"
    style="border-radius: 100px;"
  />
</p>

<p align="center">
  <strong>AI-Powered Smart Anchor & Stage Flow Management System</strong>
</p>

<p align="center">
  <a href="https://stagexai.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Website-StageX%20AI-111827?style=for-the-badge" alt="Live Website">
  </a>
  <a href="https://github.com/sarthaktala2805/Bit-N-Built">
    <img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" alt="GitHub Repository">
  </a>
</p>

---

## 🚀 Live Project

### 🌐 Live Website

**https://stagexai.vercel.app**

### 💻 GitHub Repository

**https://github.com/sarthaktala2805/Bit-N-Built**

---

# 📌 Executive Overview

**StageX AI** is an intelligent live stage operations and event management platform designed for:

- Hackathons
- Workshops
- Seminars
- Conferences
- Competitions
- Cultural programs
- College events
- Multi-session institutional events

Traditional event-management systems mainly focus on creating a schedule before an event begins.

Real-world events are different.

A speaker may arrive late.

A session may run overtime.

A technical problem may interrupt the program.

An emergency announcement may need to be inserted.

A fixed-time session may create a scheduling conflict.

An anchor may suddenly need an introduction, transition, announcement, or emergency filler.

StageX AI addresses this operational gap by combining:

**Event Planning + Agenda Management + Speaker Management + Live Stage Control + Dynamic Timing + Delay Management + Emergency Handling + AI Assistance + Script Generation + Teleprompter + Invitations + Audience Access + Resource Sharing + Historical Event Management**

into one platform.

The system is designed around actual event data rather than random or fake dashboard information.

---

# 🎯 Problem Statement

## Bit N Build '26 — Gujarat Round

### PS-5: Smart Anchor & Stage Flow Management System

College events frequently involve multiple:

- Speakers
- Guests
- Sessions
- Activities
- Announcements
- Technical requirements
- Strict time schedules

A static schedule is easy to create but difficult to maintain once real-world changes begin.

### Example

```text
Planned Schedule

09:00 AM → Opening
09:15 AM → Speaker 1
09:45 AM → Workshop
10:45 AM → Speaker 2
11:15 AM → Closing
```

Now suppose Speaker 1 arrives late:

```text
Speaker 1 delayed
      ↓
Opening affected
      ↓
Speaker 1 starts late
      ↓
Workshop starts late
      ↓
Workshop runs overtime
      ↓
Speaker 2 timing affected
      ↓
Anchor needs transition
      ↓
Organizer needs updated live schedule
```

A traditional static agenda does not provide enough operational support for this situation.

StageX AI converts the schedule into a **live, adaptive stage-management system**.

---

# 💡 Proposed Solution

StageX AI provides a centralized platform where organizers and stage teams can:

- Create and manage events
- Add speakers
- Build agendas
- Assign speakers to sessions
- Manage session timing
- Monitor live sessions
- Track current and upcoming activities
- Track countdowns
- Detect overtime
- Apply delays
- Recalculate affected schedules
- Protect fixed-time sessions
- Handle emergencies
- Create announcements
- Generate AI scripts
- Use AI Copilot
- Open Teleprompter
- Create invitations
- Generate invitation artwork where configured
- Upload event resources
- Share events using event codes
- Provide audience access
- Track audience presence
- Review completed events
- Analyze event performance

The product philosophy is:

```text
PLAN
  ↓
Prepare the event

PERFORM
  ↓
Run the event

ADAPT
  ↓
Handle real-world changes

ASSIST
  ↓
Use AI to reduce operational workload
```

---

# 🧠 Plan. Perform. Adapt. Assist.

## PLAN

Prepare the event before it begins.

- Create events
- Add speakers
- Build agendas
- Assign sessions
- Prepare scripts
- Create invitations
- Upload resources
- Configure event information

## PERFORM

Run the event in real time.

- Monitor current session
- View upcoming session
- Track countdown
- Track elapsed time
- Monitor overtime
- Use Teleprompter
- Make announcements
- Complete sessions
- Skip sessions when required

## ADAPT

Respond when reality changes.

- Apply delays
- Handle overtime
- Recalculate affected sessions
- Protect fixed-time sessions
- Handle emergencies
- Update live schedule
- Preserve operational history

## ASSIST

Use AI to support organizers and anchors.

- AI Copilot
- Event planning
- Event creation
- Session creation
- Speaker introductions
- Transitions
- Announcements
- Emergency filler
- Long-form scripts
- Contextual stage assistance

---

# 🏗️ How StageX AI Was Built

StageX AI was developed as a modular full-stack web application.

The application separates:

```text
User Interface
      ↓
Application State
      ↓
Business Logic
      ↓
Persistence
      ↓
External Services
```

This separation allows independent management of:

- Event data
- Agenda data
- Speaker data
- Session data
- Live timing
- Delay logic
- Emergency logic
- AI workflows
- Authentication
- Cloud persistence
- File storage
- Audience access
- Historical information
- Analytics

---

# 🧩 System Architecture

```text
                         ┌─────────────────────────┐
                         │          USERS          │
                         │ Organizer / Audience    │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │       STAGEX AI         │
                         │   Next.js + React + TS  │
                         └────────────┬────────────┘
                                      │
              ┌───────────────────────┼────────────────────────┐
              │                       │                        │
              ▼                       ▼                        ▼
     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
     │  EVENT ENGINE   │     │  LIVE ENGINE    │     │    AI ENGINE    │
     │                 │     │                 │     │                 │
     │ Events          │     │ Timing          │     │ Gemini          │
     │ Agenda          │     │ Countdown       │     │ AI Copilot      │
     │ Speakers        │     │ Current Session │     │ Scripts         │
     │ Invitations     │     │ Delays          │     │ AI Actions      │
     │ Resources       │     │ Overtime        │     │ Assistance      │
     │ Past Events     │     │ Emergency       │     │ Conversations   │
     └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │        FIREBASE         │
                         │                         │
                         │ Authentication          │
                         │ Cloud Firestore         │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │        SUPABASE         │
                         │                         │
                         │ Private File Storage    │
                         └─────────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

### Next.js

Next.js is used as the primary application framework.

It provides:

- App Router
- Page routing
- Server/client boundaries
- API routes
- Production deployment architecture

### React

React is used for the interactive application interface.

### TypeScript

TypeScript is used throughout the application for:

- Type safety
- Data models
- API contracts
- Components
- Business logic
- State management

### Tailwind CSS

Tailwind CSS is used for:

- Responsive layouts
- Component styling
- Design consistency
- Responsive UI
- Visual hierarchy

### Lucide React

Lucide React is used for interface icons and operational controls.

### Recharts

Recharts is used for analytics visualizations and event metrics.

---

# ⚙️ State Management

## Zustand

Zustand is used as the central application state-management layer.

The master event store manages:

- Events
- Active event
- Speakers
- Sessions
- Delays
- Emergencies
- Activity logs
- AI records
- AI conversations
- Scripts
- Invitations
- User state
- Hydration state
- Live operational state

The store acts as the bridge between:

```text
UI
 ↓
Business Logic
 ↓
Persistence
```

---

# 🗄️ Database

## Firebase Cloud Firestore

Cloud Firestore is used as the persistent cloud database.

It stores:

- Events
- Speakers
- Sessions
- Delays
- Emergencies
- Activity logs
- AI records
- AI conversations
- Scripts
- Invitations
- Public event metadata

---

# 🔐 Authentication

## Firebase Authentication

Firebase Authentication provides organizer authentication.

Supported authentication methods include:

- Email / Password
- Google Sign-In
- Authentication state persistence
- Logout

Organizer authentication is separated from audience event-code access.

---

# 🤖 Artificial Intelligence

## Google Gemini API

Gemini powers the AI layer of StageX AI.

AI functionality includes:

- AI Copilot
- Event planning
- Event creation
- Event queries
- Event assistance
- Session creation
- Speaker introductions
- Transitions
- Announcements
- Emergency filler
- Script generation
- Long-form generation
- Contextual stage assistance

AI requests are handled through server-side API routes.

---

# 🔐 AI Credential Security

Gemini API keys must never be exposed through:

- Client-side JavaScript
- Browser storage
- Public source files
- GitHub
- UI code

Private AI credentials remain server-side through environment variables.

---

# 🔄 Gemini Multi-Key / Multi-Model Architecture

StageX AI supports multiple Gemini credentials and model configurations.

Example:

```env
GEMINI_API_KEY_1=
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=

GEMINI_MODEL_PRIMARY=
GEMINI_MODEL_FALLBACK_1=
GEMINI_MODEL_FALLBACK_2=
```

The architecture supports:

- Primary model
- Fallback models
- Multiple API credentials
- Bounded retries
- Retryable-error handling
- Timeout handling
- Graceful AI failure

The system should never enter an infinite retry loop.

AI failure should not crash the core event-management system.

---

# ☁️ File Storage

## Supabase Storage

Firebase is used for authentication and Firestore persistence.

Supabase Storage is used for binary event resources.

Resources can include:

- Images
- PDFs
- Text files
- CSV files
- Presentations
- Documents
- Videos
- Other supported event files

The storage bucket is private.

Controlled signed upload and download workflows are used.

---

# 📁 Project Structure

```text
Bit-N-Built/
│
├── app/
│   ├── agenda/
│   ├── audience/
│   ├── events/
│   ├── invitations/
│   ├── live-stage/
│   ├── login/
│   ├── past-events/
│   ├── scripts/
│   ├── speakers/
│   ├── teleprompter/
│   │
│   └── api/
│       ├── ai/
│       ├── events/
│       └── invitations/
│
├── components/
│   ├── agenda/
│   ├── ai/
│   ├── events/
│   ├── invitations/
│   ├── live-stage/
│   ├── navigation/
│   ├── scripts/
│   ├── speakers/
│   ├── teleprompter/
│   └── ui/
│
├── contexts/
│   └── auth-context.tsx
│
├── lib/
│   ├── firestore/
│   ├── supabase/
│   ├── analytics-engine.ts
│   ├── events-registry.ts
│   ├── firebase.ts
│   ├── live-engine.ts
│   ├── resource-storage.ts
│   ├── schedule-engine.ts
│   └── validation.ts
│
├── store/
│   └── event-store.ts
│
├── types/
│   └── index.ts
│
├── tests/
│
├── public/
│   └── brand/
│       └── stagex-logo.png
│
├── STAGEX_AI_PRD.md
├── firestore.rules
├── firebase.json
├── .env.example
├── .gitignore
└── package.json
```

---

# 🗄️ Firestore Data Architecture

User data is organized under the authenticated Firebase user.

```text
users/{userId}
└── events/{eventId}
    ├── speakers/{speakerId}
    ├── sessions/{sessionId}
    ├── delays/{delayId}
    ├── emergencies/{emergencyId}
    ├── activityLogs/{activityLogId}
    ├── aiRecords/{aiRecordId}
    ├── aiConversations/{conversationId}
    ├── scripts/{scriptId}
    └── invitations/{invitationId}
```

This structure supports:

- User isolation
- Event-scoped persistence
- Speaker persistence
- Session persistence
- Delay history
- Emergency history
- AI records
- Conversation history
- Script persistence
- Invitation persistence

Public event information is handled separately from private organizer data.

---

# 📅 Event Management

StageX AI supports complete event creation and management.

An event can contain:

- Event name
- Description
- Date
- Start time
- End time
- Venue
- Status
- Event code
- Shareable link
- Public visibility information
- Agenda
- Speakers
- Sessions
- Scripts
- Invitations
- Resources

The system supports:

- Same-day events
- Overnight events
- Multi-day events
- Custom start/end times
- Multiple events
- Multiple simultaneous live events

---

# 🔄 Event Lifecycle

Events follow an operational lifecycle.

```text
DRAFT
  ↓
SCHEDULED
  ↓
LIVE
  ↓
COMPLETED
  ↓
PAST
```

Deleted events are treated separately from completed events.

Completed events remain available in Past Events.

Deleted events should no longer resolve through their previous event code.

---

# 👥 Multiple Simultaneous Live Events

StageX separates:

```text
Selected Event
```

from:

```text
Live Event Status
```

This allows multiple events to operate independently.

Example:

```text
Event A → LIVE
Event B → LIVE
Event C → SCHEDULED
Event D → PAST
```

Selecting Event B does not deactivate Event A.

Every live operation remains event-specific.

---

# 📝 Agenda & Session Management

The Agenda page provides event-specific session management.

Organizers can:

- Create sessions
- Edit sessions
- Delete sessions
- Assign speakers
- Select session type
- Configure start time
- Configure end time
- Mark fixed-time sessions
- View chronological schedule
- Switch between events

The Agenda page includes an event selector so organizers can change the working event without returning to the Events page.

---

# 🎤 Speaker Management

The Speakers page provides event-specific speaker management.

Speaker information can include:

- Name
- Designation
- Organization
- Biography
- Event-specific information

Speakers can be assigned directly to agenda sessions.

The Speakers page also includes an event selector.

---

# ⏱️ Dynamic Delay Engine

## `lib/schedule-engine.ts`

The Dynamic Delay Engine is one of the core technical components of StageX AI.

Instead of treating an event as a static schedule, the engine evaluates how real-world timing changes affect the remaining agenda.

---

# ⏰ Planned vs Actual Timing

StageX preserves both planned and actual timing.

```text
Planned Start
Planned End

Actual Start
Actual End
```

This allows the application to calculate:

- Delay
- Overtime
- Early start
- Late start
- Schedule drift
- Session impact

---

# 🕐 Delay Propagation

Example:

```text
Original Schedule

09:00 → Opening
09:30 → Speaker 1
10:00 → Workshop
11:00 → Speaker 2
```

If Speaker 1 starts late:

```text
Speaker 1
09:30 → 09:45

Delay = 15 minutes
```

The schedule engine evaluates affected future sessions.

---

# 🧱 Buffer Absorption

If a schedule contains a natural buffer:

```text
Session A
09:00 → 09:30

Buffer
09:30 → 09:45

Session B
09:45 → 10:15
```

A delay can be absorbed by available buffer before shifting all future sessions.

---

# 📌 Fixed-Time Session Handling

Some sessions must happen at a specific time.

Example:

```text
Main Ceremony
11:00 AM
```

A fixed-time session should not silently move because of an earlier delay.

The organizer can explicitly decide how the conflict should be handled.

---

# 🕛 Overnight Scheduling

StageX does not rely on a fixed time window.

Example:

```text
11:30 PM → Session A
12:00 AM → Session B
12:30 AM → Session C
```

Full timestamps are used so chronological ordering remains correct across midnight.

---

# 📆 Multi-Day Scheduling

Multi-day schedules are supported using complete date/time values.

```text
Day 1
  ↓
Day 2
  ↓
Day 3
```

Sessions are compared using full timestamps instead of only clock time.

---

# 🎬 Live Stage Engine

## `lib/live-engine.ts`

Live Stage is the central operational control room of StageX AI.

It provides:

- Current session
- Upcoming session
- Countdown
- Elapsed time
- Overtime
- Session state
- Complete Session
- Skip Session
- Apply Delay
- Emergency Protocol
- Announcements
- AI Script Copilot
- Teleprompter
- Activity history
- Auto Start Session

---

# ⏲️ Live Countdown

The Live Stage calculates timing from actual timestamps.

It determines:

- Current session
- Upcoming session
- Remaining time
- Elapsed time
- Overtime
- Schedule drift

The timer architecture supports:

- Same-day events
- Overnight events
- Multi-day events

---

# ▶️ Auto Start Session

Live Stage includes an **Auto Start Session** option.

When enabled:

```text
Current Session Reaches End
            ↓
Next Eligible Session
            ↓
Automatically Starts
```

The behavior remains event-specific.

One event's Auto Start setting does not modify another event.

---

# 🚨 Emergency Protocol

StageX provides an Emergency Protocol for unexpected situations.

Possible scenarios include:

- Speaker delay
- Microphone issue
- Projector issue
- Technical problem
- Unexpected break
- Venue issue
- Stage interruption
- Custom emergency

Emergency operations are associated with the relevant event.

---

# 📢 Announcements

Organizers can create live announcements.

Examples include:

- Schedule changes
- Speaker delays
- Break announcements
- Technical updates
- Emergency information
- Audience instructions

Announcements can be stored as activity logs.

---

# 🤖 AI-Powered Stage Assistance

StageX uses event context to make AI assistance more relevant.

AI can work with:

- Event information
- Current session
- Upcoming session
- Speaker information
- Agenda
- Timing
- Delays
- Emergency context

This makes AI assistance part of the actual event workflow.

---

# 🧠 Global AI Copilot

The Global AI Copilot is designed to operate independently from the currently selected page.

It can assist with:

- Event planning
- Event creation
- Event lookup
- Event information
- Session creation
- Supported event updates
- Script generation
- Operational assistance
- AI-generated content

---

# ⚙️ Structured AI Action Architecture

StageX does not rely on the AI simply responding:

```text
"Done."
```

The intended action flow is:

```text
User Request
      ↓
AI Copilot
      ↓
Gemini
      ↓
Structured Action
      ↓
Validation
      ↓
Business Logic
      ↓
Zustand Store
      ↓
Firestore
      ↓
UI Update
```

Example:

```text
User:
"Add these sessions according to the timeline."

        ↓

AI identifies requested sessions

        ↓

Structured create_sessions action

        ↓

Validation

        ↓

Session creation logic

        ↓

Firestore persistence

        ↓

Agenda refresh
```

This architecture is important because an AI response should not claim an operation succeeded unless the underlying application action actually succeeds.

---

# 💬 AI Conversation History

The Global Copilot architecture supports persistent conversation history.

Conversation functionality includes:

- New Chat
- Previous conversations
- Saved conversations
- Auto-generated titles
- Rename
- Save / Unsave
- Delete

Deleting a conversation does not delete the underlying:

- Event
- Session
- Speaker
- Script
- Invitation
- Resource

---

# 📝 AI Script Generation

The Scripts workspace is event-specific.

Scripts can be generated for:

- Opening speech
- Welcome speech
- Speaker introduction
- Session transition
- Announcement
- Emergency filler
- Vote of thanks
- Closing speech
- Custom event requirements

---

# 📏 Long-Form Script Generation

StageX is designed to support scripts beyond short AI responses.

Generation can support:

- Short
- Medium
- Long
- Very Long
- Custom word count
- Custom duration
- Prompt-based generation
- File/source-based generation

Where provider limits require it, long generation can use controlled chunking.

The implementation should avoid:

- Infinite loops
- Duplicate chunks
- Unbounded retries
- Uncontrolled token usage

---

# 📂 File-Based Script Generation

Where supported, uploaded source material can be used as context for script generation.

The generated script should remain grounded in the supplied source material.

The system should avoid inventing unsupported:

- Speaker information
- Dates
- Venues
- Event details
- Facts

---

# 📚 Script Repository

The Scripts page provides an event-scoped repository.

Organizers can:

- Browse scripts
- Generate scripts
- Edit scripts
- Save scripts
- Reuse scripts
- Open scripts in Teleprompter
- Maintain script versions

---

# 📺 Teleprompter

StageX provides a dedicated Teleprompter experience.

Features include:

- Large readable text
- High contrast
- Auto-scroll
- Play / Pause
- Reset
- Reading controls
- Keyboard controls
- Stable script ID
- Direct URL support
- Refresh-safe loading
- Language-aware script metadata

The Teleprompter is designed for actual stage use.

---

# 🌍 Multilingual Support

StageX supports multilingual workflows where configured.

Language workflows can include:

- English
- Hindi
- Gujarati

Script language metadata is preserved for relevant workflows.

---

# 🔊 Voice / Script Reading

StageX can integrate speech functionality for script reading where the configured browser or provider supports it.

Potential workflows include:

- Generated scripts
- File-based scripts
- Long scripts
- Multilingual scripts
- Teleprompter content

Actual voice availability depends on the configured speech capability and browser/provider support.

---

# 🎨 Invitation Management

The Invitations page is event-specific.

Organizers can:

- Select event
- Generate invitation
- Edit invitation
- Preview invitation
- Save invitation
- Download invitation
- Print invitation
- Export invitation artwork

---

# 🖼️ AI Invitation Artwork

Where the configured image-generation provider supports it, StageX can generate invitation artwork/backgrounds.

The architecture separates AI artwork from exact event information.

```text
Event Data
    ↓
AI Artwork / Background
    ↓
StageX Invitation Renderer
    ↓
Exact Event Text
    ↓
Final Invitation
    ↓
PNG / PDF / Print
```

This prevents AI image generation from being responsible for critical event text.

Exact information such as:

- Event name
- Date
- Time
- Speaker
- Venue

should remain controlled by the application.

---

# 📁 Event Resources & File Sharing

Organizers can upload event resources.

Supported resource categories can include:

- Images
- PDF
- TXT
- MD
- CSV
- PPT
- PPTX
- DOC
- DOCX
- Video files

---

# ☁️ Supabase Storage Architecture

The private Supabase bucket is used for binary event resources.

Example storage structure:

```text
events/
└── {eventCode}/
    └── resources/
        └── {resourceId}/
            └── {safeFileName}
```

The upload workflow is:

```text
Organizer
    ↓
Select File
    ↓
Client Validation
    ↓
Organizer / Event Validation
    ↓
Signed Upload URL
    ↓
Supabase Private Bucket
    ↓
Firestore Resource Metadata
```

Firestore stores resource metadata rather than large binary files.

---

# 🔒 Resource Security

Resource handling includes:

- File-size validation
- MIME validation
- Executable-file blocking
- Sanitized filenames
- Server-generated storage paths
- Event ownership validation
- Signed upload URLs
- Signed download URLs
- Private storage bucket

The Supabase secret key remains server-side.

---

# 📥 Resource Download

Audience resource access follows:

```text
Audience
    ↓
Public Event
    ↓
Select Resource
    ↓
StageX Resource API
    ↓
Event / Resource Validation
    ↓
Supabase Signed URL
    ↓
Open / Download File
```

This allows resources to remain in private storage while still being accessible through the intended public-event workflow.

---

# 📺 YouTube / Live Media

StageX supports configured YouTube and live-video links.

External media remains separate from uploaded binary resources.

This allows organizers to publish:

- Live streams
- Recorded videos
- YouTube event content

without requiring all media to be uploaded into StageX storage.

---

# 🎟️ Event Code & Audience Access

Each shareable event can have an event access code.

The workflow is:

```text
Organizer
    ↓
Create Event
    ↓
Event Code
    ↓
Share Code / Link
    ↓
Audience
    ↓
Enter Code
    ↓
Exact Event Resolution
    ↓
Public Event View
```

The event-code lookup is intended to work across organizer accounts.

Example:

```text
Organizer Account A
        ↓
Creates Event
        ↓
Receives Event Code
        ↓
Shares Code
        ↓
Audience Account B
        ↓
Enters Code
        ↓
Views Public Event
```

Audience users do not receive organizer dashboard access.

---

# 🔗 Shareable Event Link

The audience can access an event using a shareable URL containing the event code.

```text
Shareable Event Link
        ↓
Audience Portal
        ↓
Read Event Code
        ↓
Resolve Exact Event
        ↓
Display Public Event
```

Refreshing the audience page should preserve the event lookup.

Invalid or deleted event codes should not resolve to an event.

---

# 👀 Audience Portal

The Audience Portal provides a public event-facing experience.

Depending on configured visibility, audience members can view:

- Event name
- Date
- Time
- Venue
- Agenda
- Speakers
- Invitation
- Published media
- YouTube/live links
- Public resources
- Other intentionally public information

Audience access is read-oriented.

---

# 👥 Audience Presence

StageX supports audience presence tracking.

Presence architecture can use:

- Audience session
- Heartbeat
- Last-seen timestamp
- Leaving state
- Stale-session handling

The objective is to represent active attendees using actual presence information rather than fake counters.

---

# 🗂️ Past Events

When an event is completed, it moves out of the active event workflow and remains available under Past Events.

Historical information can include:

- Event information
- Agenda
- Sessions
- Speakers
- Scripts
- Invitations
- Delays
- Emergencies
- Announcements
- Live-stage history
- Activity logs
- Timing information
- Event resources

This allows organizers to review what actually happened during an event.

---

# ⏱️ Historical Timing

Past events can preserve:

```text
Scheduled Start
Scheduled End

Actual Start
Actual End

Delay
Overtime
Schedule Drift
```

This allows the system to distinguish between:

- Early start
- On-time start
- Late start
- Overtime
- Skipped session

---

# 📊 Analytics

StageX analytics are designed to be derived from actual event activity.

Metrics can include:

- Total sessions
- Completed sessions
- Delayed sessions
- Total delay
- Maximum delay
- Emergency events
- AI generation activity
- Schedule deviation
- Activity history
- Event timing information

The system should not inject random values into analytics.

---

# 🧮 Event Health / Operational Analysis

Where configured, StageX can derive operational indicators from actual event data.

Potential inputs include:

```text
Session Completion
        +
Delay Frequency
        +
Overtime
        +
Emergency Count
        +
Schedule Deviation
        ↓
Operational Analysis
```

The purpose is to provide organizers with a data-based view of event execution.

---

# 🧾 Activity Logging

Operational actions can be recorded as activity logs.

Examples include:

- Session created
- Session started
- Session completed
- Session skipped
- Delay applied
- Emergency triggered
- Announcement created
- AI generation performed
- Event state changed

This provides a historical operational trail.

---

# 🔄 Main User Flow

```text
Login
  ↓
Dashboard
  ↓
Create / Select Event
  ↓
Add Speakers
  ↓
Build Agenda
  ↓
Prepare Scripts
  ↓
Create Invitation
  ↓
Upload Resources
  ↓
Open Live Stage
  ↓
Start Session
  ↓
Monitor Countdown
  ↓
Handle Delay / Overtime
  ↓
Handle Emergency if required
  ↓
Generate AI Script / Announcement
  ↓
Open Teleprompter
  ↓
Complete Sessions
  ↓
Complete Event
  ↓
Past Events
  ↓
Review Historical Data
```

---

# 🧠 AI Copilot Flow

```text
User
 ↓
Global AI Copilot
 ↓
Natural-language request
 ↓
Context / Intent Detection
 ↓
Event Lookup or Action Planning
 ↓
Structured AI Action
 ↓
Validation
 ↓
Business Logic
 ↓
Application State
 ↓
Firestore Persistence
 ↓
UI Update
```

---

# 📅 Agenda Workflow

```text
Select Event
      ↓
Agenda
      ↓
Create Session
      ↓
Select Session Type
      ↓
Assign Speaker
      ↓
Set Start Time
      ↓
Set End Time
      ↓
Optional Fixed-Time Anchor
      ↓
Save Session
      ↓
Firestore Persistence
      ↓
Agenda Refresh
```

---

# 🎬 Live Event Workflow

```text
Select Event
      ↓
Live Stage
      ↓
Current Session
      ↓
Countdown
      ↓
Session Starts
      ↓
Monitor Timing
      ↓
Delay / Overtime?
   ↙          ↘
 No            Yes
 ↓              ↓
Continue     Delay Engine
                ↓
        Recalculate Schedule
                ↓
          Activity Log
                ↓
          Continue Event
      ↓
Complete Session
      ↓
Next Session
```

---

# 🎟️ Audience Workflow

```text
Organizer Creates Event
        ↓
Event Code Generated
        ↓
Organizer Shares Code / Link
        ↓
Audience Opens Audience Portal
        ↓
Enter Event Code
        ↓
Exact Event Resolution
        ↓
View Public Event Information
        ↓
View Agenda / Speakers / Invitation
        ↓
Open Published Media
        ↓
Open / Download Public Resources
        ↓
Presence Tracking
```

---

# 🔒 Security Architecture

StageX follows several security principles.

## Authentication

Organizer access is protected through Firebase Authentication.

## User Isolation

Private Firestore data is scoped to the authenticated Firebase UID.

## Server-Side AI Credentials

Gemini credentials are not exposed to the frontend.

## Private File Storage

Supabase Storage remains private.

## Signed Resource Access

File uploads and downloads use controlled signed URLs.

## Event Ownership

Organizer operations are validated against the relevant event owner.

## Audience Isolation

Audience users receive only intended public event information.

## Exact Event Code Matching

Event-code lookup should use exact normalized matching rather than fuzzy matching.

---

# 🛡️ Product Principles

StageX AI follows these implementation principles:

- No random data
- No fake dashboard statistics
- No fake event records
- No dead buttons
- No unnecessary placeholder functionality
- Real user-created data should persist correctly
- Features should be connected end-to-end
- AI failures should not crash the application
- Firebase user data must remain isolated
- API keys must never be exposed in frontend code
- Existing working features should not be broken by new additions
- Destructive operations should require appropriate confirmation
- Firestore persistence should remain event-scoped and user-scoped
- Public event data should contain only intentionally public information
- Private resources should not become globally writable

---

# 🧪 Testing & Validation

StageX includes automated tests for important business logic and application workflows.

Testing areas include:

- Event creation
- Event lifecycle
- Session creation
- Speaker assignment
- Schedule calculations
- Delay calculations
- Live timing
- Overnight timing
- Multi-day timing
- Analytics
- Event-code resolution
- Audience access
- Resource upload workflows
- Resource download workflows
- Supabase Storage integration
- Security-related flows
- AI action handling
- Script persistence
- Teleprompter routing
- Authentication-related behavior

Before deployment, run:

```bash
npm test
npm run lint
npm run build
```

The exact test count may change as the project evolves.

---

# 🚀 Deployment

StageX AI is deployed using a GitHub → Vercel workflow.

```text
Developer
    ↓
Git
    ↓
GitHub Repository
    ↓
Vercel Deployment
    ↓
Production StageX AI
```

Production environment variables are configured separately from source code.

Private secrets must never be committed to GitHub.

---

# 🌐 Production Project

### Live Website

**https://stagexai.vercel.app**

### GitHub

**https://github.com/sarthaktala2805/Bit-N-Built**

---

# 🔑 Environment Variables

The application uses environment variables for external services.

Typical configuration includes:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

GEMINI_API_KEY_1=
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=

GEMINI_MODEL_PRIMARY=
GEMINI_MODEL_FALLBACK_1=
GEMINI_MODEL_FALLBACK_2=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

The exact variables required by the current implementation should be maintained in `.env.example`.

Never commit:

```text
.env
.env.local
.env.*.local
```

or any real secret.

---

# 🧰 Development Tools

The project was developed using tools including:

- Visual Studio Code
- Google Antigravity
- Git
- GitHub
- npm
- Next.js
- Firebase Console
- Supabase Dashboard
- Vercel
- Automated testing tools

---

# 📜 Product Documentation

The detailed product requirements and implementation decisions are documented in:

```text
STAGEX_AI_PRD.md
```

The PRD acts as the primary product specification and implementation source of truth.

---

# 🏆 Innovation

StageX AI combines multiple operational layers into one platform:

- Event Planning
- Speaker Management
- Agenda Management
- Dynamic Timing
- Live Stage Control
- Delay Propagation
- Emergency Handling
- AI Stage Assistance
- AI Copilot
- Script Generation
- Teleprompter
- Invitation Management
- AI Invitation Artwork
- Audience Access
- Event Code Sharing
- Resource Management
- Cloud Persistence
- Historical Event Operations
- Audience Presence
- Analytics

The central idea is:

> **Plan the event. Perform it live. Adapt when reality changes.**

---

# 🌍 Real-World Use Cases

StageX AI can be applied to:

## College Events

- Technical festivals
- Cultural festivals
- Annual functions
- Freshers events
- Farewell events

## Hackathons

- Opening ceremony
- Speaker sessions
- Mentorship sessions
- Judging
- Closing ceremony

## Workshops

- Multiple instructors
- Session transitions
- Break management
- Live announcements

## Conferences

- Keynote speakers
- Panel discussions
- Session transitions
- Timing management

## Competitions

- Multiple rounds
- Judges
- Participant announcements
- Stage coordination

---

# 📈 Impact

StageX AI is designed to reduce the operational burden on organizers and anchors by providing one system for:

```text
Planning
   +
Live Monitoring
   +
Schedule Adaptation
   +
AI Assistance
   +
Historical Analysis
```

Instead of using multiple disconnected tools for:

- Agenda
- Speakers
- Scripts
- Timing
- Announcements
- Invitations
- Files
- Audience information

StageX AI brings these workflows into one event-centric platform.

---

# 🔮 Future Scope

Potential future improvements include:

- Advanced AI voice orchestration
- More dedicated Indian-language voices
- Advanced stage hardware integrations
- Microphone and AV system integration
- Real-time stage display integration
- QR-based audience check-in
- Advanced audience analytics
- More media integrations
- Calendar integrations
- Email/SMS/WhatsApp notifications
- Advanced event templates
- Organization-level administration
- Multi-organization support
- Advanced collaboration
- Event replay and timeline visualization
- More AI-powered event automation

Future scope should be implemented only when the corresponding service, infrastructure, and security requirements are properly configured.

---

# 🧭 Product Vision

StageX AI is designed as more than a digital event schedule.

The long-term vision is an intelligent operating layer for live events.

Instead of simply displaying:

```text
What is scheduled?
```

StageX aims to help answer:

```text
What is happening now?

What happens next?

How much time has been lost?

Which sessions are affected?

What should the organizer do?

What should the anchor say?

Is an emergency action required?

What actually happened during the event?
```

---

# 🏁 Complete Product Flow

```text
                         STAGEX AI
                             │
                             ▼
                         Organizer
                             │
             ┌───────────────┼────────────────┐
             │               │                │
             ▼               ▼                ▼
          Events          Speakers         Agenda
             │               │                │
             └───────────────┼────────────────┘
                             │
                             ▼
                        Event Preparation
                             │
              ┌──────────────┼───────────────┐
              │              │               │
              ▼              ▼               ▼
           Scripts       Invitation       Resources
              │              │               │
              └──────────────┼───────────────┘
                             │
                             ▼
                         Live Stage
                             │
             ┌───────────────┼────────────────┐
             │               │                │
             ▼               ▼                ▼
          Timing          Delays          Emergency
             │               │                │
             └───────────────┼────────────────┘
                             │
                             ▼
                       AI Assistance
                             │
              ┌──────────────┼───────────────┐
              │              │               │
              ▼              ▼               ▼
          Copilot         Scripts       Teleprompter
              │              │               │
              └──────────────┼───────────────┘
                             │
                             ▼
                         Event End
                             │
                             ▼
                       Past Events
                             │
                             ▼
                          Analytics
```

---

# 📊 Implemented vs Future

StageX documentation distinguishes between functionality implemented in the application and longer-term future scope.

## Core Platform

Implemented platform areas include:

- Event management
- Agenda management
- Speaker management
- Live stage operations
- Timing logic
- Delay management
- Emergency management
- AI assistance
- Scripts
- Teleprompter
- Invitations
- Firebase Authentication
- Firestore persistence
- Audience workflows
- Event-code access
- Supabase resource storage
- Past event handling
- Analytics

## Future Scope

Future enhancements may include:

- Advanced voice providers
- Additional integrations
- Advanced hardware integration
- Larger organization-level collaboration
- Advanced audience analytics
- More automation

Only functionality actually available in the deployed build should be presented as production functionality during demonstrations.

---

# 📸 Suggested Demo Screenshots

For presentations and documentation, useful screenshots include:

1. Login / Authentication
2. Dashboard
3. Event Management
4. Agenda
5. Speakers
6. Live Stage
7. Dynamic Delay / Emergency
8. AI Copilot
9. Scripts
10. Teleprompter
11. Invitations
12. Audience Portal
13. Past Events
14. Analytics

The final presentation should use only screenshots from the actual working application.

---

# 🎥 Suggested Demo Video Flow

A short demonstration can follow:

```text
1. Login
      ↓
2. Create Event
      ↓
3. Add Speakers
      ↓
4. Create Agenda
      ↓
5. Generate Script
      ↓
6. Open Teleprompter
      ↓
7. Open Live Stage
      ↓
8. Start Session
      ↓
9. Apply Delay
      ↓
10. Show Updated Timing
      ↓
11. Trigger Emergency
      ↓
12. Use AI Assistance
      ↓
13. Complete Event
      ↓
14. Open Past Events
      ↓
15. Show Historical Data
      ↓
16. Audience Event-Code Access
```

---

# 🏆 Hackathon Information

**Event:** Bit N Build '26 — Gujarat Round

**Problem Statement:** PS-5

**Problem Statement Title:** Smart Anchor & Stage Flow Management System

**Team:** NeuroX

**Project:** StageX AI

**Institution:** L.D. College of Engineering (LDCE)

---

# 👥 Team

## NeuroX

**Product:** StageX AI

**Tagline:** Plan. Perform. Adapt.

**Powered by NeuroX**

**Institution:** L.D. College of Engineering (LDCE)

---

# 🌐 Project Links

### Live Website

**https://stagexai.vercel.app**

### GitHub Repository

**https://github.com/sarthaktala2805/Bit-N-Built**

---

# 📌 Important Notes

- StageX AI is designed around actual user-created event data.
- The platform avoids intentionally seeded random dashboard statistics.
- AI functionality depends on correctly configured Gemini credentials and supported models.
- Invitation artwork generation depends on the configured image-generation provider.
- Supabase Storage is used as the private binary storage layer.
- Supabase requires the appropriate environment configuration for resource upload/download workflows.
- Browser support can affect optional capabilities such as Web Speech features.
- Production feature availability depends on the environment variables and external services configured for the deployment.
- The exact test count may change as the project evolves.
- The README should describe the final verified implementation rather than unimplemented future functionality.

---

# 📄 Project Documentation

The complete implementation and product specification is maintained in:

```text
STAGEX_AI_PRD.md
```

The project documentation covers:

- Product requirements
- Architecture
- Data models
- Event engine
- Live engine
- Delay engine
- Emergency workflow
- AI architecture
- Firestore persistence
- Authentication
- Resource storage
- Scripts
- Teleprompter
- Invitations
- Audience workflows
- Security
- Testing
- Deployment

---

<p align="center">
  <strong>StageX AI</strong><br>
  Plan. Perform. Adapt.<br>
  Powered by NeuroX
</p>

<p align="center">
  <strong>Bit N Build '26 — Gujarat Round</strong><br>
  PS-5: Smart Anchor & Stage Flow Management System
</p>
