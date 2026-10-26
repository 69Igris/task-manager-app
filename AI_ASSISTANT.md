# TaskForge AI Assistant

An agentic project assistant built into TaskForge. You describe what you want in plain language. The assistant reads live TaskForge data you have access to, calls an explicit set of server-side tools, and explains what it found. Any change it wants to make is shown as a preview and runs only after you approve it.

Open it from **Assistant** in the sidebar (**AI** in the mobile nav), at `/dashboard/assistant`.

## What it can do

| Workflow | Example request | Tools used |
| --- | --- | --- |
| Sprint summary | "Summarize our sprint progress and identify the biggest blockers." | `get_sprint_summary` |
| Prioritization | "Which tasks are overdue, and what should the team prioritize today?" | `get_priority_recommendations`, `list_tasks` |
| Daily briefing | "Give me my daily project briefing." | `get_daily_briefing` |
| Sprint planning | "Plan the next Auth sprint and draft missing tasks." | reads, then `create_tasks` (needs approval) |
| Natural-language tasks | "Create a high-priority task to fix login validation by Friday." | `create_tasks` (needs approval) |
| Updates | "Move the finished tasks to completed and summarize what's left." | `update_task_status`, `update_task` (needs approval) |
| Reminders | "Remind people about tasks due this week." | `create_deadline_reminders` (needs approval) |

Follow-up questions keep their context. For example, after a sprint summary you can ask "Which three should we prioritize first?" and the assistant reuses the project. It still re-reads the database before it answers.

### Demo script

1. Run `node scripts/seed-ai-demo.js` and sign in as `priya.demo@taskforge.local` / `Test123!`. The script is additive: it only replaces that demo user's tasks in the "Auth" project.
2. Ask: *"Analyze the Auth sprint, recommend three priorities, and draft any missing tasks."*
3. The assistant calls `get_sprint_summary` and `get_priority_recommendations`. Under **From the database** you see the numbers TaskForge computed, kept separate from the AI's recommendations.
4. It drafts tasks with `create_tasks`. The proposal card lists each task with its fields and notes (for example "No due date", or "assigned to you").
5. Untick any task you don't want and click **Approve**. Each task is created and then re-read from MongoDB, and the card marks it "verified in database". Tasks you unticked are marked skipped.

## Architecture

```
src/lib/ai/
  config.js            env-driven settings: provider, model, limits, policy
  agent.js             bounded orchestration loop (model ↔ tools)
  prompt.js            static system prompt + per-request context block
  providers/           provider registry + Groq and Anthropic adapters (swap by config)
  tools/
    index.js           allowlist, Zod validation, JSON Schema for the model
    read.js            read-only tools (no approval)
    write.js           write tools: prepare (preview) + execute (with verification)
    shared.js          access-checked loading, assignee and date resolution
  insights.js          deterministic scoring, workload, blockers, summaries
  dates.js             timezone-aware relative-date resolution
  proposals.js         approval state machine (idempotent execution)
  conversations.js     bounded, owner-scoped chat memory
  chat.js              one request end to end
  http.js              auth guard, rate limit, body-size limit, error shape
src/lib/tasks/service.js   task rules shared by the REST routes and the agent
src/app/api/ai/...         route handlers
src/app/dashboard/assistant/page.js, src/components/assistant/*   UI
```

### Request flow

1. **Interpret.** `POST /api/ai/chat` authenticates with the existing JWT, applies the rate limit, and validates the body with Zod. The model receives the static system prompt plus a context block: today's date in `AI_TIMEZONE`, the user, the current project, and the approval policy.
2. **Retrieve and act.** The model calls tools. Each call goes through the allowlist and Zod validation, then the user's permissions are checked against the database.
   - Read tools run immediately.
   - Write tools only **prepare** actions. Preparing validates the change, checks permissions, resolves relative dates and assignee names, and builds a before/after preview.
