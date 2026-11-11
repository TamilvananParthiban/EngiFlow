"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSummary = getDashboardSummary;
exports.getDashboardCharts = getDashboardCharts;
const database_1 = require("../config/database");
const dateUtils_1 = require("../utils/dateUtils");
async function getDashboardSummary() {
    const now = new Date();
    const todayStart = (0, dateUtils_1.startOfDay)(now);
    const todayEnd = (0, dateUtils_1.endOfDay)(now);
    const monthStart = (0, dateUtils_1.startOfMonth)(now);
    const monthEnd = (0, dateUtils_1.endOfMonth)(now);
    const [totalAssets, activeAssets, openTickets, pendingTasks, todayTasks, overdueTasks, amcExpiringSoon, warrantyExpiringSoon, pendingBills, monthExpense, todayActivities, completedActivitiesToday, dueTodayFollowups, overdueFollowups, backupFailures, activeRentals, cctvOffline,] = await Promise.all([
        // Total assets
        database_1.prisma.asset.count({ where: { deletedAt: null } }),
        // Active assets
        database_1.prisma.asset.count({ where: { status: 'ACTIVE', deletedAt: null } }),
        // Open tickets
        database_1.prisma.ticket.count({
            where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_VENDOR', 'WAITING_FOR_USER'] }, deletedAt: null },
        }),
        // Pending tasks
        database_1.prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS', 'WAITING'] } } }),
        // Today's tasks
        database_1.prisma.task.count({
            where: {
                OR: [
                    { dueDate: { gte: todayStart, lte: todayEnd } },
                    { startDate: { gte: todayStart, lte: todayEnd } },
                ],
                status: { not: 'COMPLETED' },
            },
        }),
        // Overdue tasks
        database_1.prisma.task.count({
            where: {
                dueDate: { lt: todayStart },
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
        }),
        // AMC expiring in 30 days
        database_1.prisma.aMCContract.count({
            where: {
                endDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
                renewalStatus: { in: ['ACTIVE', 'EXPIRING_SOON'] },
            },
        }),
        // Warranty expiring in 30 days
        database_1.prisma.warranty.count({
            where: {
                warrantyEnd: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
                status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
            },
        }),
        // Pending vendor bills
        database_1.prisma.invoice.count({
            where: { paymentStatus: { in: ['PENDING', 'OVERDUE'] } },
        }),
        // Monthly IT expense
        database_1.prisma.expense.aggregate({
            _sum: { totalAmount: true },
            where: {
                expenseDate: { gte: monthStart, lte: monthEnd },
            },
        }),
        // Today's activities
        database_1.prisma.activity.count({
            where: { date: { gte: todayStart, lte: todayEnd } },
        }),
        // Completed activities today
        database_1.prisma.activity.count({
            where: { date: { gte: todayStart, lte: todayEnd }, status: 'COMPLETED' },
        }),
        // Followups due today
        database_1.prisma.followup.count({
            where: { followupDate: { gte: todayStart, lte: todayEnd }, status: { not: 'COMPLETED' } },
        }),
        // Overdue followups
        database_1.prisma.followup.count({
            where: { followupDate: { lt: todayStart }, status: { not: 'COMPLETED' } },
        }),
        // Recent backup failures (last 24h)
        database_1.prisma.backupLog.count({
            where: {
                status: 'FAILED',
                backupDate: { gte: (0, dateUtils_1.subDays)(now, 1) },
            },
        }),
        // Active laptop rentals
        database_1.prisma.laptopRental.count({
            where: { returnDate: null, rentalEnd: { gte: now } },
        }),
        // CCTV offline cameras
        database_1.prisma.cCTVCamera.count({ where: { status: { in: ['OFFLINE', 'FAULT'] } } }),
    ]);
    // Calculate network uptime for current month
    const monthlyDowntimeMinutes = await database_1.prisma.networkDowntime.aggregate({
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
async function getDashboardCharts() {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
            start: (0, dateUtils_1.startOfMonth)(d),
            end: (0, dateUtils_1.endOfMonth)(d),
        });
    }
    // Incident trend (last 6 months)
    const incidentTrend = await Promise.all(months.map(async (m) => ({
        month: m.label,
        count: await database_1.prisma.ticket.count({
            where: { date: { gte: m.start, lte: m.end }, deletedAt: null },
        }),
    })));
    // Monthly expense (last 6 months)
    const expenseTrend = await Promise.all(months.map(async (m) => {
        const agg = await database_1.prisma.expense.aggregate({
            _sum: { totalAmount: true },
            where: { expenseDate: { gte: m.start, lte: m.end } },
        });
        return { month: m.label, amount: Number(agg._sum.totalAmount || 0) };
    }));
    // Asset distribution
    const assetDistribution = await database_1.prisma.asset.groupBy({
        by: ['type'],
        _count: { id: true },
        where: { deletedAt: null },
        orderBy: { _count: { id: 'desc' } },
    });
    // Ticket categories
    const ticketCategories = await database_1.prisma.ticket.groupBy({
        by: ['category'],
        _count: { id: true },
        where: { deletedAt: null },
        orderBy: { _count: { id: 'desc' } },
    });
    // PM status summary
    const pmStatus = await database_1.prisma.preventiveMaintenance.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
            scheduledDate: {
                gte: (0, dateUtils_1.startOfMonth)(now),
                lte: (0, dateUtils_1.endOfMonth)(now),
            },
        },
    });
    // Monthly downtime (last 6 months)
    const downtimeTrend = await Promise.all(months.map(async (m) => {
        const agg = await database_1.prisma.networkDowntime.aggregate({
            _sum: { durationMinutes: true },
            where: { date: { gte: m.start, lte: m.end } },
        });
        const minutes = agg._sum.durationMinutes || 0;
        const totalMinutes = (m.end.getDate()) * 24 * 60;
        const uptime = totalMinutes > 0 ? parseFloat(((totalMinutes - minutes) / totalMinutes * 100).toFixed(2)) : 100;
        return { month: m.label, downtimeHours: parseFloat((minutes / 60).toFixed(2)), uptime };
    }));
    // Vendor expense (top 5 vendors this month)
    const vendorExpense = await database_1.prisma.expense.groupBy({
        by: ['vendorId'],
        _sum: { totalAmount: true },
        where: { expenseDate: { gte: (0, dateUtils_1.startOfMonth)(now), lte: (0, dateUtils_1.endOfMonth)(now) }, vendorId: { not: null } },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
    });
    const vendorExpenseWithNames = await Promise.all(vendorExpense.map(async (ve) => {
        const vendor = ve.vendorId ? await database_1.prisma.vendor.findUnique({ where: { id: ve.vendorId }, select: { name: true } }) : null;
        return {
            vendor: vendor?.name || 'Unknown',
            amount: Number(ve._sum.totalAmount || 0),
        };
    }));
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
//# sourceMappingURL=dashboard.service.js.map