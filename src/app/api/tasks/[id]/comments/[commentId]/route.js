import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// PATCH /api/tasks/[id]/comments/[commentId] - Update a comment
export async function PATCH(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const { id, commentId } = await params;
    const body = await request.json();
    const { content } = body;

    // Validate input
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Comment is too long (max 2000 characters)' }, { status: 400 });
    }

    // Get the comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Verify comment belongs to this task
    if (comment.taskId !== id) {
      return NextResponse.json({ error: 'Comment does not belong to this task' }, { status: 400 });
    }

    // Check permissions - only author can edit
    if (comment.authorId !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 });
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ comment: updatedComment });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]/comments/[commentId] - Delete a comment
export async function DELETE(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const { id, commentId } = await params;

    // Get the comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          select: { createdBy: true },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Verify comment belongs to this task
    if (comment.taskId !== id) {
      return NextResponse.json({ error: 'Comment does not belong to this task' }, { status: 400 });
    }

    // Check permissions - only author or task creator can delete
    const isAuthor = comment.authorId === user.id;
    const isTaskCreator = comment.task.createdBy === user.id;

    if (!isAuthor && !isTaskCreator) {
      return NextResponse.json(
        { error: 'You can only delete your own comments or comments on tasks you created' },
        { status: 403 }
      );
    }

    // Delete comment (and all its replies due to cascade)
    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
