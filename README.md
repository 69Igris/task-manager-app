# Task Manager - Complete Full-Stack Application

A modern, production-ready task management system built with Next.js 16, MongoDB, Prisma, and JWT authentication. Features role-based access control (RBAC), real-time updates, toast notifications, and PWA support.

## 🚀 Features

### Backend (API)
- **Authentication System** - JWT access tokens (15min) + rotating refresh tokens (7 days)
- **RBAC** - 4 roles (Worker, Manager, Supervisor, Admin) with hierarchical permissions
- **Project Management** - Full CRUD with role-based visibility
- **Task Management** - Status tracking, priority levels, assignment system
- **Comments System** - Add comments with author tracking
- **User Management** - Admin-only user role updates

### Frontend (UI)
- **Modern Design** - Tailwind CSS, responsive, gradient backgrounds
- **Authentication** - Login/register with demo user quick-fill buttons
- **Dashboard** - Stats overview, projects grid, my tasks section
- **Project Pages** - Full task management, inline forms, comments
- **Toast Notifications** - Success/error feedback for all actions
- **PWA Support** - Installable, offline-capable with service worker

## 🛠️ Tech Stack

- **Backend:** Next.js 16 API Routes, Prisma 5.22.0, MongoDB Atlas, JWT, bcryptjs
- **Frontend:** React 19, Next.js 16, Tailwind CSS, React Context, Service Workers

## 🚦 Quick Start

```bash
cd client
npm install

# Configure .env with MongoDB URL and JWT secrets
cp .env.example .env

# Setup database
npm run prisma:push
npm run prisma:seed

# Start dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 👥 Demo Users

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | admin@taskapp.com | admin123456 | Full access + user management |
| Supervisor | supervisor@taskapp.com | supervisor123 | View all projects/tasks |
| Manager | manager@taskapp.com | manager123 | Create projects/tasks, assign work |
| Worker | worker@taskapp.com | worker123 | View assigned tasks, update status |

## 📂 Project Structure

```
client/
├── prisma/
│   ├── schema.prisma          # Database schema (5 models)
│   └── seed.js                # Test data seeding
├── public/
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # Login, register, refresh, logout
│   │   │   ├── projects/     # Project CRUD + [id] routes
│   │   │   ├── tasks/        # Task CRUD + [id]/comments
│   │   │   └── users/        # User management (admin)
│   │   ├── dashboard/        # Dashboard pages
│   │   │   ├── page.js       # Dashboard home
│   │   │   ├── projects/[id]/page.js  # Project detail
│   │   │   └── users/page.js # User management
│   │   ├── login/page.js     # Login page
│   │   ├── register/page.js  # Registration
│   │   └── layout.js         # Root layout with providers
│   ├── components/
│   │   ├── Toast.js          # Toast notification system
│   │   └── PWARegister.js    # PWA registration
│   ├── contexts/
│   │   └── AuthContext.js    # Auth state + fetchWithAuth
│   └── lib/
│       ├── prisma.js         # Prisma client singleton
│       ├── jwt.js            # JWT sign/verify helpers
│       └── auth.js           # Auth middleware + RBAC
└── package.json
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login (returns tokens)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Revoke refresh token

### Projects
- `GET /api/projects` - List projects (RBAC filtered)
- `POST /api/projects` - Create project (manager+)
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/tasks` - List tasks (RBAC filtered)
- `POST /api/tasks` - Create task (manager+)
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/:id/comments` - List comments
- `POST /api/tasks/:id/comments` - Add comment

### Users (Admin Only)
- `GET /api/users` - List all users
- `PUT /api/users/:id` - Update user role

## 🎯 RBAC Permission Matrix

| Action | Worker | Manager | Supervisor | Admin |
|--------|--------|---------|------------|-------|
| Create Project | ❌ | ✅ | ✅ | ✅ |
| View All Projects | ❌ | ❌ | ✅ | ✅ |
| Create Task | ❌ | ✅ | ✅ | ✅ |
| Update Task Status | ✅* | ✅ | ✅ | ✅ |
| Add Comment | ✅* | ✅ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |

*\* Worker can only access assigned tasks*

## 🔒 Security Features

- Password hashing with bcrypt (10 rounds)
- JWT access tokens (short expiry)
- Rotating refresh tokens with revocation
- Server-side authorization on all endpoints
- RBAC enforcement
- Input validation
- Protected routes

## 📱 PWA Installation

**Desktop:** Look for install icon in browser address bar  
**Mobile:** Share → Add to Home Screen

## 🧪 Testing

**Login flow:** Test with all 4 demo users (quick-fill buttons provided)  
**Projects:** Manager creates → Admin sees all → Worker sees member projects  
**Tasks:** Manager creates task → Worker updates status → Comments work  
**Admin:** View users table → Update roles → Toast notifications

## 🚀 Deployment

**Vercel (Recommended):**
1. Push to GitHub
2. Import in Vercel
3. Add env vars: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
4. Deploy!

## 📊 Database Schema

- **User:** id, email, passwordHash, name, role
- **RefreshToken:** hashedToken, userId, expiresAt, revokedAt
- **Project:** id, name, description, ownerId, members[]
- **Task:** id, title, status, priority, projectId, assignedTo, createdBy
- **Comment:** id, content, taskId, authorId

## 🐛 Troubleshooting

**Database error:** Check MongoDB Atlas IP whitelist and connection string  
**JWT error:** Regenerate secrets, clear localStorage, re-login  
**Prisma error:** Run `npm run prisma:push`, check version 5.22.0  
**Next.js error:** Clear `.next` folder, restart dev server

## 📝 Documentation

- `PART1_README.md` - Authentication foundation
- `PART2_README.md` - Middleware & RBAC  
- `PART3_README.md` - Tasks & Comments API  
- `FRONTEND_README.md` - UI implementation details

## 🎉 What's Included

✅ Complete authentication system with refresh tokens  
✅ 4-role RBAC with hierarchical permissions  
✅ Project, task, and comment CRUD  
✅ Beautiful responsive UI with Tailwind CSS  
✅ Toast notifications for all actions  
✅ Admin user management page  
✅ PWA support (installable + offline)  
✅ Demo users with quick-login buttons  
✅ Production-ready architecture  
✅ Comprehensive documentation

**Ready for production! 🚀**
