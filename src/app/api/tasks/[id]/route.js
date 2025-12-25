import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/tasks/[id] - Get single task
export async function GET(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        comments: {
          where: { parentId: null },
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
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Fetch assigned users
    const assignedUsers = await prisma.user.findMany({
      where: { id: { in: task.assignedTo } },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ task: { ...task, assignedUsers } });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

// PATCH /api/tasks/[id] - Update task status
export async function PATCH(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['pending', 'in-progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get current task
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check permissions
    const isCreator = task.createdBy === user.id;
    const isAssignee = task.assignedTo.includes(user.id);

    if (!isCreator && !isAssignee) {
      return NextResponse.json({ error: 'You do not have permission to update this task' }, { status: 403 });
    }

    // If task is completed and user is not creator, deny update
    if (task.status === 'completed' && !isCreator) {
      return NextResponse.json(
        { error: 'Only the task creator can modify a completed task' },
        { status: 403 }
      );
    }

    // Update task
    const updateData = { status };
    
    // Set completedAt when status changes to completed
    if (status === 'completed' && task.status !== 'completed') {
      updateData.completedAt = new Date();
    }
    
    // Clear completedAt if status changes from completed
    if (status !== 'completed' && task.status === 'completed') {
      updateData.completedAt = null;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Fetch assigned users
    const assignedUsers = await prisma.user.findMany({
      where: { id: { in: updatedTask.assignedTo } },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ task: { ...updatedTask, assignedUsers } });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Delete task (creator only)
export async function DELETE(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const { id } = await params;

    // Get current task
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only creator can delete
    if (task.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Only the task creator can delete this task' },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
