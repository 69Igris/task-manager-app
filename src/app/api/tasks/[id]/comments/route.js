import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/tasks/[id]/comments - Get all comments for a task
export async function GET(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get all comments with their replies
    const comments = await prisma.comment.findMany({
      where: {
        taskId: id,
        parentId: null, // Only get top-level comments
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
            replies: {
              include: {
                author: {
                  select: { id: true, name: true, email: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/comments - Create a new comment
export async function POST(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const { id } = await params;
    const body = await request.json();
    const { content, parentId } = body;

    // Validate input
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Comment is too long (max 2000 characters)' }, { status: 400 });
    }

    // Verify task exists and get details for notification
    const task = await prisma.task.findUnique({
      where: { id },
      select: { 
        id: true, 
        title: true, 
        assignedTo: true, 
        createdBy: true 
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // If parentId is provided, verify parent comment exists and belongs to this task
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }

      if (parentComment.taskId !== id) {
        return NextResponse.json({ error: 'Parent comment does not belong to this task' }, { status: 400 });
      }
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        taskId: id,
        authorId: user.id,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create notifications for comment
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const notificationMessage = parentId 
      ? `${user.name} replied to a comment on "${task.title}"`
      : `${user.name} commented on "${task.title}"`;
    
    // Notify all assigned users except the commenter
    const usersToNotify = new Set(task.assignedTo.filter(userId => userId !== user.id));
    
    // Also notify the creator if they're not the commenter
    if (task.createdBy !== user.id) {
      usersToNotify.add(task.createdBy);
    }

    // If it's a reply, notify the parent comment author
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { authorId: true },
      });
      if (parentComment && parentComment.authorId !== user.id) {
        usersToNotify.add(parentComment.authorId);
      }
    }

    try {
      await Promise.all(
        Array.from(usersToNotify).map(userId =>
          prisma.notification.create({
            data: {
              userId,
              taskId: id,
              type: 'comment',
              message: notificationMessage,
              expiresAt,
            },
          })
        )
      );
    } catch (notifError) {
      console.error('Error creating comment notifications:', notifError);
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
