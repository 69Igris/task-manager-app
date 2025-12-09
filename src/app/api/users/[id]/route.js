import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, createErrorResponse, createSuccessResponse } from '@/lib/auth';

/**
 * PUT /api/users/[id]
 * Update user role (admin only)
 */
export async function PUT(request, context) {
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  const params = await context.params;
  const { id } = params;

  // Only admins can update user roles
  const roleCheck = requireRole(user, 'admin');
  if (roleCheck.error) {
    return createErrorResponse(roleCheck.error, roleCheck.status);
  }

  try {
    const { role } = await request.json();

    // Validate role
    const validRoles = ['worker', 'manager', 'supervisor', 'admin'];
    if (!validRoles.includes(role)) {
      return createErrorResponse('Invalid role', 400);
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return createErrorResponse('User not found', 404);
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return createSuccessResponse({
      message: 'User role updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return createErrorResponse('Failed to update user role', 500);
  }
}

/**
 * DELETE /api/users/[id]
 * Delete a user (admin only)
 */
export async function DELETE(request, context) {
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  const params = await context.params;
  const { id } = params;

  // Only admins can delete users
  const roleCheck = requireRole(user, 'admin');
  if (roleCheck.error) {
    return createErrorResponse(roleCheck.error, roleCheck.status);
  }

  // Prevent admin from deleting themselves
  if (user.id === id) {
    return createErrorResponse('You cannot delete your own account', 400);
  }

  try {
    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!targetUser) {
      return createErrorResponse('User not found', 404);
    }

    // Delete user (this will cascade delete their refresh tokens, projects, tasks, and comments)
    await prisma.user.delete({
      where: { id },
    });

    return createSuccessResponse({
      message: `User ${targetUser.name} has been deleted successfully`,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return createErrorResponse('Failed to delete user', 500);
  }
}
