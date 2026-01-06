 import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/notifications/check-reminders - Check and create reminder notifications
export async function POST(request) {
  try {
    const now = new Date();

    // Find all notifications that need reminders sent
    const notificationsNeedingReminders = await prisma.notification.findMany({
      where: {
        type: 'assigned',
        nextReminderAt: {
          lte: now, // Next reminder time has passed
        },
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    let remindersCreated = 0;

    for (const notification of notificationsNeedingReminders) {
      // Get the task details
      const task = await prisma.task.findUnique({
        where: { id: notification.taskId },
      });

      // Only send reminder if task is still pending or in-progress
      if (task && (task.status === 'pending' || task.status === 'in-progress')) {
        // Create a new reminder notification
        const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours from now
        await prisma.notification.create({
          data: {
            userId: notification.userId,
            taskId: notification.taskId,
            type: 'reminder',
            message: `Reminder: Task "${task.title}" (${task.equipment} - ${task.area}) is still ${task.status}`,
            isRead: false,
            expiresAt,
          },
        });

        // Update the next reminder time (3 hours from now)
        const nextReminder = new Date(now.getTime() + 3 * 60 * 60 * 1000);
        await prisma.notification.update({
          where: { id: notification.id },
          data: { nextReminderAt: nextReminder },
        });

        remindersCreated++;
      } else if (task && task.status === 'completed') {
        // If task is completed, stop sending reminders
        await prisma.notification.update({
          where: { id: notification.id },
          data: { nextReminderAt: null },
        });
      }
    }

    return NextResponse.json({
      message: `Checked reminders, created ${remindersCreated} new reminder notifications`,
      remindersCreated,
    });
  } catch (error) {
    console.error('Error checking reminders:', error);
    return NextResponse.json({ error: 'Failed to check reminders' }, { status: 500 });
  }
}
