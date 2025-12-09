import { prisma } from '@/lib/prisma';
import { requireAuth, canAccessResource, createErrorResponse, createSuccessResponse } from '@/lib/auth';

/**
 * GET /api/projects/[id]
 * Get a single project by ID
 * Authorization: User must be owner, member, or have supervisor/admin role
 */
export async function GET(request, context) {
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
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        tasks: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!project) {
      return createErrorResponse('Project not found', 404);
    }

    // Check access permissions
    const hasAccess = 
      canAccessResource(user, project.ownerId, 'project') ||
      project.members.includes(user.id);

    if (!hasAccess) {
      return createErrorResponse('Access denied to this project', 403);
    }

    return createSuccessResponse({ project });
  } catch (error) {
    console.error('Get project error:', error);
    return createErrorResponse('Failed to fetch project', 500);
  }
}

/**
 * PUT /api/projects/[id]
 * Update a project
 * Authorization: Must be owner or have admin/supervisor role
 */
export async function PUT(request, context) {
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
    });

    if (!project) {
      return createErrorResponse('Project not found', 404);
    }

    // Check permissions
    if (!canAccessResource(user, project.ownerId, 'project')) {
      return createErrorResponse('Only the project owner or admin/supervisor can update this project', 403);
    }

    const { name, description, members } = await request.json();

    // Build update data
    const updateData = {};
    
    if (name !== undefined) {
      if (name.trim() === '') {
        return createErrorResponse('Project name cannot be empty', 400);
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (members !== undefined) {
      if (!Array.isArray(members)) {
        return createErrorResponse('Members must be an array', 400);
      }

      // Verify all member IDs exist
      if (members.length > 0) {
        const users = await prisma.user.findMany({
          where: {
            id: { in: members },
          },
          select: { id: true },
        });

        if (users.length !== members.length) {
          return createErrorResponse('Some member IDs are invalid', 400);
        }
      }

      updateData.members = members;
    }

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
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
      message: 'Project updated successfully',
      project: updatedProject,
    });
  } catch (error) {
    console.error('Update project error:', error);
    return createErrorResponse('Failed to update project', 500);
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project
 * Authorization: Must be owner or have admin role
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
    });

    if (!project) {
      return createErrorResponse('Project not found', 404);
    }

    // Only owner or admin can delete
    if (project.ownerId !== user.id && user.role !== 'admin') {
      return createErrorResponse('Only the project owner or admin can delete this project', 403);
    }

    // Delete project (cascades to tasks and comments)
    await prisma.project.delete({
      where: { id },
    });

    return createSuccessResponse({
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return createErrorResponse('Failed to delete project', 500);
  }
}