3. **Ask when unsure.** If information is missing (for example which project new tasks belong to), the system prompt tells the model to ask a follow-up question rather than guess.
4. **Bounded loop.** The loop stops at `AI_MAX_MODEL_CALLS`, `AI_MAX_TOOL_CALLS` or `AI_REQUEST_TIMEOUT_MS`. Retryable provider errors are retried up to `AI_PROVIDER_RETRIES` times with backoff. If the reply is cut off at `max_tokens`, any tool call in it is dropped rather than run with partial arguments.
5. **Propose.** All prepared actions from one turn are stored as a single `AgentProposal`. Its raw arguments never reach the client; the client only gets the previews.
6. **Approve and execute.** `POST /api/ai/proposals/:id/approve` moves the proposal from `pending` to `executing` with a conditional update, so a retried or concurrent approval executes it at most once. Each action re-checks permissions against the current task, executes, and then **re-reads MongoDB to verify** the result. Results are saved after every action. The final status is `executed`, `partially_failed` or `failed`, and each action is marked succeeded, failed or skipped. The outcome is also added to the conversation.
7. **Respond.** The reply includes the text, the tool steps, any proposal, any auto-executed results, and the database facts for the UI's facts panel.

### Guardrails

- **The LLM is untrusted.** It is never used for authorization. Every tool loads tasks through `visibleTaskWhere(user)`, which matches tasks the user created or is assigned to. A missing task and an inaccessible task return the same "not found" error, so the model can't probe for other users' task ids.
- **Same rules as the UI.** Permissions come from `getTaskPermissions` in the shared task service: only creators delete or reassign, only creators edit completed tasks, and members comment and change status.
- **Allowlist only.** The 13 tools are the only way to reach data. The model cannot run queries, touch users, authentication or permissions, or call anything else.
- **Prompt injection.** Tool results label task text as untrusted data, and the system prompt tells the model to ignore instructions inside it. The tests simulate a model that has been fooled; access control still blocks the action.
- **Approval policy.**
  - `AI_APPROVAL_MODE=always` (the default): every write waits for approval.
  - `single_reversible`: if a model response contains exactly one status change, field edit or comment, and nothing else was written this turn, it runs immediately.
  - Task creation, bulk changes, reassignment, reminders and deletes always need approval.
- **Stale proposals.** `update_task` records the task's `updatedAt` and refuses to run if the task changed after the proposal was made. Proposals expire after `AI_PROPOSAL_TTL_MINUTES`.
- **No duplicates.**
  - Proposal execution is atomic, so a proposal runs at most once.
  - A chat request retried with the same `clientMessageId` returns the stored reply instead of running the agent again.
  - Only one chat request per user runs at a time.
  - Reminders skip anyone already reminded about the same task in the last 24 hours.
- **Limits.**
  - Per-user rate limits: 10 chat requests per minute by default, 30 approvals per minute.
  - Request bodies and messages have size caps.
  - Conversation history is bounded and tool output is capped in size.
- **Logging.** The server logs metadata only: user id, conversation id, stop reason, timing, model and tool call counts, token counts. It never logs prompts, task text or credentials.

### Facts vs. recommendations

All dates, day counts, completion rates and priority scores come from `insights.js` and `dates.js`, not from the model. The priority score is documented in the tool output: high/medium/low base weight, plus points for being overdue, deadline proximity, already in progress, staleness, and a possible blocker. Briefings label their two parts "Facts" and "Recommendations".

A task is called a **potential blocker** only when one of its comments matches blocker language ("blocked", "waiting on", "depends on", …). The comment is shown as evidence. TaskForge has no "blocked" status.

### Data-model notes

