# AI Investment Research Agent - Step-by-Step Approach & Feature Map

This document tracks the features implemented in this project, explaining their technical functionality and mapping them to the specific lines of code.

---

## Technical Features Overview

### 1. Database Persistence & Connection Caching (Backend)
* **Description:** Connects to MongoDB Atlas using Mongoose. To avoid exhausting connection pools in a serverless Next.js environment, the connection is cached globally.
* **Code Reference:**
  * [lib/db/mongoose.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/db/mongoose.ts): Contains cached connection singleton logic (Lines 1-46).
* **Models:**
  * [lib/db/models/ResearchResult.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/db/models/ResearchResult.ts): Defines the Mongoose Schema for structured research results (findings, verdict, metadata) (Lines 1-52).
  * [lib/db/models/UserHistoryEntry.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/db/models/UserHistoryEntry.ts): Defines user lookup history schema mapping Firebase UID to ResearchResult ObjectId (Lines 1-19).

### 2. Firebase Authentication Guarding (Backend & Frontend)
* **Description:** Gates access to user endpoints and frontend paths. The client SDK initiates Google OAuth or email sign-in, while the Firebase Admin SDK verifies the ID token in server-side API requests.
* **Code Reference:**
  * [lib/firebase/client.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/firebase/client.ts): Initializes Firebase client application and auth module (Lines 1-15).
  * [lib/firebase/admin.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/firebase/admin.ts): Initializes Firebase Admin SDK using server-side keys to verify JWT ID tokens (Lines 1-21).

### 3. LangGraph AI Investment Agent (Backend)
* **Description:** Orchestrates the multi-step research pipeline with LangGraph.
  * **Identify Node:** Disambiguates user input into ticker/canonical name.
  * **Parallel Research Nodes:** Concurrent searches for News, Financials, Competitors, Risks, and Leadership.
  * **Analyze Node:** Uses structured output (via Claude + zod) to create structured Findings.
  * **Decide Node:** Uses structured output (via Claude + zod) to output the final Verdict stamp.
* **Code Reference:**
  * [lib/agent/state.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/agent/state.ts): Shared annotation state (AgentState) (Lines 1-76).
  * [lib/agent/prompts.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/agent/prompts.ts): Prompts for identification, analysis summary, and investment decision framework (Lines 1-49).
  * [lib/agent/tools.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/agent/tools.ts): Tavily search integration wrapper (Lines 1-38).
  * [lib/agent/nodes/identify.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/agent/nodes/identify.ts): Company identification node (Lines 1-49).
  * [lib/agent/nodes/research.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/agent/nodes/research.ts): Five parallel research nodes running concurrent Tavily lookups (Lines 1-152).
  * [lib/agent/nodes/analyze.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/agent/nodes/analyze.ts): Analysis node with zod schema and corrective single-retry capability (Lines 1-84).
  * [lib/agent/nodes/decide.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/agent/nodes/decide.ts): Final investment decision node with Zod validation and corrective single-retry (Lines 1-78).
  * [lib/agent/graph.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/lib/agent/graph.ts): Instantiates StateGraph, maps nodes/edges (including the fan-out/fan-in parallel logic) and compiles the workflow (Lines 1-44).

### 4. Caching Mechanics (Backend)
* **Description:** Checks MongoDB for existing research findings for a company before triggering a new agent invocation. If within cache expiry (24 hours), returns the cached findings and marks the response `cached: true`.
* **Code Reference:** POST endpoint in [app/api/research/route.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/app/api/research/route.ts) (Lines 52-94).

### 5. API Endpoints (Backend)
* **POST `/api/research`:** Initiates analysis. Validates auth header, checks cache, runs agent, caches results, records history, and returns JSON.
  * **File:** [app/api/research/route.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/app/api/research/route.ts) (Lines 1-176).
* **GET `/api/history`:** Retrieves authenticated user's lookup history.
  * **File:** [app/api/history/route.ts](file:///Users/ayushmanbhattacharya/Desktop/airesearch/app/api/history/route.ts) (Lines 1-69).

### 6. Frontend Landing Page (Frontend)
* **Description:** Landing page showing editorial layout, hero, how-it-works sections, and Firebase Google Sign In button.
  * **File:** [app/page.tsx](file:///Users/ayushmanbhattacharya/Desktop/airesearch/app/page.tsx) (Lines 1-325).

### 7. Frontend Research Workspace & Parallel Trace (Frontend)
* **Description:** Form to input company name. Renders a trace visualization of the agent running the five research modules in parallel. Renders the final Verdict card, confidence indicator, and history panel.
  * **File:** [app/analyze/page.tsx](file:///Users/ayushmanbhattacharya/Desktop/airesearch/app/analyze/page.tsx) (Lines 1-748).

---

## Detailed Implementation & Feature Code Mapping

### A. API Token Validation
Tokens are passed in the `Authorization` header as `Bearer <token>` and verified server-side inside `app/api/research/route.ts` and `app/api/history/route.ts`:
```typescript
const authHeader = request.headers.get('Authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
}
const token = authHeader.substring(7);
const decodedToken = await adminAuth.verifyIdToken(token);
const userId = decodedToken.uid;
```

### B. MongoDB Caching Check
A query checks if a result was compiled for the company name within the last 24 hours:
```typescript
const ttlHours = parseInt(process.env.CACHE_TTL_HOURS || '24', 10);
const cacheThreshold = new Date(Date.now() - ttlHours * 60 * 60 * 1000);
cachedResult = await ResearchResult.findOne({
  companyName: normalizedCompany,
  createdAt: { $gte: cacheThreshold },
});
```

### C. Graceful DB Connection Degradation
All database operations in `/api/research` are wrapped in `try { ... } catch (dbErr) { ... }` blocks to guarantee that even if MongoDB is temporarily down, the research workflow runs, the agent completes, and the result is returned directly to the user (albeit not cached).

