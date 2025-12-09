# Task Manager App - PART 2: Middleware & RBAC

Building on PART 1, this implements authentication middleware and role-based access control for protected endpoints.

---

## 📋 PART 2 - Completed Features

✅ **Authentication Middleware** (`lib/auth.js`)
- `requireAuth()` - Validates JWT from Authorization header
- Fetches user from database to ensure validity
- Returns user object or error response

✅ **RBAC System**
- Role hierarchy: worker < manager < supervisor < admin
- `requireRole(user, role)` - Checks minimum role requirement
- `canAccessResource()` - Resource-level permission checks

✅ **Protected Project Endpoints**
- `GET /api/projects` - List projects (filtered by role)
- `POST /api/projects` - Create project (manager+)
- `GET /api/projects/[id]` - Get single project
- `PUT /api/projects/[id]` - Update project (owner/admin/supervisor)
- `DELETE /api/projects/[id]` - Delete project (owner/admin)

---

## 🔒 RBAC Rules

### Role Hierarchy
```
worker (0) → manager (1) → supervisor (2) → admin (3)
```

### Permissions by Role

| Action | Worker | Manager | Supervisor | Admin |
|--------|--------|---------|------------|-------|
| View assigned projects | ✅ | ✅ | ✅ | ✅ |
| View all projects | ❌ | ❌ | ✅ | ✅ |
| Create projects | ❌ | ✅ | ✅ | ✅ |
| Update own projects | ❌ | ✅ | ✅ | ✅ |
| Update any project | ❌ | ❌ | ✅ | ✅ |
| Delete own projects | ❌ | ✅ | ❌ | ✅ |
| Delete any project | ❌ | ❌ | ❌ | ✅ |

---

## 🧪 Testing Results

### ✅ Test 1: No Authentication
```bash
curl -X GET http://localhost:3000/api/projects
```
**Result:** `401 - Authorization header is required` ✅

### ✅ Test 2: Invalid Token Format
```bash
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: InvalidFormat"
```
**Result:** `401 - Invalid authorization format` ✅

### ✅ Test 3: Invalid/Expired JWT
```bash
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer invalid.jwt.token"
```
**Result:** `401 - Invalid or expired token` ✅

### ✅ Test 4: Worker Role Restriction
```bash
# Login as worker
WORKER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"worker@taskapp.com","password":"worker123"}' | \
  jq -r '.accessToken')

# Try to create project (should fail)
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Project"}'
```
**Result:** `403 - Access denied. Required role: manager or higher` ✅

### ✅ Test 5: Manager Can Create Projects
```bash
# Login as manager
MANAGER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@taskapp.com","password":"manager123"}' | \
  jq -r '.accessToken')

# Create project
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Mobile App Redesign","description":"Q1 2026 redesign project"}'
```
**Result:** `201 - Project created successfully` ✅

### ✅ Test 6: Admin Views All Projects
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@taskapp.com","password":"admin123456"}' | \
  jq -r '.accessToken')

curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Result:** `200 - Returns all projects` ✅

### ✅ Test 7: Supervisor Creates Project
```bash
SUPERVISOR_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"supervisor@taskapp.com","password":"supervisor123"}' | \
  jq -r '.accessToken')

curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Backend API Development"}'
```
**Result:** `201 - Project created successfully` ✅

---

## 📁 New Files Added

```
src/
├── lib/
│   └── auth.js                    # Auth middleware & RBAC helpers
└── app/
    └── api/
        └── projects/
            ├── route.js           # GET, POST /api/projects
            └── [id]/
                └── route.js       # GET, PUT, DELETE /api/projects/[id]
```

---

## 🔑 Middleware Usage Pattern

### Basic Authentication
```javascript
import { requireAuth, createErrorResponse } from '@/lib/auth';

export async function GET(request) {
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  // user.id, user.email, user.name, user.role available
}
```

### Role-Based Authorization
```javascript
import { requireAuth, requireRole, createErrorResponse } from '@/lib/auth';

export async function POST(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  
  // Require manager or higher
  const roleCheck = requireRole(user, 'manager');
  if (!roleCheck.authorized) {
    return createErrorResponse(roleCheck.error, roleCheck.status);
  }

  // Proceed with action...
}
```

### Resource-Level Authorization
```javascript
import { requireAuth, canAccessResource, createErrorResponse } from '@/lib/auth';

export async function GET(request, { params }) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  const resource = await prisma.project.findUnique({ where: { id: params.id } });

  if (!canAccessResource(user, resource.ownerId, 'project')) {
    return createErrorResponse('Access denied to this resource', 403);
  }

  // Return resource...
}
```

---

## 🎯 API Examples

### Get All Projects (Admin)
```bash
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Create Project (Manager+)
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Project",
    "description": "Project description",
    "members": ["user_id_1", "user_id_2"]
  }'
```

### Get Single Project
```bash
curl -X GET http://localhost:3000/api/projects/PROJECT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Project (Owner/Admin/Supervisor)
```bash
curl -X PUT http://localhost:3000/api/projects/PROJECT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "description": "Updated description",
    "members": ["user_id_1"]
  }'
```

### Delete Project (Owner/Admin)
```bash
curl -X DELETE http://localhost:3000/api/projects/PROJECT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🔒 Security Features

✅ **JWT Validation**
- Validates token signature and expiration
- Checks user still exists in database
- Proper error messages without leaking info

✅ **Role Hierarchy**
- Clear permission levels
- Higher roles inherit lower role permissions
- Centralized role checking logic

✅ **Resource-Level Permissions**
- Ownership validation
- Member-based access for workers
- Admin/supervisor override capabilities

✅ **HTTP Status Codes**
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Server error

---

## 📊 Project Visibility by Role

### Admin & Supervisor
```javascript
// See ALL projects in the system
GET /api/projects → Returns all projects
```

### Manager
```javascript
// See only projects they own
GET /api/projects → Returns projects where ownerId = user.id
```

### Worker
```javascript
// See only projects they're members of
GET /api/projects → Returns projects where user.id in members array
```

---

## 🎯 Next Steps (PART 3)

In the next part, we'll implement:
- ✅ Task CRUD endpoints with RBAC
- ✅ Comments system for tasks
- ✅ Task assignment and status updates
- ✅ Attachment metadata (file upload in later parts)
- ✅ Advanced filtering and search

---

**Generated:** December 9, 2025  
**Status:** ✅ PART 2 Complete - Middleware & RBAC Tested and Working
