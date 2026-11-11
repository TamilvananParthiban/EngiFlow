import { prisma } from '../config/database';
import { startOfDay, endOfDay } from '../utils/dateUtils';

export async function generateOperationalNotifications(userId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // 1. Task due today
  const dueTodayTasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: todayStart, lte: todayEnd },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
      assignedUserId: userId,
    },
  });

  for (const t of dueTodayTasks) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'TASK_DUE',
        message: { contains: t.taskCode },
        createdAt: { gte: todayStart },
      },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          userId,
          title: `Task Due Today: ${t.taskCode}`,
          message: `Task "${t.title}" is due today.`,
          type: 'TASK_DUE',
        },
      });
    }
  }

  // 2. Task Overdue
  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: todayStart },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
      assignedUserId: userId,
    },
  });

  for (const t of overdueTasks) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'TASK_OVERDUE',
        message: { contains: t.taskCode },
        createdAt: { gte: todayStart },
      },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          userId,
          title: `Task Overdue: ${t.taskCode}`,
          message: `Task "${t.title}" was due on ${t.dueDate ? t.dueDate.toISOString().split('T')[0] : 'past date'}.`,
          type: 'TASK_OVERDUE',
        },
      });
    }
  }

  // 3. Follow-up due today / overdue
  const dueFollowups = await prisma.followup.findMany({
    where: {
      followupDate: { lte: todayEnd },
      status: { not: 'COMPLETED' },
      userId,
    },
  });

  for (const f of dueFollowups) {
    const isOverdue = f.followupDate < todayStart;
    const typeStr = isOverdue ? 'FOLLOWUP_OVERDUE' : 'FOLLOWUP_DUE';
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: typeStr,
        message: { contains: f.followupCode },
        createdAt: { gte: todayStart },
      },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          userId,
          title: `${isOverdue ? 'Follow-up Overdue' : 'Follow-up Due Today'}: ${f.followupCode}`,
          message: `Follow-up "${f.subject}" ${isOverdue ? 'was scheduled for' : 'is scheduled today'}.`,
          type: typeStr,
        },
      });
    }
  }
}
