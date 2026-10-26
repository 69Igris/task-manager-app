# Task Manager

Task Manager is a full-stack Next.js app for managing equipment-related tasks, comments, events, and in-app notifications.

🚀 It serves as a lightweight, modern alternative to Jira, designed for teams that want powerful task tracking without the complexity and overhead of traditional enterprise tools.
## Current Project Status

The project is currently functional end-to-end with:

- JWT authentication with access + refresh token flow
- User registration and login
- Task lifecycle management (pending, in-progress, completed)
- Task assignment (up to 2 assignees per task)
- Nested comments and replies on tasks
- Events calendar management
- In-app notifications + mark-as-read
- PWA support (manifest + service worker)
- CSV export of completed tasks by date range
- AI project assistant: natural-language sprint summaries, priorities, daily briefings and sprint planning, with human approval for every change (see [AI_ASSISTANT.md](AI_ASSISTANT.md))

Core API routes currently available:

- `auth`: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`
- `tasks`: `/api/tasks`, `/api/tasks/[id]`, `/api/tasks/[id]/comments`, `/api/tasks/[id]/comments/[commentId]`
- `events`: `/api/events`, `/api/events/[id]`
- `notifications`: `/api/notifications`, `/api/notifications/[id]/read`, `/api/notifications/subscribe`, `/api/notifications/check-reminders`
- `users`: `/api/users`
- `ai`: `/api/ai/chat`, `/api/ai/status`, `/api/ai/conversations`, `/api/ai/conversations/[id]`, `/api/ai/proposals/[id]`, `/api/ai/proposals/[id]/approve`, `/api/ai/proposals/[id]/reject`
- `health`: `/api/health`

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Prisma 5 + MongoDB
- Groq or Anthropic Claude (tool calling) for the AI assistant, Zod for validation
- Vitest for tests
- JWT (`jsonwebtoken`) + `bcryptjs`
- Tailwind CSS 4
- PWA support with `next-pwa`

## Quick Setup (Local Development)

1. Clone and open the project.
2. Install dependencies.
3. Create your local env file from `.env.example`.
4. Generate Prisma client.
5. Seed sample users/tasks/events.
6. Start the dev server.

```bash
cd client
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:seed
npm run dev
```

App runs at `http://localhost:3000`.

## Environment Variables

This repository now includes a tracked `.env.example` for smoother setup.

Required variables:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`
- `NODE_ENV` (typically `development` locally)

Optional (AI assistant):

- `AI_PROVIDER` (`groq` or `anthropic`) plus `GROQ_API_KEY` or `ANTHROPIC_API_KEY` enable the assistant. All `AI_*` settings (model, limits, timezone, approval policy) are listed in `.env.example`.

## Guest Credentials (Seeded Users)

After running `npm run prisma:seed`, you can log in with any of these guest accounts:

- `john@company.com` / `Test123!`
- `sarah@company.com` / `Test123!`

or freely create One.

## Useful Scripts

- `npm run dev` - Start development server
- `npm run build` - Generate Prisma client + production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run the test suite (set `TEST_DATABASE_URL` for database integration tests; see [AI_ASSISTANT.md](AI_ASSISTANT.md#tests))
- `node scripts/seed-ai-demo.js` - Add demo sprint data for the AI assistant (additive)
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:seed` - Seed sample data
- `npm run db:seed` - Generate client + seed data

## Project Structure

```text
client/
  prisma/
    schema.prisma
    seed.js
  public/
    manifest.json
    sw.js
  src/
    app/
      api/
      dashboard/
      login/
      register/
    components/
    contexts/
    lib/
```

## Deployment Notes

- Add all required environment variables in your hosting platform.
- Ensure MongoDB network access is configured for your deployment environment.
- Run build command: `npm run build`.

For deeper deployment steps, see `DEPLOYMENT.md`.
