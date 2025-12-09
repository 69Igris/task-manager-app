import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, createErrorResponse, createSuccessResponse } from '@/lib/auth';

/**
 * GET /api/projects
 * List all projects (with RBAC filtering)
 * - Admin/Supervisor: See all projects
 * - Manager: See own projects
 * - Worker: See projects they're members of
 */
export async function GET(request) {
  // Authenticate user
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;

  try {
    let projects;

    if (user.role === 'admin' || user.role === 'supervisor') {
      // Admin and supervisor can see all projects
      projects = await prisma.project.findMany({
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else if (user.role === 'manager') {
      // Managers see projects they own
      projects = await prisma.project.findMany({
        where: {
          ownerId: user.id,
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
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {
      // Workers see projects they're members of
      projects = await prisma.project.findMany({
        where: {
          members: {
            has: user.id,
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
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return createSuccessResponse({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    return createErrorResponse('Failed to fetch projects', 500);
  }
}

/**
 * POST /api/projects
 * Create a new project
 * Required role: manager or higher
 */
export async function POST(request) {
  // Authenticate user
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;

  // Check role permission
  const roleCheck = requireRole(user, 'manager');
  
  if (!roleCheck.authorized) {
    return createErrorResponse(roleCheck.error, roleCheck.status);
  }

  try {
    const { name, description, members } = await request.json();

    // Validation
    if (!name || name.trim() === '') {
      return createErrorResponse('Project name is required', 400);
    }

    // Validate members if provided
    let memberIds = [];
    if (members && Array.isArray(members)) {
      // Verify all member IDs exist
      const users = await prisma.user.findMany({
        where: {
          id: { in: members },
        },
        select: { id: true },
      });

      if (users.length !== members.length) {
        return createErrorResponse('Some member IDs are invalid', 400);
      }

      memberIds = members;
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: user.id,
        members: memberIds,
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
        message: 'Project created successfully',
        project,
      },
      201
    );
  } catch (error) {
    console.error('Create project error:', error);
    return createErrorResponse('Failed to create project', 500);
  }
}
