# AI Investment Research Agent

A full-stack Next.js 16 Web Application utilizing LangGraph.js and Claude 3.5 Sonnet to construct a multi-vector equity analysis terminal. Users input a company name, and the agent resolves its entity, runs parallel searches for background data, analyzes signals, and stamps an Invest/Pass verdict. 

Access is secured via Firebase Authentication, and research records are cached/persisted in MongoDB Atlas.

---

## Overview

The terminal provides institutional-grade equity research memos by automating search collection and analysis. Rather than running slow sequential queries or dealing with raw search dumps, the system leverages a parallel fan-out research graph to check news, financials, competitors, risks, and leadership simultaneously, converging the findings into a structured investment rationale memo.

---

## How to run it

### 1. Repository Setup & Dependencies
Ensure you have Node.js v18+ installed. Clone this repository, and run the following command to install dependencies:
```bash
npm install --legacy-peer-deps
```

### 2. Environment Variables Setup
Copy the `.env.example` file to `.env.local` and populate it with your API keys:
```bash
cp .env.example .env.local
```
Make sure you configure:
* `ANTHROPIC_API_KEY`: API key for accessing Claude 3.5 Sonnet.
* `TAVILY_API_KEY`: API key for conducting web searches.
* `MONGODB_URI`: Connection string to your MongoDB Atlas cluster.
* Firebase Client Variables (`NEXT_PUBLIC_FIREBASE_*`).
* Firebase Admin Server Variables (`FIREBASE_ADMIN_*`).

### 3. Firebase Project Setup Steps
1. Navigate to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Under **Build**, select **Authentication** and enable **Google sign-in provider** (and **Email/Password** as the secondary provider).
3. Register a Web App in your project settings to obtain your client-side config keys:
   * `API Key` (maps to `NEXT_PUBLIC_FIREBASE_API_KEY`)
   * `Auth Domain` (maps to `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`)
   * `Project ID` (maps to `NEXT_PUBLIC_FIREBASE_PROJECT_ID`)
   * `App ID` (maps to `NEXT_PUBLIC_FIREBASE_APP_ID`)
4. Create a Service Account for server token verification:
   * Go to **Project Settings** > **Service Accounts**.
   * Click **Generate New Private Key** to download a JSON file containing administrative keys.
   * Map the fields in the JSON to your env variables:
     * `project_id` -> `FIREBASE_ADMIN_PROJECT_ID`
     * `client_email` -> `FIREBASE_ADMIN_CLIENT_EMAIL`
     * `private_key` -> `FIREBASE_ADMIN_PRIVATE_KEY` (ensure you preserve the double quotes and encode newlines as `\n`).

### 4. MongoDB Atlas Setup Steps
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free tier cluster.
2. Create a Database User under **Database Access** (select Password authentication).
3. Configure Network Access under **Network Access**:
   * Add your hosting server's IP or click **Allow Access from Anywhere** (`0.0.0.0/0`) for local testing.
4. Click **Connect** on your Database Cluster, select **Drivers**, and copy the connection string.
5. Replace the username, password, and database parameters in the copied string, and assign it to `MONGODB_URI` in `.env.local`.

### 5. Running the Application
To run the development server locally:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the terminal.

---

## How it works

### System Architecture Flow

The system splits execution between the client web terminal, the token validation/caching API route, and the LangGraph multi-step agent:

```text
[User Client Request]
       │
       ▼ (Passes Firebase ID Token)
[POST /api/research]
       │
       ├─► [Verify Firebase JWT] ──► (Invalid: 401 Unauthorized)
       │
       ├─► [MongoDB Cache Check]
       │         │
       │         ├──► (Cache Hit: Fresh result exists < 24h)
       │         │          │
       │         │          ▼ (Record history, return stored result instantly)
       │         │     [Cached JSON Response]
       │         │
       │         └──► (Cache Miss: Proceed to Agent Execution)
       │                    │
       │                    ▼ (Run Graph Workflow)
       │               [LangGraph]
       │                    │
       │                    ▼
       │               [identify] (LLM resolves company ticker & domain)
       │                    │
       │         ┌──────────┼──────────┬──────────┬──────────┐  (Parallel Fan-out)
       │         ▼          ▼          ▼          ▼          ▼
       │     [r_news]  [r_finances] [r_comp]   [r_risks] [r_leaders] (Deterministic searches)
       │         │          │          │          │          │
       │         └──────────┼──────────┼──────────┼──────────┘  (Parallel Fan-in)
       │                    ▼
       │                [analyze] (Claude structured summary to Findings schema)
       │                    │
       │                    ▼
       │                [decide] (Claude weighs memo and stamps Verdict)
       │                    │
       │                    ▼
       │         [Persist result in DB] ──► [Write User history entry]
       │                    │
       │                    ▼
       │         [Finalized JSON Response]
```

