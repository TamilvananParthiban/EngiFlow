import { prisma } from '../config/database';
import { subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from '../utils/dateUtils';

export async function getDashboardSummary() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    totalAssets,
    activeAssets,
    openTickets,
    pendingTasks,
    todayTasks,
    overdueTasks,
    amcExpiringSoon,
    warrantyExpiringSoon,
    pendingBills,
    monthExpense,
    todayActivities,
    completedActivitiesToday,
    dueTodayFollowups,
    overdueFollowups,
    backupFailures,
    activeRentals,
    cctvOffline,
  ] = await Promise.all([
    // Total assets
    prisma.asset.count({ where: { deletedAt: null } }),

    // Active assets
    prisma.asset.count({ where: { status: 'ACTIVE', deletedAt: null } }),

    // Open tickets
    prisma.ticket.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_VENDOR', 'WAITING_FOR_USER'] }, deletedAt: null },
    }),

    // Pending tasks
    prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS', 'WAITING'] } } }),

    // Today's tasks
    prisma.task.count({
      where: {
        OR: [
          { dueDate: { gte: todayStart, lte: todayEnd } },
          { startDate: { gte: todayStart, lte: todayEnd } },
        ],
        status: { not: 'COMPLETED' },
      },
    }),

    // Overdue tasks
    prisma.task.count({
      where: {
        dueDate: { lt: todayStart },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),

    // AMC expiring in 30 days
    prisma.aMCContract.count({
      where: {
        endDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        renewalStatus: { in: ['ACTIVE', 'EXPIRING_SOON'] },
      },
    }),

    // Warranty expiring in 30 days
    prisma.warranty.count({
      where: {
        warrantyEnd: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
      },
    }),

    // Pending vendor bills
    prisma.invoice.count({
      where: { paymentStatus: { in: ['PENDING', 'OVERDUE'] } },
    }),

    // Monthly IT expense
    prisma.expense.aggregate({
      _sum: { totalAmount: true },
      where: {
        expenseDate: { gte: monthStart, lte: monthEnd },
      },
    }),

    // Today's activities
    prisma.activity.count({
      where: { date: { gte: todayStart, lte: todayEnd } },
    }),

    // Completed activities today
    prisma.activity.count({
      where: { date: { gte: todayStart, lte: todayEnd }, status: 'COMPLETED' },
    }),

    // Followups due today
    prisma.followup.count({
      where: { followupDate: { gte: todayStart, lte: todayEnd }, status: { not: 'COMPLETED' } },
    }),

    // Overdue followups
    prisma.followup.count({
      where: { followupDate: { lt: todayStart }, status: { not: 'COMPLETED' } },
    }),

    // Recent backup failures (last 24h)
    prisma.backupLog.count({
      where: {
        status: 'FAILED',
        backupDate: { gte: subDays(now, 1) },
      },
    }),

    // Active laptop rentals
    prisma.laptopRental.count({
      where: { returnDate: null, rentalEnd: { gte: now } },
    }),

    // CCTV offline cameras
    prisma.cCTVCamera.count({ where: { status: { in: ['OFFLINE', 'FAULT'] } } }),
  ]);

  // Calculate network uptime for current month
  const monthlyDowntimeMinutes = await prisma.networkDowntime.aggregate({
    _sum: { durationMinutes: true },
    where: {
      date: { gte: monthStart, lte: monthEnd },
    },
  });

  const totalMinutesInMonth = (now.getDate() * 24 * 60);
  const downtimeMinutes = monthlyDowntimeMinutes._sum.durationMinutes || 0;
  const uptimePercent = totalMinutesInMonth > 0
    ? (((totalMinutesInMonth - downtimeMinutes) / totalMinutesInMonth) * 100).toFixed(2)
    : '100.00';

  return {
    totalAssets,
    activeAssets,
    openTickets,
    pendingTasks,
    todayTasks,
    overdueTasks,
    networkUptime: parseFloat(uptimePercent),
    internetDowntimeHours: parseFloat((downtimeMinutes / 60).toFixed(2)),
    amcExpiringSoon,
    warrantyExpiringSoon,
    pendingBills,
    monthlyExpense: monthExpense._sum.totalAmount || 0,
    todayActivities,
    completedActivitiesToday,
    dueTodayFollowups,
    overdueFollowups,
    backupFailures,
    activeRentals,
    cctvOffline,
  };
}

