import { prisma } from '@/lib/prisma';
import { requireAuth, canAccessResource, createErrorResponse, createSuccessResponse } from '@/lib/auth';

/**
 * GET /api/tasks/[id]
 * Get a single task by ID
 */
export async function GET(request, context) {
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  const params = await context.params;
  const { id } = params;

  try {
    const task = await prisma.task.findUnique({
      where: { id },
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
        comments: {
          include: {
            author: {
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

    if (!task) {
      return createErrorResponse('Task not found', 404);
    }

    // Check access permissions
    const canAccess = 
      user.role === 'admin' ||
      user.role === 'supervisor' ||
      canAccessResource(user, task.project.ownerId, 'project') ||
      task.assignedTo === user.id ||
      task.createdBy === user.id;

    if (!canAccess) {
      return createErrorResponse('Access denied to this task', 403);
    }

    // Add assignee info
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

    return createSuccessResponse({ task: { ...task, assignee } });
  } catch (error) {
    console.error('Get task error:', error);
    return createErrorResponse('Failed to fetch task', 500);
  }
}

/**
 * PUT /api/tasks/[id]
 * Update a task
 */
export async function PUT(request, context) {
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  const params = await context.params;
  const { id } = params;

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!task) {
      return createErrorResponse('Task not found', 404);
    }

    const { title, description, status, priority, assignedTo, dueDate } = await request.json();

    // Check permissions - different rules for different fields
    const isAdmin = user.role === 'admin';
    const isSupervisor = user.role === 'supervisor';
    const isProjectOwner = canAccessResource(user, task.project.ownerId, 'project');
    const isTaskCreator = task.createdBy === user.id;
    const isAssignee = task.assignedTo === user.id;

    // Full update permission: admin, supervisor, project owner, or task creator
    const canFullUpdate = isAdmin || isSupervisor || isProjectOwner || isTaskCreator;

    // Workers assigned to task can only update status and add comments (not modify other fields)
    if (!canFullUpdate && !isAssignee) {
      return createErrorResponse('You do not have permission to update this task', 403);
    }

    // If user is only assignee (worker), restrict what they can update
    if (isAssignee && !canFullUpdate) {
      // Workers can only update status
      if (title !== undefined || description !== undefined || priority !== undefined || assignedTo !== undefined || dueDate !== undefined) {
        return createErrorResponse('You can only update the status of assigned tasks', 403);
      }
    }

    // Build update data
    const updateData = {};

    if (title !== undefined) {
      if (title.trim() === '') {
        return createErrorResponse('Task title cannot be empty', 400);
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (status !== undefined) {
      const validStatuses = ['todo', 'in-progress', 'done'];
      if (!validStatuses.includes(status)) {
        return createErrorResponse('Invalid status. Must be: todo, in-progress, or done', 400);
      }
      updateData.status = status;
    }

    if (priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high'];
      if (!validPriorities.includes(priority)) {
        return createErrorResponse('Invalid priority. Must be: low, medium, or high', 400);
      }
      updateData.priority = priority;
    }

    if (assignedTo !== undefined) {
      if (assignedTo === null) {
        updateData.assignedTo = null;
      } else {
        const assignee = await prisma.user.findUnique({
          where: { id: assignedTo },
        });

        if (!assignee) {
          return createErrorResponse('Assigned user not found', 404);
        }
        updateData.assignedTo = assignedTo;
      }
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
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

    // Add assignee info
    let assignee = null;
    if (updatedTask.assignedTo) {
      assignee = await prisma.user.findUnique({
        where: { id: updatedTask.assignedTo },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
    }

    return createSuccessResponse({
      message: 'Task updated successfully',
      task: { ...updatedTask, assignee },
    });
  } catch (error) {
    console.error('Update task error:', error);
    return createErrorResponse('Failed to update task', 500);
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task
 */
export async function DELETE(request, context) {
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  const params = await context.params;
  const { id } = params;

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!task) {
      return createErrorResponse('Task not found', 404);
    }

    // Only project owner, task creator, or admin can delete
    const canDelete = 
      user.role === 'admin' ||
      task.project.ownerId === user.id ||
      task.createdBy === user.id;

    if (!canDelete) {
      return createErrorResponse('Only the task creator, project owner, or admin can delete this task', 403);
    }

    // Delete task (cascades to comments)
    await prisma.task.delete({
      where: { id },
    });

    return createSuccessResponse({
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return createErrorResponse('Failed to delete task', 500);
  }
}
