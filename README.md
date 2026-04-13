# Task Manager

Task Manager is a full-stack Next.js app for managing equipment-related tasks, comments, events, and in-app notifications.

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

Core API routes currently available:

- `auth`: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`
- `tasks`: `/api/tasks`, `/api/tasks/[id]`, `/api/tasks/[id]/comments`, `/api/tasks/[id]/comments/[commentId]`
- `events`: `/api/events`, `/api/events/[id]`
- `notifications`: `/api/notifications`, `/api/notifications/[id]/read`, `/api/notifications/subscribe`, `/api/notifications/check-reminders`
- `users`: `/api/users`
- `health`: `/api/health`

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Prisma 5 + MongoDB
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

## Guest Credentials (Seeded Users)

After running `npm run prisma:seed`, you can log in with any of these guest accounts:

- `maninder@company.com` / `Test123!`
- `john@company.com` / `Test123!`
- `sarah@company.com` / `Test123!`

## Useful Scripts

- `npm run dev` - Start development server
- `npm run build` - Generate Prisma client + production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
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