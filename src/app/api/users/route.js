import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, createErrorResponse, createSuccessResponse } from '@/lib/auth';

/**
 * GET /api/users
 * Get all users (admin, supervisor, and manager can access)
 */
export async function GET(request) {
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;

  // Allow admins, supervisors, and managers to list users
  if (!['admin', 'supervisor', 'manager'].includes(user.role)) {
    return createErrorResponse('Access denied. Insufficient permissions.', 403);
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return createSuccessResponse({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return createErrorResponse('Failed to fetch users', 500);
  }
}