- A **project** is the task's `equipment` field. An **area** is `area`.
- TaskForge has **no sprint records**. "Sprint" means a configurable window (`AI_SPRINT_LENGTH_DAYS`): completed work in the window ending today, and deadlines in the window starting today. The tool output says so.
- **Stale** means not updated for `AI_STALE_DAYS`, based on `updatedAt`. Any edit resets it, because the schema keeps no field-level history.
- Due dates follow the task form's convention: a calendar date stored at UTC midnight.
- New models: `AgentConversation`, which stores user prompts and final replies only, never tool output, so history can't stand in for current task state; and `AgentProposal`. Both are deleted along with their user.

## Setup

1. Choose a provider in `.env` (see `.env.example` for all `AI_*` settings):
   - **Groq:** `AI_PROVIDER="groq"` and `GROQ_API_KEY`. The default model is `llama-3.3-70b-versatile`; any Groq model works through `AI_MODEL`, since all of them support tool use.
   - **Anthropic:** `AI_PROVIDER="anthropic"` and `ANTHROPIC_API_KEY`. The default model is `claude-opus-5-5`.

   Without a key, the assistant page shows a "not configured" notice naming the missing variable, and everything else works as before.
2. Run `npx prisma db push` to create the two new collections.
3. Optional: run `node scripts/seed-ai-demo.js` to load demo data.

### Changing the model or provider

- To switch providers, set `AI_PROVIDER` (`groq` or `anthropic`) and that provider's key.
- To change the model, set `AI_MODEL`. `AI_EFFORT` applies to Anthropic only.
- To add another provider, implement the contract in `src/lib/ai/providers/index.js`:
  - `startTurn({ system, tools, history, userMessage })` returns a turn.
  - `turn.next(toolResults)` returns `{ text, toolCalls, stopReason, usage }`.
  - Register it with `registerProvider(name, factory)` and set `AI_PROVIDER=name`.
- Tools, validation, authorization and the orchestration loop don't change.

Provider notes:
- **Groq** uses the OpenAI-compatible Chat Completions API with function calling, through plain `fetch` (no SDK). A malformed tool call reported by Groq (`tool_use_failed`) counts as retryable. Open models sometimes send `null` for omitted fields or numbers as strings; the tool validator retries those arguments once in normalized form before rejecting them, and the authorization checks are the same either way.
- **Anthropic** sends server-side refusal fallbacks by default (`AI_REFUSAL_FALLBACK=default`). Set it to `off` to disable them.

## Tests

```bash
npm test
```

Unit tests always run: dates, scoring, tool allowlist and validation, rate limiting. The integration tests need a disposable MongoDB **replica set**, because Prisma's MongoDB connector requires one:

```bash
mongod --replSet rs0 --port 27099 --dbpath /tmp/taskforge-test-db
mongosh --port 27099 --eval 'rs.initiate()'
TEST_DATABASE_URL="mongodb://127.0.0.1:27099/taskforge_test?replicaSet=rs0&directConnection=true" npm test
```

The database name must contain "test", because the suite wipes it. LLM calls are replaced by a scripted provider (`tests/helpers/scriptedProvider.js`), so runs are deterministic and free.

Coverage:
- tool selection and argument validation
- the Groq adapter's request format, tool-call mapping and error handling (mocked HTTP)
- task creation and updates, with verification
- authorization and cross-user isolation
- sprint summaries and priority scores
- invalid model output, unknown tools and provider failures
- loop limits
- confirm, cancel and partial selection of proposals
- expiry
- duplicate and concurrent approvals
- partial failures
- follow-up context with fresh database reads
- regressions for login and refresh rotation, task create/status/comment/delete, and reminders

## Known limitations

- The rate limiter and the one-request-per-user guard live in process memory. A multi-instance deployment needs a shared store such as Redis.
- Replies are not streamed. The UI shows a loading state until the bounded turn finishes.
- The facts panel and tool-step list are shown for replies in the current session. When you reopen a saved conversation you see the reply text and proposal cards only.
- Reminders use TaskForge's in-app notifications. The repo's Web Push code depends on a `web-push` package and a `PushSubscription` model that don't exist in this codebase, so the assistant does not send push messages.
