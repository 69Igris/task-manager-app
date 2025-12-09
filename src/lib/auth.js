import { verifyAccessToken } from './jwt';
import { prisma } from './prisma';

/**
 * Role hierarchy for RBAC
 * Higher index = more permissions
 */
const ROLE_HIERARCHY = {
  worker: 0,
  manager: 1,
  supervisor: 2,
  admin: 3,
};

/**
 * Middleware to validate JWT token from Authorization header
 * Adds user object to request if valid
 * 
 * @param {Request} request - Next.js request object
 * @returns {object} { user, error } - User object if valid, error message if invalid
 */
export async function requireAuth(request) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return { 
        error: 'Authorization header is required',
        status: 401 
      };
    }

    // Check Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return { 
        error: 'Invalid authorization format. Use: Bearer <token>',
        status: 401 
      };
    }

    // Extract token
    const token = authHeader.substring(7);

    if (!token) {
      return { 
        error: 'Token is required',
        status: 401 
      };
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return { 
        error: 'Invalid or expired token',
        status: 401 
      };
    }

    // Fetch user from database to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      return { 
        error: 'User not found',
        status: 401 
      };
    }

    // Return user object
    return { user };

  } catch (error) {
    console.error('Auth middleware error:', error);
    return { 
      error: 'Authentication failed',
      status: 401 
    };
  }
}

/**
 * Check if user has required role or higher
 * 
 * @param {object} user - User object from requireAuth
 * @param {string} requiredRole - Minimum required role
 * @returns {object} { authorized, error } - Authorization result
 */
export function requireRole(user, requiredRole) {
  if (!user) {
    return {
      authorized: false,
      error: 'User not authenticated',
      status: 401,
    };
  }

  const userRoleLevel = ROLE_HIERARCHY[user.role];
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

  if (userRoleLevel === undefined) {
    return {
      authorized: false,
      error: 'Invalid user role',
      status: 403,
    };
  }

  if (requiredRoleLevel === undefined) {
    return {
      authorized: false,
      error: 'Invalid required role',
      status: 500,
    };
  }

  if (userRoleLevel < requiredRoleLevel) {
    return {
      authorized: false,
      error: `Access denied. Required role: ${requiredRole} or higher`,
      status: 403,
    };
  }

  return { authorized: true };
}

/**
 * Check if user can access a specific resource
 * Admins and supervisors can access all resources
 * Managers can access their own projects and tasks
 * Workers can only access assigned tasks
 * 
 * @param {object} user - User object from requireAuth
 * @param {string} resourceOwnerId - Owner ID of the resource
 * @param {string} resourceType - Type of resource (project, task)
 * @returns {boolean} - Whether user can access the resource
 */
export function canAccessResource(user, resourceOwnerId, resourceType = 'project') {
  // Admins and supervisors can access everything
  if (user.role === 'admin' || user.role === 'supervisor') {
    return true;
  }

  // Owner can always access their own resources
  if (user.id === resourceOwnerId) {
    return true;
  }

  // Managers can access projects they own
  if (user.role === 'manager' && resourceType === 'project') {
    return user.id === resourceOwnerId;
  }

  // For other cases, deny access
  return false;
}

/**
 * Helper to create error response
 */
export function createErrorResponse(error, status = 500) {
  return Response.json({ error }, { status });
}

/**
 * Helper to create success response
 */
export function createSuccessResponse(data, status = 200) {
  return Response.json(data, { status });
}
