# Sokkarak Mazboot — Architecture Constitution

> **Purpose:** This document defines the non-negotiable architectural principles for every developer or AI agent working on this codebase. Any change that violates these rules is a bug, regardless of how it looks in isolation.

---

## 1. Strict Offline-First Architecture

- **IndexedDB is the source of truth.** The Zustand store (`useAppStore`) persists via `idb-keyval` and is the authoritative data layer. React components read exclusively from this store.
- **Never block the UI on cloud.** The app must render immediately from local data. `pullFromSupabase()` and `syncWithSupabase()` are background-only fire-and-forget operations.
- **Cloud sync is backup only.** Supabase exists for multi-device restoration and backup. The app must remain fully functional with zero internet connectivity (except AI chat, which gracefully degrades).
- **`profileReady` must never gate local actions.** The `profileReady` flag exists to signal "cloud pull has completed" — it must never prevent a user from seeing locally-stored dashboard data or acting on local notification intents.

---

## 2. UI-Level Concurrency Locks

The chat subsystem relies on the following locks to prevent concurrent message mutations. Future audits must verify these before claiming a race condition exists:

| Lock | File | Mechanism |
|------|------|-----------|
| Text input | `ChatInputArea.tsx:419` | `textarea` gets `disabled={isTyping}` |
| Send button | `ChatInputArea.tsx:461-480` | "Send" button replaced entirely with "Stop" when `isTyping=true` |
| Regenerate button | `ChatMessageBubble.tsx:89` | Not rendered when `isTyping` is true (`!isTyping && !isEditing`) |
| Edit button | `ChatMessageBubble.tsx:89` | Not rendered when `isTyping` is true |
| Edit save button | `ChatMessageBubble.tsx:68` | `disabled={isTyping}` |
| Retry button | `Chat.tsx:510` | `disabled={isTyping}` |

**Rule:** If `isTyping` is `true`, zero paths exist for the user to trigger another send, regenerate, retry, or edit-submit. Any audit claiming "concurrent message mutation" is possible must first demonstrate how the UI locks were bypassed.

---

## 3. Single-Threaded State Mutations

- **JavaScript is single-threaded.** All user-triggered event handlers execute sequentially in the event loop.
- **Zustand `set()` commits synchronously.** When `set((state) => ...)` runs, the new state is immediately available to any subsequent `get()` call.
- **Rapid taps are separate ticks.** Two button clicks are dispatched in separate event loop iterations. The first click's `set()` commits before the second click's handler even starts. There is no TOCTOU window for synchronous UI-driven mutations.
- **`get()` outside `set()` is a code smell.** In `healthSlice.ts`, `toggleMedicationLog` reads state via `get()` before calling `set()`. This works correctly due to single-threading (the second click sees the first click's committed state), but the `get()` should ideally move inside the `set()` callback for robustness against future async refactors.

**Rule:** Do not attempt to fix TOCTOU issues for synchronous mutations triggered by discrete UI events. The JS event loop already guarantees sequential execution.

---

## 4. Stateless Cloud Interactions

- **The server is stateless.** The Express backend does not persist chat sessions between requests.
- **Every request carries full context.** The `/api/chat` endpoint receives: `sessionId`, `chatHistory` (full), `profile` (name, age, gender, diabetesType, comorbidities), and `healthData` (medications, glucoseReadings). The client is the source of truth for conversation state.
- **Chat clearing sends a best-effort archive request.** The `/api/chat/clear` call is a fire-and-forget notification to the server. Local state (`chatHistory`, `activeSessionId`) is cleared immediately before the network call. Server failure must never block local state changes.

---

## 5. Sync Mutex (Added: June 2026)

- A module-level `_syncing` boolean in `syncSlice.ts` prevents overlapping `syncWithSupabase()` and `pullFromSupabase()` calls.
- The flag is set **synchronously** before any `await` to close the microtask TOCTOU gap where two async callers could both pass the stale `isSyncing` check.
- `_syncing` releases in `finally` blocks only — never in catch (to prevent deadlocks).

---

## 6. Auth Initialization (Added: June 2026)

- `finishInit()` in `initializeStore()` must NOT be called from the `onAuthStateChange` null-session branch. Only a confirmed valid session should fast-track initialization. The null path waits for `getSession()` to resolve or the 5-second safety timer.
- `session` and `user` are persisted to IndexedDB via `partialize` as a safety net for cold starts where the WebView's `localStorage` may be unavailable.

---

*Last updated: June 2026 — Post Stability Audit*
