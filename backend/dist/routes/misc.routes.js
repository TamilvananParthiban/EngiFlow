"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarRouter = exports.kpiRouter = exports.locRouter = exports.deptRouter = exports.auditRouter = exports.usersRouter = exports.notifRouter = exports.searchRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
require("express-async-errors");
const router = (0, express_1.Router)();
exports.searchRouter = router;
router.use(authenticate_1.authenticate);
// Global search across all modules
router.get('/', async (req, res) => {
    const { q, modules } = req.query;
    if (!q || q.trim().length < 2) {
        (0, response_1.sendBadRequest)(res, 'Search query must be at least 2 characters');
        return;
    }
    const search = q.trim();
    const searchModules = modules ? modules.split(',') : ['assets', 'vendors', 'tickets', 'tasks', 'invoices'];
    const results = {};
    await Promise.all(searchModules.map(async (mod) => {
        switch (mod) {
            case 'assets':
                results.assets = await database_1.prisma.asset.findMany({
                    where: {
                        deletedAt: null,
                        OR: [
                            { assetCode: { contains: search } },
                            { brand: { contains: search } },
                            { model: { contains: search } },
                            { serialNumber: { contains: search } },
                            { hostname: { contains: search } },
                        ],
                    },
                    take: 5,
                    select: { id: true, assetCode: true, brand: true, model: true, type: true, status: true },
                });
                break;
            case 'vendors':
                results.vendors = await database_1.prisma.vendor.findMany({
                    where: {
                        deletedAt: null,
                        OR: [{ name: { contains: search } }, { vendorCode: { contains: search } }],
                    },
                    take: 5,
                    select: { id: true, vendorCode: true, name: true, type: true, status: true },
                });
                break;
            case 'tickets':
                results.tickets = await database_1.prisma.ticket.findMany({
                    where: {
                        deletedAt: null,
                        OR: [{ ticketNumber: { contains: search } }, { subject: { contains: search } }],
                    },
                    take: 5,
                    select: { id: true, ticketNumber: true, subject: true, status: true, priority: true },
                });
                break;
            case 'tasks':
                results.tasks = await database_1.prisma.task.findMany({
                    where: { OR: [{ taskCode: { contains: search } }, { title: { contains: search } }] },
                    take: 5,
                    select: { id: true, taskCode: true, title: true, status: true, priority: true },
                });
                break;
            case 'invoices':
                results.invoices = await database_1.prisma.invoice.findMany({
                    where: {
                        OR: [{ invoiceCode: { contains: search } }, { invoiceNumber: { contains: search } }],
                    },
                    take: 5,
                    select: { id: true, invoiceCode: true, invoiceNumber: true, totalAmount: true, paymentStatus: true },
                });
                break;
            case 'amc':
                results.amc = await database_1.prisma.aMCContract.findMany({
                    where: { OR: [{ amcCode: { contains: search } }, { serviceType: { contains: search } }] },
                    take: 5,
                    select: { id: true, amcCode: true, serviceType: true, renewalStatus: true },
                });
                break;
        }
    }));
    (0, response_1.sendSuccess)(res, results);
});
// Notifications
const notification_service_1 = require("../services/notification.service");
const notifRouter = (0, express_1.Router)();
exports.notifRouter = notifRouter;
notifRouter.use(authenticate_1.authenticate);
notifRouter.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    // Generate deduplicated operational notifications for tasks & followups
    try {
        await (0, notification_service_1.generateOperationalNotifications)(req.user.id);
    }
    catch (err) {
        // Non-blocking
    }
    const [data, total] = await Promise.all([
        database_1.prisma.notification.findMany({
            where: { OR: [{ userId: req.user.id }, { userId: null }] },
            skip, take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        database_1.prisma.notification.count({ where: { OR: [{ userId: req.user.id }, { userId: null }] } }),
    ]);
    const unread = await database_1.prisma.notification.count({
        where: { OR: [{ userId: req.user.id }, { userId: null }], isRead: false },
    });
    (0, response_1.sendSuccess)(res, { notifications: data, unread }, 'Notifications', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
notifRouter.patch('/:id/read', async (req, res) => {
    await database_1.prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true, readAt: new Date() } });
    (0, response_1.sendSuccess)(res, null, 'Marked as read');
});
notifRouter.patch('/read-all', async (req, res) => {
    await database_1.prisma.notification.updateMany({
        where: { userId: req.user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
    });
    (0, response_1.sendSuccess)(res, null, 'All notifications marked as read');
});
// Users
const usersRouter = (0, express_1.Router)();
exports.usersRouter = usersRouter;
usersRouter.use(authenticate_1.authenticate);
usersRouter.get('/', async (_req, res) => {
    const users = await database_1.prisma.user.findMany({
        where: { deletedAt: null },
        select: {
            id: true, employeeId: true, name: true, email: true, role: true, status: true,
            phone: true, designation: true, avatar: true, lastLoginAt: true,
            department: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
    });
    (0, response_1.sendSuccess)(res, users);
});
usersRouter.get('/:id', async (req, res) => {
    const user = await database_1.prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
            id: true, employeeId: true, name: true, email: true, role: true, status: true,
            phone: true, designation: true, avatar: true, lastLoginAt: true,
            department: { select: { id: true, name: true } },
        },
    });
    if (!user) {
        (0, response_1.sendSuccess)(res, null, 'User not found');
        return;
    }
    (0, response_1.sendSuccess)(res, user);
});
usersRouter.post('/', async (req, res) => {
    const { hashPassword } = await Promise.resolve().then(() => __importStar(require('../services/auth.service')));
    const passwordHash = await hashPassword(req.body.password || 'Admin@1234');
    const user = await database_1.prisma.user.create({
        data: {
            ...req.body,
            passwordHash,
            password: undefined,
        },
        select: {
            id: true, employeeId: true, name: true, email: true, role: true, status: true,
        },
    });
    (0, response_1.sendSuccess)(res, user, 'User created', 201);
});
usersRouter.put('/:id', async (req, res) => {
    const { password, ...rest } = req.body;
    const data = { ...rest };
    if (password) {
        const { hashPassword } = await Promise.resolve().then(() => __importStar(require('../services/auth.service')));
        data.passwordHash = await hashPassword(password);
    }
    const user = await database_1.prisma.user.update({
        where: { id: req.params.id },
        data,
        select: { id: true, name: true, email: true, role: true, status: true },
    });
    (0, response_1.sendSuccess)(res, user, 'User updated');
});
// Audit logs
const auditRouter = (0, express_1.Router)();
exports.auditRouter = auditRouter;
auditRouter.use(authenticate_1.authenticate);
auditRouter.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { module, userId, action } = req.query;
    const where = {};
    if (module)
        where.module = module;
    if (userId)
        where.userId = userId;
    if (action)
        where.action = action;
    const [data, total] = await Promise.all([
        database_1.prisma.auditLog.findMany({
            where, skip, take: limit,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true } } },
        }),
        database_1.prisma.auditLog.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'Audit logs', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
