# Xeno Autopilot

> **Tagline:** Tell us the business outcome you want. The AI figures out the campaign.

An intelligent, AI-native autonomous marketing strategist and campaign execution platform for retail and D2C brands. Instead of manually carving out customer segments, drafting copy variations, and scheduling channels, marketers define high-level business goals. The AI handles the entire lifecycle: planning target audiences, recommending personalized A/B offers, executing campaigns across multiple simulated channels, dynamically attributing revenue, and maintaining digital twin profiles.

---

## Traditional CRM vs. Xeno Autopilot

| Aspect | Traditional CRM | Xeno Autopilot |
| :--- | :--- | :--- |
| **Workflow Initiation** | Marketer manually builds SQL queries, selects list criteria, and drafts copy. | Marketer enters a high-level business goal (e.g., *"Win back churned subscription customers"*). |
| **Audience Discovery** | Static queries or manual guesses on filters. | **AI Opportunity Discovery** scans purchase behavior, affinity combinations, and churn risk to suggest high-impact segments. |
| **Strategy & Content** | Manual copy creation; static templates; manual A/B split setups. | **AI Campaign Planner** recommends target reaches, custom offers, ideal channels, and generates personalized A/B content. |
| **Customer Insights** | Flat database records; list of past transactions. | **Customer Digital Twin** compiles behavior summaries dynamically, supported by **Next Best Action** recommendations. |
| **Analytics & Success** | Measured by click-rates or open-rates (vanity metrics). | **Revenue Attribution** directly links purchases to campaign interactions, displaying exact ROI and campaign-generated revenue. |

---

## Technical Architecture

The platform is structured as a TypeScript monorepo with three core systems:

```mermaid
graph TD
    User[Marketer Interface] -->|1. Business Goal Prompt / NL Segment| Frontend[Vite React SPA]
    Frontend -->|2. POST /campaigns/plan | Backend[CRM Backend Express]
    Backend -->|3. Run AI Planner / Opp Discovery| Gemini[Gemini Flash API]
    Gemini -->|4. Structured Campaign Plan / SQL| Backend
    Backend -->|5. Validate & Execute SQL| DB[(Supabase Postgres)]
    
    Frontend -->|6. POST /campaigns/launch| Backend
    Backend -->|7. Split A/B Cohorts & Personalize| Gemini
    Backend -->|8. POST /send| Simulator[Channel Simulator Stub]
    
    Simulator -->|9. Enqueue & Dispatch Async Mock Events| Simulator
    Simulator -->|10. POST /receipts| Backend
    Backend -->|11. Attribute Revenue & Save Log| DB
    Backend -->|12. Broadcast Real-time Counters| Frontend
    
    Simulator -->|13. Complete Run POST| Backend
    Backend -->|14. Post-Campaign AI Debrief| Gemini
    Backend -->|15. Push Final Insights| Frontend
```

