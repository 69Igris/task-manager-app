import { prisma } from '@/lib/prisma';
import { requireAuth, canAccessResource, createErrorResponse, createSuccessResponse } from '@/lib/auth';

/**
 * POST /api/projects/[id]/members
 * Add a member to a project
 * Authorization: Must be owner or have admin/supervisor role
 */
export async function POST(request, context) {
  // Authenticate user
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  const params = await context.params;
  const { id } = params;

  try {
    // Fetch project
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        members: true,
      },
    });

    if (!project) {
      return createErrorResponse('Project not found', 404);
    }

    // Check permissions - only owner or admin/supervisor can add members
    if (!canAccessResource(user, project.ownerId, 'project')) {
      return createErrorResponse('Only the project owner or admin/supervisor can add members', 403);
    }

    const { userId } = await request.json();

    if (!userId) {
      return createErrorResponse('User ID is required', 400);
    }

    // Check if user exists
    const userToAdd = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!userToAdd) {
      return createErrorResponse('User not found', 404);
    }

    // Check if user is already the owner
    if (project.ownerId === userId) {
      return createErrorResponse('User is already the project owner', 400);
    }

    // Check if user is already a member
    if (project.members.includes(userId)) {
      return createErrorResponse('User is already a member of this project', 400);
    }

    // Add member to project
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        members: {
          push: userId,
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return createSuccessResponse(
      { 
        project: updatedProject,
        addedUser: userToAdd,
        message: `${userToAdd.name} has been added to the project`,
      },
      201
    );
  } catch (error) {
    console.error('Add member error:', error);
    return createErrorResponse('Failed to add member', 500);
  }
}

/**
 * DELETE /api/projects/[id]/members
 * Remove a member from a project
 * Authorization: Must be owner or have admin/supervisor role
 */
export async function DELETE(request, context) {
  // Authenticate user
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  const params = await context.params;
  const { id } = params;

  try {
    // Fetch project
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        members: true,
      },
    });

    if (!project) {
      return createErrorResponse('Project not found', 404);
    }

    // Check permissions
    if (!canAccessResource(user, project.ownerId, 'project')) {
      return createErrorResponse('Only the project owner or admin/supervisor can remove members', 403);
    }

    const { userId } = await request.json();

    if (!userId) {
      return createErrorResponse('User ID is required', 400);
    }

    // Check if user is the owner
    if (project.ownerId === userId) {
      return createErrorResponse('Cannot remove the project owner', 400);
    }

    // Check if user is a member
    if (!project.members.includes(userId)) {
      return createErrorResponse('User is not a member of this project', 400);
    }

    // Remove member from project
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        members: project.members.filter(memberId => memberId !== userId),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return createSuccessResponse({ 
      project: updatedProject,
      message: 'Member removed from project',
    });
  } catch (error) {
    console.error('Remove member error:', error);
    return createErrorResponse('Failed to remove member', 500);
  }
}
