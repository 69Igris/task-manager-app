import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, canAccessResource, createErrorResponse, createSuccessResponse } from '@/lib/auth';

/**
 * GET /api/tasks
 * List tasks with filtering options
 * Query params: projectId, status, priority, assignedTo
 */
export async function GET(request) {
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const assignedTo = searchParams.get('assignedTo');

  try {
    // Build filter conditions
    const where = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // Apply role-based filtering
    if (user.role === 'worker') {
      // Workers only see tasks assigned to them or created by them
      where.OR = [
        { assignedTo: user.id },
        { createdBy: user.id },
      ];
    } else if (user.role === 'manager') {
      // Managers see tasks in their projects
      const managerProjects = await prisma.project.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      });
      
      const projectIds = managerProjects.map(p => p.id);
      
      if (projectId && !projectIds.includes(projectId)) {
        // Manager trying to access tasks from project they don't own
        return createSuccessResponse({ tasks: [] });
      }
      
      if (!projectId) {
        where.projectId = { in: projectIds };
      }
    }
    // Admin and supervisor see all tasks

    const tasks = await prisma.task.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Populate assignedTo user info
    const tasksWithAssignee = await Promise.all(
      tasks.map(async (task) => {
        if (task.assignedTo) {
          const assignee = await prisma.user.findUnique({
            where: { id: task.assignedTo },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          });
          return { ...task, assignee };
        }
        return { ...task, assignee: null };
      })
    );

    return createSuccessResponse({ tasks: tasksWithAssignee });
  } catch (error) {
    console.error('Get tasks error:', error);
    return createErrorResponse('Failed to fetch tasks', 500);
  }
}

/**
 * POST /api/tasks
 * Create a new task
 * Required: manager role or higher
 */
export async function POST(request) {
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;

  // Check role permission - managers and above can create tasks
  const roleCheck = requireRole(user, 'manager');
  
  if (!roleCheck.authorized) {
    return createErrorResponse(roleCheck.error, roleCheck.status);
  }

  try {
    const { title, description, projectId, assignedTo, status, priority, dueDate } = await request.json();

    // Validation
    if (!title || title.trim() === '') {
      return createErrorResponse('Task title is required', 400);
    }

    if (!projectId) {
      return createErrorResponse('Project ID is required', 400);
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return createErrorResponse('Project not found', 404);
    }

    // Check if user can create tasks in this project
    if (!canAccessResource(user, project.ownerId, 'project')) {
      return createErrorResponse('You do not have permission to create tasks in this project', 403);
    }

    // Validate assignedTo user exists if provided
    if (assignedTo) {
      const assignee = await prisma.user.findUnique({
        where: { id: assignedTo },
      });

      if (!assignee) {
        return createErrorResponse('Assigned user not found', 404);
      }
    }

    // Validate status
    const validStatuses = ['todo', 'in-progress', 'done'];
    if (status && !validStatuses.includes(status)) {
      return createErrorResponse('Invalid status. Must be: todo, in-progress, or done', 400);
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      return createErrorResponse('Invalid priority. Must be: low, medium, or high', 400);
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        projectId,
        createdBy: user.id,
        assignedTo: assignedTo || null,
        status: status || 'todo',
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Add assignee info if exists
    let assignee = null;
    if (task.assignedTo) {
      assignee = await prisma.user.findUnique({
        where: { id: task.assignedTo },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
    }

    return createSuccessResponse(
      {
        message: 'Task created successfully',
        task: { ...task, assignee },
      },
      201
    );
  } catch (error) {
    console.error('Create task error:', error);
    return createErrorResponse('Failed to create task', 500);
  }
}
