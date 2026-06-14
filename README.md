# Xeno Mini CRM Monorepo

Intelligent, AI-native Mini CRM for retail & D2C brands, featuring automated audience segmentation, personalized messaging, real-time message delivery simulation, and campaign analytics feedback loops.

---

## Technical Architecture

```mermaid
graph TD
    User[Marketer/User Interface] -->|1. Plain Text Intent| Frontend[Vite React SPA]
    Frontend -->|2. POST /segments/preview| Backend[CRM Backend Express]
    Backend -->|3. Generate SQL filter| Gemini[Gemini Flash]
    Gemini -->|4. Return HAVING clause| Backend
    Backend -->|5. Run query on DB| DB[(Supabase Postgres)]
    
    Frontend -->|6. POST /campaigns/launch| Backend
    Backend -->|7. Personalize copy in batches| Gemini
    Backend -->|8. POST /send| Simulator[Channel Simulator Stub]
    
    Simulator -->|9. Accept queue 200| Backend
    Simulator -->|10. Schedule async callbacks| Simulator
    Simulator -->|11. POST /receipts| Backend
    Backend -->|12. Validate & save log| DB
    Backend -->|13. Broadcast state updates| Frontend
    
    Simulator -->|14. Complete run POST| Backend
    Backend -->|15. Compile final stats & debrief| Gemini
    Backend -->|16. Broadcast completed| Frontend
```

The system comprises three primary layers:
1. **Frontend (`apps/frontend`):** A single-page application built on Vite, React, and TypeScript. Leverages Recharts for interactive lifecycle and funnel analytics, connects to the backend WebSocket stream for real-time campaign counts, and enforces styling constraints from `theme.ts`.
2. **CRM Backend (`apps/crm-backend`):** An Express server managing REST endpoints, PostgreSQL connections, WebSocket channels, and external client requests.
3. **Channel Simulator (`apps/channel-stub`):** A separate Node.js service simulating message pipelines (WhatsApp, SMS, Email, RCS) with custom delays, probability rollbacks (open rates, click rates, conversion rates), and network retries.

---

## Core Features

- 🎯 **AI-Powered Natural Language Segmentation**: Marketers type intent in plain English (e.g., *"customers who haven't ordered in 60 days"*), and the Gemini LLM compiles it into safe SQL filters instantly.
- 🔍 **HAVING Filter Transparency**: Monospace SQL disclosure blocks render directly in the UI, enabling developers and administrators to audit AI logic.
- ✍️ **Bulk Copy Personalization**: Generates individual message copy using real customer history (e.g., name, top beverage purchase, order volume) dynamically via batched LLM instructions.
- 📡 **Real-Time WebSocket Campaign Tracking**: Renders status changes (Sent, Delivered, Opened, Clicked, Converted, Failed) in a live feed dashboard with counter increments.
- 🤖 **Post-Campaign AI Debriefs**: Evaluates run performance and outputs recommendations, top conversion hours, and best-performing channels.
- 🔁 **One-Click Retargeting Cycles**: A "Launch follow-up campaign" action pre-fills target inputs to isolate cohorts who clicked but did not purchase.
- 📊 **Lifecycle Funnels**: Visualizes customer health status indicators (Active, At-Risk, Lapsing, Churned) using SVG ring badges.

---

## Installation Guide

