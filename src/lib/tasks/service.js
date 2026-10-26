/**
 * Task domain logic shared by the REST routes and the AI assistant's tools, so
 * both paths apply the same permission rules and notification side effects.
 */

export const TASK_STATUSES = ['pending', 'in-progress', 'completed'];
export const TASK_PRIORITIES = ['low', 'medium', 'high'];
export const MAX_ASSIGNEES = 2;

const NOTIFICATION_TTL_MS = 6 * 60 * 60 * 1000;
const REMINDER_DELAY_MS = 3 * 60 * 60 * 1000;

const USER_SELECT = { id: true, name: true, email: true };

/** Prisma filter for tasks a user created or is assigned to. */
export function visibleTaskWhere(userId) {
  return { OR: [{ createdBy: userId }, { assignedTo: { has: userId } }] };
}

/** What `userId` may do with `task`, mirroring the existing route rules. */
export function getTaskPermissions(task, userId) {
  const isCreator = task.createdBy === userId;
  const isAssignee = (task.assignedTo || []).includes(userId);
  const isMember = isCreator || isAssignee;
  const locked = task.status === 'completed' && !isCreator;
  return {
    isCreator,
    isAssignee,
    canView: isMember,
    canChangeStatus: isMember && !locked,
    canEdit: isMember && !locked,
    canReassign: isCreator,
    canComment: isMember,
    canDelete: isCreator,
  };
}

export async function withAssignedUsers(prisma, task) {
  const assignedUsers = await prisma.user.findMany({
    where: { id: { in: task.assignedTo } },
    select: USER_SELECT,
  });
  return { ...task, assignedUsers };
}

async function notify(prisma, userIds, { taskId, type, message, nextReminderAt = null }) {
  const now = Date.now();
  await Promise.all(
    [...new Set(userIds)].map((userId) =>
      prisma.notification.create({
        data: {
          userId,
          taskId,
          type,
          message,
          ...(nextReminderAt ? { nextReminderAt } : {}),
          expiresAt: new Date(now + NOTIFICATION_TTL_MS),
        },
      })
    )
  );
}

/**
 * Create a task and notify its assignees. `data` must already be validated.
 */
export async function createTask(prisma, creatorId, data) {
  const task = await prisma.task.create({
    data: {
      equipment: data.equipment,
      area: data.area,
      title: data.title,
      description: data.description,
      priority: data.priority || 'medium',
      assignedTo: data.assignedTo,
      createdBy: creatorId,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
    include: { creator: { select: USER_SELECT } },
  });

  try {
    await notify(prisma, task.assignedTo, {
      taskId: task.id,
      type: 'assigned',
      message: `You have been assigned to task: ${task.title} (${task.equipment} - ${task.area})`,
      nextReminderAt: new Date(Date.now() + REMINDER_DELAY_MS),
    });
  } catch (error) {
    // Notifications are best-effort; the task itself was created.
    console.error('Error creating assignment notifications:', error.message);
  }

  return task;
}

const STATUS_MESSAGES = {
  pending: 'is now pending',
  'in-progress': 'is now in progress',
  completed: 'has been completed',
};

/**
 * Move a task to `status`, maintaining completedAt and notifying everyone
 * involved except the actor. Caller must have checked permissions.
 */
export async function changeTaskStatus(prisma, task, actorId, status) {
  const data = { status };
  if (status === 'completed' && task.status !== 'completed') data.completedAt = new Date();
  if (status !== 'completed' && task.status === 'completed') data.completedAt = null;

  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data,
    include: { creator: { select: USER_SELECT } },
  });

  if (status !== task.status) {
    const recipients = updatedTask.assignedTo.filter((id) => id !== actorId);
    if (task.createdBy !== actorId && !updatedTask.assignedTo.includes(task.createdBy)) {
      recipients.push(task.createdBy);
    }
    await notify(prisma, recipients, {
      taskId: updatedTask.id,
      type: 'status_update',
      message: `Task "${updatedTask.title}" ${STATUS_MESSAGES[status]}`,
    });
  }

  return updatedTask;
}

/**
 * Update editable fields (title, description, priority, dueDate, area,
 * assignedTo). Caller must have checked permissions; newly added assignees are
 * notified.
 */
export async function updateTaskFields(prisma, task, actorId, changes) {
  const data = {};
  for (const key of ['title', 'description', 'priority', 'area']) {
    if (changes[key] !== undefined) data[key] = changes[key];
  }
  if (changes.dueDate !== undefined) data.dueDate = changes.dueDate ? new Date(changes.dueDate) : null;
  if (changes.assignedTo !== undefined) data.assignedTo = changes.assignedTo;

  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data,
    include: { creator: { select: USER_SELECT } },
  });

  if (changes.assignedTo !== undefined) {
    const added = changes.assignedTo.filter((id) => !task.assignedTo.includes(id) && id !== actorId);
    if (added.length) {
      await notify(prisma, added, {
        taskId: task.id,
        type: 'assigned',
        message: `You have been assigned to task: ${updatedTask.title} (${updatedTask.equipment} - ${updatedTask.area})`,
        nextReminderAt: new Date(Date.now() + REMINDER_DELAY_MS),
      });
    }
  }

  return updatedTask;
}

/** Add a comment and notify the task's participants except the author. */
export async function addTaskComment(prisma, task, author, content, parentId = null) {
  const comment = await prisma.comment.create({
    data: { content: content.trim(), taskId: task.id, authorId: author.id, parentId },
    include: { author: { select: USER_SELECT } },
  });

  const recipients = new Set(task.assignedTo.filter((id) => id !== author.id));
  if (task.createdBy !== author.id) recipients.add(task.createdBy);

  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { authorId: true } });
    if (parent && parent.authorId !== author.id) recipients.add(parent.authorId);
  }

  try {
    await notify(prisma, [...recipients], {
      taskId: task.id,
      type: 'comment',
      message: parentId
        ? `${author.name} replied to a comment on "${task.title}"`
        : `${author.name} commented on "${task.title}"`,
    });
  } catch (error) {
    console.error('Error creating comment notifications:', error.message);
  }

  return comment;
}