// Departments & Locations
const deptRouter = (0, express_1.Router)();
exports.deptRouter = deptRouter;
deptRouter.use(authenticate_1.authenticate);
deptRouter.get('/', async (_req, res) => {
    const depts = await database_1.prisma.department.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    (0, response_1.sendSuccess)(res, depts);
});
const locRouter = (0, express_1.Router)();
exports.locRouter = locRouter;
locRouter.use(authenticate_1.authenticate);
locRouter.get('/', async (_req, res) => {
    const locs = await database_1.prisma.location.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    (0, response_1.sendSuccess)(res, locs);
});
// KPI Targets
const kpiRouter = (0, express_1.Router)();
exports.kpiRouter = kpiRouter;
kpiRouter.use(authenticate_1.authenticate);
kpiRouter.get('/', async (_req, res) => {
    const targets = await database_1.prisma.kPITarget.findMany();
    (0, response_1.sendSuccess)(res, targets);
});
kpiRouter.put('/:metric', async (req, res) => {
    const target = await database_1.prisma.kPITarget.upsert({
        where: { metric: req.params.metric },
        update: { targetValue: req.body.targetValue, updatedById: req.user?.id },
        create: {
            metric: req.params.metric,
            targetValue: req.body.targetValue,
            unit: req.body.unit || '%',
            description: req.body.description,
            updatedById: req.user?.id,
        },
    });
    (0, response_1.sendSuccess)(res, target, 'KPI target updated');
});
// Calendar Unified Events
const calendarRouter = (0, express_1.Router)();
exports.calendarRouter = calendarRouter;
calendarRouter.use(authenticate_1.authenticate);
calendarRouter.get('/', async (req, res) => {
    const { start, end, types } = req.query;
    const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end ? new Date(end) : new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);
    const selectedTypes = types ? types.split(',') : ['activity', 'task', 'followup'];
    const events = [];
    if (selectedTypes.includes('activity')) {
        const activities = await database_1.prisma.activity.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            include: { createdBy: { select: { name: true } }, vendor: { select: { name: true } } },
        });
        activities.forEach((a) => {
            events.push({
                id: a.id,
                code: a.activityCode,
                title: `${a.activityCode}: ${a.title}`,
                date: a.date.toISOString().split('T')[0],
                time: a.startTime || '09:00 AM',
                type: 'activity',
                status: a.status,
                priority: a.priority,
                category: a.category,
                details: a.description || a.actionTaken || '',
            });
        });
    }
    if (selectedTypes.includes('task')) {
        const tasks = await database_1.prisma.task.findMany({
            where: { dueDate: { gte: startDate, lte: endDate } },
            include: { assignedUser: { select: { name: true } } },
        });
        tasks.forEach((t) => {
            if (t.dueDate) {
                events.push({
                    id: t.id,
                    code: t.taskCode,
                    title: `${t.taskCode}: ${t.title}`,
                    date: t.dueDate.toISOString().split('T')[0],
                    time: '05:00 PM',
                    type: 'task',
                    status: t.status,
                    priority: t.priority,
                    assignedTo: t.assignedUser?.name,
                    details: t.description || '',
                });
            }
        });
    }
    if (selectedTypes.includes('followup')) {
        const followups = await database_1.prisma.followup.findMany({
            where: { followupDate: { gte: startDate, lte: endDate } },
            include: { vendor: { select: { name: true } }, ticket: { select: { ticketNumber: true } } },
        });
        followups.forEach((f) => {
            events.push({
                id: f.id,
                code: f.followupCode,
                title: `${f.followupCode}: ${f.subject}`,
                date: f.followupDate.toISOString().split('T')[0],
                time: '10:00 AM',
                type: 'followup',
                status: f.status,
                priority: f.priority,
                vendor: f.vendor?.name,
                details: f.discussion || f.remarks || '',
            });
        });
    }
    (0, response_1.sendSuccess)(res, events);
});
//# sourceMappingURL=misc.routes.js.map