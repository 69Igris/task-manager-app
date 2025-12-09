# Task Manager App - PART 1: Auth Foundation

This is the backend implementation for an internal task management application built with Next.js, Prisma (MongoDB), and JWT authentication.

## 📋 PART 1 - Completed Features

✅ **Database Schema** (Prisma + MongoDB)
- User model with RBAC (admin, supervisor, manager, worker)
- RefreshToken model with token rotation
- Project, Task, and Comment models
- Proper indexes for performance

✅ **JWT Authentication System**
- Access tokens (15min expiry)
- Rotating refresh tokens (7 day expiry)
- Secure token hashing (SHA-256)
- Token revocation support

✅ **API Endpoints**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Login with token generation
- `POST /api/auth/refresh` - Token refresh with rotation
- `POST /api/auth/logout` - Token revocation

✅ **Seed Script**
- Creates test users for all roles

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB database (local or MongoDB Atlas)
- npm or yarn

### Installation Steps

1. **Clone and navigate to the project:**
```bash
cd "/Users/aaryanyadav/Desktop/TAsk manager/client"
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add your MongoDB connection string:
```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/taskapp?retryWrites=true&w=majority"
JWT_ACCESS_SECRET="your-super-secret-access-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
NODE_ENV="development"
```

4. **Generate Prisma Client:**
```bash
npm run prisma:generate
```

5. **Seed the database:**
```bash
npm run db:seed
```

6. **Start the development server:**
```bash
npm run dev
```

The server will start at `http://localhost:3000`

---

## 🧪 Testing the API

### Test Credentials (from seed)
- **Admin:** `admin@taskapp.com` / `admin123456`
- **Supervisor:** `supervisor@taskapp.com` / `supervisor123`
- **Manager:** `manager@taskapp.com` / `manager123`
- **Worker:** `worker@taskapp.com` / `worker123`

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "password123"
  }'
```

**Expected Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User",
    "role": "worker"
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@taskapp.com",
    "password": "admin123456"
  }'
```

**Expected Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "user": {
    "id": "...",
    "email": "admin@taskapp.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

**Save the tokens for subsequent requests!**

### 3. Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

**Expected Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new_refresh_token_here...",
  "user": {
    "id": "...",
    "email": "admin@taskapp.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

### 4. Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

**Expected Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## 📁 Project Structure

```
client/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.js                # Seed script
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       ├── register/route.js    # Registration endpoint
│   │   │       ├── login/route.js       # Login endpoint
│   │   │       ├── refresh/route.js     # Token refresh endpoint
│   │   │       └── logout/route.js      # Logout endpoint
│   │   ├── layout.js
│   │   ├── page.js
│   │   └── globals.css
│   └── lib/
│       ├── prisma.js          # Prisma client singleton
│       └── jwt.js             # JWT helper functions
├── .env                       # Environment variables (create from .env.example)
├── .env.example               # Example environment variables
├── package.json
└── README.md
```

---

## 🔒 Security Checklist

### ✅ Implemented Security Features:

1. **Password Security**
   - ✅ Passwords hashed with bcrypt (salt rounds: 10)
   - ✅ Minimum password length: 8 characters
   - ✅ Never store plain-text passwords

2. **Token Security**
   - ✅ Access tokens expire in 15 minutes
   - ✅ Refresh tokens expire in 7 days
   - ✅ Refresh tokens hashed (SHA-256) before storage
   - ✅ Token rotation on refresh (old token invalidated)
   - ✅ Token revocation on logout

3. **API Security**
   - ✅ Input validation on all endpoints
   - ✅ Proper HTTP status codes
   - ✅ Error messages don't leak sensitive info

### ⚠️ TODO for Production:

1. **Rate Limiting** - Add rate limiting middleware to prevent brute force attacks
2. **CORS** - Configure CORS properly for production
3. **HTTPS** - Ensure all traffic uses HTTPS
4. **Secret Keys** - Use strong, random secrets in production (change from .env.example)
5. **Database** - Use connection pooling and proper indexes
6. **Logging** - Implement proper logging and monitoring
7. **Input Sanitization** - Add additional validation/sanitization libraries

---

## 🔑 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_ACCESS_SECRET` | Secret for access token signing | Strong random string |
| `JWT_REFRESH_SECRET` | Secret for refresh token signing | Strong random string |
| `NODE_ENV` | Environment mode | `development` or `production` |

---

## 🐛 Common Issues

### "PrismaClient is not configured"
Run `npm run prisma:generate`

### "Cannot connect to database"
Check your `DATABASE_URL` in `.env` file

### "Module not found" errors
Run `npm install` to install all dependencies

---

## 📝 API Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message here"
}
```

Common status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials/token)
- `409` - Conflict (user already exists)
- `500` - Internal Server Error

---

## 🎯 Next Steps (PART 2)

In the next part, we'll implement:
- ✅ Middleware to validate JWT tokens
- ✅ RBAC helper functions (`requireRole`)
- ✅ Protected endpoints (e.g., `/api/projects`)
- ✅ Authorization checks based on user roles

---

## 📦 Dependencies

- **next** - React framework with API routes
- **@prisma/client** - Prisma ORM client
- **prisma** - Prisma CLI
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token generation/verification

---

## 💡 Notes

- This backend uses Next.js App Router API routes (`app/api/*`)
- All API routes are in `src/app/api/`
- Database models use MongoDB with Prisma
- JWT tokens stored in client localStorage (to be implemented in PART 4)
- Refresh token rotation provides additional security

---

**Generated:** December 9, 2025  
**Status:** ✅ PART 1 Complete - Ready for Testing