export async function getDashboardCharts() {
  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      start: startOfMonth(d),
      end: endOfMonth(d),
    });
  }

  // Incident trend (last 6 months)
  const incidentTrend = await Promise.all(
    months.map(async (m) => ({
      month: m.label,
      count: await prisma.ticket.count({
        where: { date: { gte: m.start, lte: m.end }, deletedAt: null },
      }),
    })),
  );

  // Monthly expense (last 6 months)
  const expenseTrend = await Promise.all(
    months.map(async (m) => {
      const agg = await prisma.expense.aggregate({
        _sum: { totalAmount: true },
        where: { expenseDate: { gte: m.start, lte: m.end } },
      });
      return { month: m.label, amount: Number(agg._sum.totalAmount || 0) };
    }),
  );

  // Asset distribution
  const assetDistribution = await prisma.asset.groupBy({
    by: ['type'],
    _count: { id: true },
    where: { deletedAt: null },
    orderBy: { _count: { id: 'desc' } },
  });

  // Ticket categories
  const ticketCategories = await prisma.ticket.groupBy({
    by: ['category'],
    _count: { id: true },
    where: { deletedAt: null },
    orderBy: { _count: { id: 'desc' } },
  });

  // PM status summary
  const pmStatus = await prisma.preventiveMaintenance.groupBy({
    by: ['status'],
    _count: { id: true },
    where: {
      scheduledDate: {
        gte: startOfMonth(now),
        lte: endOfMonth(now),
      },
    },
  });

  // Monthly downtime (last 6 months)
  const downtimeTrend = await Promise.all(
    months.map(async (m) => {
      const agg = await prisma.networkDowntime.aggregate({
        _sum: { durationMinutes: true },
        where: { date: { gte: m.start, lte: m.end } },
      });
      const minutes = agg._sum.durationMinutes || 0;
      const totalMinutes = (m.end.getDate()) * 24 * 60;
      const uptime = totalMinutes > 0 ? parseFloat(((totalMinutes - minutes) / totalMinutes * 100).toFixed(2)) : 100;
      return { month: m.label, downtimeHours: parseFloat((minutes / 60).toFixed(2)), uptime };
    }),
  );

  // Vendor expense (top 5 vendors this month)
  const vendorExpense = await prisma.expense.groupBy({
    by: ['vendorId'],
    _sum: { totalAmount: true },
    where: { expenseDate: { gte: startOfMonth(now), lte: endOfMonth(now) }, vendorId: { not: null } },
    orderBy: { _sum: { totalAmount: 'desc' } },
    take: 5,
  });

  const vendorExpenseWithNames = await Promise.all(
    vendorExpense.map(async (ve) => {
      const vendor = ve.vendorId ? await prisma.vendor.findUnique({ where: { id: ve.vendorId }, select: { name: true } }) : null;
      return {
        vendor: vendor?.name || 'Unknown',
        amount: Number(ve._sum.totalAmount || 0),
      };
    }),
  );

  return {
    incidentTrend,
    expenseTrend,
    assetDistribution: assetDistribution.map((a) => ({
      type: a.type,
      count: a._count.id,
    })),
    ticketCategories: ticketCategories.map((t) => ({
      category: t.category,
      count: t._count.id,
    })),
    pmStatus: pmStatus.map((p) => ({
      status: p.status,
      count: p._count.id,
    })),
    downtimeTrend,
    vendorExpense: vendorExpenseWithNames,
  };
}
