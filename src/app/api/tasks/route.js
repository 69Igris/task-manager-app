import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/tasks - Get all tasks or filtered tasks
export async function GET(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const { searchParams } = new URL(request.url);
    const myTasks = searchParams.get('myTasks'); // Filter for current user's tasks
    const createdByMe = searchParams.get('createdByMe'); // Filter for tasks created by user
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where = {};

    // Filter by assigned user
    if (myTasks === 'true') {
      where.assignedTo = { has: user.id };
    }

    // Filter by created by user
    if (createdByMe === 'true') {
      where.createdBy = user.id;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by date range (for completed tasks, use completedAt; otherwise use dueDate)
    if (startDate || endDate) {
      if (status === 'completed') {
        where.completedAt = {};
        if (startDate) where.completedAt.gte = new Date(startDate);
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          where.completedAt.lte = endOfDay;
        }
      } else {
        where.dueDate = {};
        if (startDate) where.dueDate.gte = new Date(startDate);
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          where.dueDate.lte = endOfDay;
        }
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch assigned users for each task
    const tasksWithAssignees = await Promise.all(
      tasks.map(async (task) => {
        const assignedUsers = await prisma.user.findMany({
          where: { id: { in: task.assignedTo } },
          select: { id: true, name: true, email: true },
        });
        return { ...task, assignedUsers };
      })
    );

    return NextResponse.json({ tasks: tasksWithAssignees });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const body = await request.json();
    const { equipment, area, title, description, priority, assignedTo, dueDate } = body;

    // Validate required fields
    if (!equipment || !area || !title || !assignedTo || assignedTo.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate max 2 assignees
    if (assignedTo.length > 2) {
      return NextResponse.json(
        { error: 'Maximum 2 people can be assigned to a task' },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        equipment,
        area,
        title,
        description,
        priority: priority || 'medium',
        assignedTo,
        createdBy: user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Fetch assigned users
    const assignedUsers = await prisma.user.findMany({
      where: { id: { in: task.assignedTo } },
      select: { id: true, name: true, email: true },
    });

    // Create notifications for assigned users
    try {
      const now = new Date();
      const nextReminder = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
      const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours from now

      console.log('Creating notifications for users:', task.assignedTo);
      console.log('Task details:', { id: task.id, title: task.title, equipment: task.equipment, area: task.area });
      
      const notificationPromises = task.assignedTo.map(userId => {
        console.log('Creating notification for userId:', userId);
        return prisma.notification.create({
          data: {
            userId,
            taskId: task.id,
            type: 'assigned',
            message: `You have been assigned to task: ${task.title} (${task.equipment} - ${task.area})`,
            nextReminderAt: nextReminder,
            expiresAt,
          },
        });
      });

      const createdNotifications = await Promise.all(notificationPromises);
      console.log('✅ Notifications created successfully:', createdNotifications.length);
      console.log('Created notification IDs:', createdNotifications.map(n => n.id));
    } catch (notificationError) {
      console.error('❌ ERROR creating notifications:', notificationError);
      console.error('Error name:', notificationError.name);
      console.error('Error message:', notificationError.message);
      console.error('Error stack:', notificationError.stack);
      // Continue even if notifications fail
    }

    console.log('📤 Returning task response with status 201');
    return NextResponse.json({ ...task, assignedUsers }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