1. **Frontend ([frontend](file:///Users/harshil/Desktop/xeno_mini/apps/frontend)):** A responsive React SPA built with Vite, TypeScript, and TailwindCSS (configured via [theme.ts](file:///Users/harshil/Desktop/xeno_mini/apps/frontend/src/theme.ts)). Utilizes Recharts for funnel and lifecycle visualization, WebSockets for real-time campaign simulation status, and interactive timelines for the autonomous planning phase.
2. **CRM Backend ([crm-backend](file:///Users/harshil/Desktop/xeno_mini/apps/crm-backend)):** An Express server exposing REST APIs for campaigns, customers, and segments, establishing PG connection pools to Supabase Postgres, and handling real-time WebSocket state distribution.
3. **Channel Simulator ([channel-stub](file:///Users/harshil/Desktop/xeno_mini/apps/channel-stub)):** A simulation microservice modeling message delivery (WhatsApp, SMS, Email, RCS) with custom delays, fallback states, and mock conversion/revenue receipts sent back to the CRM backend.

---

## Core Feature Highlights

### 🚀 Autonomous Strategist & Planner
- 🤖 **Goal-Based Autonomous Agent (Phase 16):** Marketers type an objective. A visual timeline ([Dashboard.tsx](file:///Users/harshil/Desktop/xeno_mini/apps/frontend/src/pages/Dashboard.tsx)) animates the planning steps (Analyzing base, Generating segments, Estimating conversions, etc.) to deliver an end-to-end plan.
- 🎯 **AI Campaign Planner (Phase 8):** Translates high-level goals into concrete campaign plans using the [campaignPlanner.ts](file:///Users/harshil/Desktop/xeno_mini/apps/crm-backend/src/services/campaignPlanner.ts) service, returning audience query, expected reach, target conversions, suggested offer, channel, and timing.
- 🔍 **AI Opportunity Discovery (Phase 12):** Scans the database proactively in [opportunityDiscovery.ts](file:///Users/harshil/Desktop/xeno_mini/apps/crm-backend/src/services/opportunityDiscovery.ts) to find unexploited revenue pools (e.g. Cold Brew fans who haven't ordered recently), presenting opportunities with expected revenue projection.

### 🧪 Experimentation & Personalization
- ⚖️ **AI Experiment Generator / A/B Splits (Phase 15):** Generates two different offer ideas (e.g., Variant A: *15% Discount* vs. Variant B: *Free Coffee Upgrade*), divides the segment 50/50, personalizes separate messages for each subset in [campaignRunner.ts](file:///Users/harshil/Desktop/xeno_mini/apps/crm-backend/src/services/campaignRunner.ts), and tracks which variant wins.
- ✍️ **Bulk Copy Personalization:** Automatically crafts individual custom copy matching each user's flavor profile, name, and favorite drink.
- 📡 **Real-Time WebSocket Campaign Tracking:** Tracks message lifecycle states (Sent, Delivered, Opened, Clicked, Converted, Failed) in a live dashboard view.

### 📊 Financial & Loyalty Intelligence
- 💰 **Revenue Attribution & ROI (Phase 13):** Captures mock purchase conversions from the receipt webhook inside [receipts.ts](file:///Users/harshil/Desktop/xeno_mini/apps/crm-backend/src/routes/receipts.ts). Calculates and attributes exact campaign revenues and ROI metrics, rendering a **Top Revenue Campaigns** leaderboard on the dashboard.
- 🏆 **Loyalty Intelligence (Phase 9):** Computes customer loyalty tiers (Bronze, Silver, Gold, Platinum) dynamically from lifetime spend thresholds. AI automatically understands loyalty queries (e.g., *"our platinum customers"*), converting them to SQL.
- 🧬 **Customer Digital Twin (Phase 14):** Generates custom summaries for customers based on behavior trends, channel preference, and purchase cycles via [customerTwin.ts](file:///Users/harshil/Desktop/xeno_mini/apps/crm-backend/src/services/customerTwin.ts), cached in Supabase (`customer_twins` table) for 24 hours to maximize performance.
- 💡 **Next Best Action Engine (Phase 10):** Automatically calculates recommendations and confidence ratings (e.g., *"Send Subscription Offer (Confidence: 87%)"* due to past order gaps) in [nextBestAction.ts](file:///Users/harshil/Desktop/xeno_mini/apps/crm-backend/src/services/nextBestAction.ts).
- 🔓 **Explainable AI (Phase 11):** Integrates transparent annotations explaining why specific segments, channels, or campaign targets were chosen by the AI.

---

## Installation Guide

### 1. Database Setup (Supabase)
Ensure you have a PostgreSQL instance running. We recommend Supabase:
1. Log in or create a project on [Supabase](https://supabase.com/).
2. Retrieve your **Direct Connection String (URI)** from your database settings.
   - Example: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres`
   - *Ensure special characters in your password are URL-encoded.*

### 2. Workspace Installation
Clone the repository and install dependencies at the monorepo root:
```bash
npm install
```

### 3. Environment Variables Configuration
Set up local `.env` files in each service directory.

#### Backend Env (`apps/crm-backend/.env`)
Create [crm-backend/.env](file:///Users/harshil/Desktop/xeno_mini/apps/crm-backend/.env):
```ini
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
GEMINI_API_KEY=AQ.Ab8RN6JO3k...
CHANNEL_STUB_URL=http://localhost:4001
PORT=4000
NODE_ENV=development
```

#### Channel Stub Env (`apps/channel-stub/.env`)
Create [channel-stub/.env](file:///Users/harshil/Desktop/xeno_mini/apps/channel-stub/.env):
```ini
CRM_RECEIPT_URL=http://localhost:4000/api/receipts
PORT=4001
NODE_ENV=development
```

#### Frontend Env (`apps/frontend/.env`)
Create [frontend/.env](file:///Users/harshil/Desktop/xeno_mini/apps/frontend/.env):
```ini
VITE_CRM_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

### 4. Database Schema Seeding
Initialize the database tables and populate the environment with 60 mock customers and 263 mock purchases to feed the AI services. Run this from the root directory:
```bash
npm run seed
```
This runs the SQL statements in [schema.sql](file:///Users/harshil/Desktop/xeno_mini/apps/crm-backend/src/db/schema.sql) and runs [seed.ts](file:///Users/harshil/Desktop/xeno_mini/apps/crm-backend/src/db/seed.ts).

---

## Run and Use Guide

### 1. Start Development Servers
Run each command in a separate terminal panel from the root of the workspace:

- **Terminal 1: CRM Backend**
  ```bash
  npm run dev:backend
  ```
- **Terminal 2: Channel Simulator**
  ```bash
  npm run dev:stub
  ```
- **Terminal 3: Vite React Frontend**
  ```bash
  npm run dev:frontend
  ```

Open your browser to `http://localhost:5173`.

### 2. Standard Walkthrough
1. **Explore AI Opportunities:** Scroll to the **AI Opportunities** card on the dashboard. Click **Find Opportunities** to trigger the AI scanner. Review recommendations, and click **Launch Campaign** on a card to auto-populate the planner.
2. **Run Goal-Based Planning:** In the **Xeno Autopilot Planner** input box, write a high-level outcome (e.g. *"Boost repeat sales for espresso lovers"*). Click **Plan Campaign**. Watch the animated planning timeline resolve in real-time.
3. **Review Recommendation & A/B Configuration:** Inspect the generated plan detailing target segments, estimated conversions, predicted revenue, and recommended channels. Toggle **Generate A/B Test** to allow the AI to draft copy variants (Variant A vs. Variant B).
4. **Launch & Watch Logs:** Hit **Launch Campaign**. The screen will transition to the Live Tracker. Watch as messages stream through the channel stub, tracking real-time status transitions.
5. **Simulate Purchases (Revenue Attribution):** Make orders in the app or allow the simulator to send back receipts. View the **Revenue Attribution** statistics increment on the Campaigns page. Check A/B comparison bars to see which variant drove the most conversions.
6. **Inspect Customer Twins & NBA:** Go to the Customers page. Expand any customer drawer to view their dynamic **Loyalty Badge (Bronze/Silver/Gold/Platinum)**, **Customer Digital Twin Summary** (cached 24h), and **Next Best Action recommendation** with AI confidence ratings.

---

## Explicit Tradeoffs

| Decision | What I did | What I'd do at scale |
| :--- | :--- | :--- |
| **Async queue** | `setTimeout` queues in channel simulator memory. | Production-grade message brokers (e.g., BullMQ, SQS, RabbitMQ) supporting durable routing keys and DLQs. |
| **Database** | Direct PG pool connection to a single Supabase cloud instance. | PgBouncer for pooling, read replicas, database partitioning on massive event logs. |
| **AI calls** | Parallel API batches of 30 items per request to Gemini Flash. | Background worker queue, token usage rate-limit throttling, query-level caching, and fallback model groups. |
| **WebSocket** | Standard `ws` package attached to the Express HTTP handler. | Scalable standalone socket clusters (e.g., AWS API Gateway WebSockets, Socket.io with Redis adapter). |
| **Authentication** | Open development endpoints without routing guards. | Auth0, JWT authorization tokens, and row-level security policy mappings in Postgres. |
| **A/B Test Splits** | Split target segments in memory 50/50 inside [campaignRunner.ts](file:///Users/harshil/Desktop/xeno_mini/apps/crm-backend/src/services/campaignRunner.ts). | Dynamic server-side bucket allocation and feature-flag software integration (e.g., LaunchDarkly). |
| **Digital Twin Caching** | Cached summaries written to a database table (`customer_twins`) with a 24-hour expiration check. | Distributed key-value cache layer (Redis or Memcached) with automatic expiration and event-driven invalidation. |
| **Revenue Attribution** | Calculated by matching user IDs in receipt webhooks directly to the latest active campaign. | Multi-touch attribution models (first-touch, linear, time-decay) utilizing user session tracking and UTM parameters. |

---

## AI Workflow

This workspace was fully scaffolded, refactored, and tested end-to-end using **Antigravity**, an agentic AI coding companion designed by Google DeepMind.
- All AI services utilize the Google Gen AI SDK (`@google/genai`) connecting to the fast and efficient **Gemini Flash** (`gemini-flash-latest`).
- Development progress was tracked using local checklists ([task.md](file:///Users/harshil/.gemini/antigravity-ide/brain/e072da29-d9b4-4e25-a83e-52fcd3e79d64/task.md)) and verified via atomic git history snapshots.
