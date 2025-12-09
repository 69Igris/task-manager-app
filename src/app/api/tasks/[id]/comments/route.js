import { prisma } from '@/lib/prisma';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth';

/**
 * GET /api/tasks/[id]/comments
 * Get all comments for a task
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
    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!task) {
      return createErrorResponse('Task not found', 404);
    }

    // Check access permissions
    const canAccess = 
      user.role === 'admin' ||
      user.role === 'supervisor' ||
      task.project.ownerId === user.id ||
      task.assignedTo === user.id ||
      task.createdBy === user.id;

    if (!canAccess) {
      return createErrorResponse('Access denied to this task', 403);
    }

    // Fetch comments
    const comments = await prisma.comment.findMany({
      where: { taskId: id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return createSuccessResponse({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    return createErrorResponse('Failed to fetch comments', 500);
  }
}
/**
 * POST /api/tasks/[id]/comments
 * Add a comment to a task
 */
export async function POST(request, context) {
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    return createErrorResponse(authResult.error, authResult.status);
  }

  const { user } = authResult;
  const params = await context.params;
  const { id } = params;

  try {
    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!task) {
      return createErrorResponse('Task not found', 404);
    }

    // Check access permissions - user must have access to the task
    const canComment = 
      user.role === 'admin' ||
      user.role === 'supervisor' ||
      task.project.ownerId === user.id ||
      task.assignedTo === user.id ||
      task.createdBy === user.id;

    if (!canComment) {
      return createErrorResponse('You do not have permission to comment on this task', 403);
    }

    const { content } = await request.json();

    // Validation
    if (!content || content.trim() === '') {
      return createErrorResponse('Comment content is required', 400);
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        taskId: id,
        authorId: user.id,
      },
      include: {
        author: {
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
        message: 'Comment added successfully',
        comment,
      },
      201
    );
  } catch (error) {
    console.error('Create comment error:', error);
    return createErrorResponse('Failed to create comment', 500);
  }
}