### 1. Database Setup (Supabase)
Ensure you have a PostgreSQL database available on Supabase:
1. Create a project on [Supabase](https://supabase.com/).
2. Navigate to your project settings to obtain the **Direct connection URI**.
   - Example: `postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres`
   - *Note: If your database password contains special characters, ensure you URL encode them (e.g., replace `@` with `%40`).*

### 2. Workspace Installation
Install all monorepo dependencies from the project root:
```bash
npm install
```

### 3. Environment Variables Configuration

Create and configure `.env` files for the backend, channel stub, and frontend.

#### Backend Env (`apps/crm-backend/.env`)
```ini
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
GEMINI_API_KEY=AQ.Ab8RN6J...
CHANNEL_STUB_URL=http://localhost:4001
PORT=4000
NODE_ENV=development
```

#### Channel Stub Env (`apps/channel-stub/.env`)
```ini
CRM_RECEIPT_URL=http://localhost:4000/api/receipts
PORT=4001
NODE_ENV=development
```

#### Frontend Env (`apps/frontend/.env`)
```ini
VITE_CRM_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

### 4. Database Seeding
Execute the database initialization and seed script. This drops any old campaign data and builds the tables before inserting 60 customers with transaction logs:
```bash
npm run seed
```

---

## Run and Use Guide

### 1. Run Services Locally

Start the three services using separate terminal windows from the monorepo root:

*   **Terminal 1 (CRM Backend)**:
    ```bash
    npm run dev:backend
    ```
*   **Terminal 2 (Channel Simulator)**:
    ```bash
    npm run dev:stub
    ```
*   **Terminal 3 (Vite React Frontend)**:
    ```bash
    npm run dev:frontend
    ```

Navigate to `http://localhost:5173` to open the application.

### 2. Operating the CRM (Step-by-Step)

1.  **Audience Targetting**: On the Dashboard, write target descriptions in the input bar (e.g., *"high value customers in Delhi"* or *"shoppers at risk of churning"*) and click **Generate segment**.
2.  **Inspect SQL Preview**: Check the generated HAVING query inside the collapsible **AI-generated SQL query filter** pill to inspect the query translation.
3.  **Create Campaign**: Supply a **Campaign Name**, outline a **Campaign Goal** (which provides copy styling context for personalization), select a **Channel** (WhatsApp, SMS, Email, RCS), and click **Create campaign**.
4.  **Inspect Copies**: Wait for the preview cards to generate. Review the 5 sample speech bubbles personalized with custom customer purchases.
5.  **Fire Campaign**: Click **Launch campaign** to send messages into the channel stub queue.
6.  **Watch Live Tracker**: Monitor the progress bar, visual stat counters, and live callback feed update in real-time as the simulation callbacks resolve.
7.  **Review AI Debrief**: Once all messages reach a terminal state, read the AI-written summary card at the bottom.
8.  **Launch Follow-Up**: Click **Launch follow-up campaign** to pre-fill the search bar with retargeting parameters for subscribers who opened but did not buy.

---

## Explicit Tradeoffs

| Decision | What I did | What I'd do at scale |
|---|---|---|
| **Async queue** | `setTimeout` queues in channel simulator memory. | Production-grade brokers (e.g., BullMQ, RabbitMQ, SQS) with dead-letter queueing. |
| **Database** | Direct PG pool connection to a single Supabase cloud instance. | Connection pooling (PgBouncer), read replicas, and write-heavy partitioning. |
| **AI calls** | Parallel API batches of 30 items per request to Gemini Flash. | Background worker queue, token usage rate-limit throttling, and query caching. |
| **WebSocket** | Standard `ws` package attached to the Express HTTP handler. | Scalable standalone socket instances (e.g. Socket.io, AWS API Gateway WebSockets, Redis Adapter). |
| **Authentication** | Open development endpoints without routing guards. | Auth0, JWT authorization tokens, and row-level security policy mappings. |
| **Message batching** | Static batching chunks of 30. | Dynamic token-length aware batching matching models' context constraints. |

---

## AI Workflow

This workspace was scaffolded and constructed end-to-end using **Antigravity**, an agentic AI coding companion designed by Google DeepMind.
- Core schema designs, router states, and component bindings were created step-by-step.
- AI interactions use the Google Gen AI SDK (`@google/genai`) to run target analysis and personalized marketing generation on **Gemini Flash** (`gemini-flash-latest`).
- Progress was tracked using a `task.md` checklist at each milestone, followed by atomic Git commits to maintain an active audit history.
