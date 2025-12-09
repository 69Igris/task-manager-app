import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, createErrorResponse, createSuccessResponse } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * POST /api/users/[id]/reset-password
 * Reset user password (admin only)
 */
export async function POST(request, context) {
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  const params = await context.params;
  const { id } = params;

  // Only admins can reset passwords
  const roleCheck = requireRole(user, 'admin');
  if (roleCheck.error) {
    return createErrorResponse(roleCheck.error, roleCheck.status);
  }

  try {
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return createErrorResponse('Password must be at least 6 characters long', 400);
    }

    // Check if target user exists
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

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Delete all refresh tokens for this user (force re-login)
    await prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    return createSuccessResponse({
      message: `Password for ${targetUser.name} has been reset successfully. User will need to log in again.`,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return createErrorResponse('Failed to reset password', 500);
  }
}