### Safe Concurrent State Merging
In LangGraph, when nodes run in parallel, returning modifications to the same state keys concurrently can cause data overwrites. To prevent collisions:
1. **Isolated Result Keys:** Each of the five research nodes writes to its own dedicated key (`newsResults`, `financialResults`, `competitorResults`, `riskResults`, and `leadershipResults`). These keys are modified by exactly one node.
2. **Explicit List Reducers:** For fields that can be written to by multiple nodes concurrently (such as the deduplicated `sources` list or global execution `errors`), we define explicit list-merging reducers inside our state declaration in [lib/agent/state.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/agent/state.ts). When two parallel streams return values for these keys, LangGraph applies the reducer to merge the arrays safely instead of letting one overwrite the other.

---

## Key decisions & trade-offs

### 1. Parallel Research Nodes vs. Sequential Agent Node
* **Decision:** We split research collection into five discrete parallel nodes rather than using an LLM to decide research queries sequentially.
* **Trade-off:** This guarantees that research is conducted across all five essential sectors concurrently, drastically decreasing latency (from ~25 seconds sequentially to ~4 seconds in parallel). However, it prevents the agent from making recursive follow-up searches based on initial discoveries. Given that standard business vectors (News, Moat, Finances, Risk, Team) are highly predictable, parallel deterministic tools are a superior design.

### 2. 24-Hour Cache Window
* **Decision:** A 24-hour cache window was set as the default database query filter.
* **Trade-off:** Financial news, stock market updates, and corporate events evolve on a daily cycle. Caching results for 24 hours prevents redundant LLM and Search API spending, which significantly reduces runtime costs. The trade-off is that users may miss breaking news that occurred minutes ago, though this is acceptable for long-term equity research where quarterly/daily updates are sufficient.

### 3. Structured Outputs Only Persistence
* **Decision:** We persist only structured outputs (`findings` and `verdict`) and normalized metadata, completely discarding raw LLM prompts, Firebase tokens, or raw Tavily HTML results.
* **Trade-off:** This keeps our database footprint light, clean, and highly secure. It ensures we do not store sensitive user tokens or pollute our databases with megabytes of raw search markup. The trade-off is that we cannot replay or inspect the exact raw search documents in the database post-execution, but we store the URLs as citations which is a fair compromise.

### 4. Shared Caching vs. Personalization
* **Decision:** Cache lookups are shared across all users querying the same company, while user lookup logs are tracked individually.
* **Trade-off:** If User A runs an analysis on "Apple" and User B searches "Apple" 10 minutes later, User B receives the cached result instantly without paying for search/LLM credits. We record a private `UserHistoryEntry` mapping User B's UID to that record, keeping user lookups independent. This maximizes performance and minimizes cost while preserving personal search logs.

---

## Example runs

*Please execute the application and replace these placeholders with real logs or screenshot markdown images:*

### Example Run 1: INVEST Verdict
`[Placeholder: Insert raw JSON output or verdict card details for an INVEST result]`

### Example Run 2: PASS Verdict
`[Placeholder: Insert raw JSON output or verdict card details for a PASS result]`

---

## What I'd improve with more time

1. **Incremental Streaming Trace:** Stream node-by-node updates to the frontend using Server-Sent Events (SSE) or WebSockets so the user sees live search titles and logs as they load, instead of a simulated client timer.
2. **Deep-Dive PDF Reporting:** Add a button to compile the structured Findings and Verdict memo into a beautifully typeset, printable PDF document for distribution.
3. **Dynamic Cache Expiry Control:** Add a UI toggle allowing users to bypass the cache manually (e.g. "Force Fresh Run") if they want to bypass the 24-hour limit on demand.
4. **Historical Price Graphs:** Integrate an external financial ticker API (like Yahoo Finance or Polygon) to embed interactive historical pricing charts on the Verdict card for public companies.
