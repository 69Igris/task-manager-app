import { verifyAccessToken } from './jwt';
import { prisma } from './prisma';

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
