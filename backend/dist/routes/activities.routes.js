"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const idGenerator_1 = require("../utils/idGenerator");
const auditLog_1 = require("../utils/auditLog");
const zod_1 = require("zod");
require("express-async-errors");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
const activitySchema = zod_1.z.object({
    date: zod_1.z.string().min(1),
    startTime: zod_1.z.string().optional(),
    endTime: zod_1.z.string().optional(),
    title: zod_1.z.string().min(1).max(200),
    category: zod_1.z.string().min(1),
    priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    description: zod_1.z.string().optional(),
    actionTaken: zod_1.z.string().optional(),
    assetId: zod_1.z.string().optional(),
    departmentId: zod_1.z.string().optional(),
    vendorId: zod_1.z.string().optional(),
    status: zod_1.z.string().default('PLANNED'),
    followupRequired: zod_1.z.boolean().default(false),
    followupDate: zod_1.z.string().optional(),
    remarks: zod_1.z.string().optional(),
});
// GET /api/v1/activities
router.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { status, category, date, startDate, endDate, search } = req.query;
    const where = {};
    if (status)
        where.status = status;
    if (category)
        where.category = category;
    if (date)
        where.date = new Date(date);
    if (startDate && endDate)
        where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    if (search)
        where.title = { contains: search };
    const [data, total] = await Promise.all([
        database_1.prisma.activity.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
            include: {
                asset: { select: { id: true, assetCode: true, brand: true, model: true } },
                vendor: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
            },
        }),
        database_1.prisma.activity.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'Activities retrieved', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
// GET /api/v1/activities/today
router.get('/today', async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const activities = await database_1.prisma.activity.findMany({
        where: { date: { gte: today, lte: todayEnd } },
        orderBy: { startTime: 'asc' },
        include: {
            asset: { select: { id: true, assetCode: true, brand: true, model: true } },
            vendor: { select: { id: true, name: true } },
        },
    });
    const summary = {
        total: activities.length,
        completed: activities.filter((a) => a.status === 'COMPLETED').length,
        pending: activities.filter((a) => a.status === 'PENDING').length,
        inProgress: activities.filter((a) => a.status === 'IN_PROGRESS').length,
        vendorFollowups: activities.filter((a) => a.vendorId).length,
    };
    (0, response_1.sendSuccess)(res, { activities, summary });
});
// GET /api/v1/activities/:id
router.get('/:id', async (req, res) => {
    const activity = await database_1.prisma.activity.findUnique({
        where: { id: req.params.id },
        include: {
            asset: true,
            vendor: true,
            department: true,
            createdBy: { select: { id: true, name: true } },
        },
    });
    if (!activity) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    (0, response_1.sendSuccess)(res, activity);
});
// POST /api/v1/activities
router.post('/', async (req, res) => {
    const result = activitySchema.safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const code = await (0, idGenerator_1.generateActivityCode)();
    const activity = await database_1.prisma.activity.create({
        data: {
            ...result.data,
            activityCode: code,
            date: new Date(result.data.date),
            followupDate: result.data.followupDate ? new Date(result.data.followupDate) : null,
            category: result.data.category,
            priority: result.data.priority,
            status: result.data.status,
            createdById: req.user.id,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'activities', recordId: activity.id, recordCode: code });
    (0, response_1.sendCreated)(res, activity, 'Activity created successfully');
});
// PUT /api/v1/activities/:id
router.put('/:id', async (req, res) => {
    const existing = await database_1.prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const result = activitySchema.partial().safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const activity = await database_1.prisma.activity.update({
        where: { id: req.params.id },
        data: {
            ...result.data,
            date: result.data.date ? new Date(result.data.date) : undefined,
            followupDate: result.data.followupDate ? new Date(result.data.followupDate) : undefined,
            category: result.data.category,
            priority: result.data.priority,
            status: result.data.status,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'UPDATE', module: 'activities', recordId: activity.id, recordCode: activity.activityCode });
    (0, response_1.sendSuccess)(res, activity, 'Activity updated');
});
// DELETE /api/v1/activities/:id
router.delete('/:id', async (req, res) => {
    const existing = await database_1.prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    await database_1.prisma.activity.delete({ where: { id: req.params.id } });
    await (0, auditLog_1.createAuditLog)({ req, action: 'DELETE', module: 'activities', recordId: req.params.id });
    (0, response_1.sendSuccess)(res, null, 'Activity deleted');
});
// POST /api/v1/activities/bulk-delete
router.post('/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        (0, response_1.sendBadRequest)(res, 'Array of activity IDs required');
        return;
    }
    await database_1.prisma.activity.deleteMany({ where: { id: { in: ids } } });
    await (0, auditLog_1.createAuditLog)({ req, action: 'DELETE', module: 'activities', recordId: 'BULK_DELETE', recordCode: `${ids.length} activities deleted` });
    (0, response_1.sendSuccess)(res, null, `${ids.length} activities deleted successfully`);
});
// POST /api/v1/activities/:id/duplicate
router.post('/:id/duplicate', async (req, res) => {
    const existing = await database_1.prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const code = await (0, idGenerator_1.generateActivityCode)();
    const activity = await database_1.prisma.activity.create({
        data: {
            activityCode: code,
            date: new Date(),
            title: `${existing.title} (Copy)`,
            category: existing.category,
            priority: existing.priority,
            description: existing.description,
            actionTaken: existing.actionTaken,
            assetId: existing.assetId,
            departmentId: existing.departmentId,
            vendorId: existing.vendorId,
            status: 'PLANNED',
            remarks: existing.remarks,
            createdById: req.user.id,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'activities', recordId: activity.id, recordCode: code });
    (0, response_1.sendCreated)(res, activity, 'Activity duplicated');
});
// POST /api/v1/activities/:id/timer
router.post('/:id/timer', async (req, res) => {
    const { startTime, endTime, duration } = req.body;
    const existing = await database_1.prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const activity = await database_1.prisma.activity.update({
        where: { id: req.params.id },
        data: {
            startTime: startTime || existing.startTime,
            endTime: endTime || existing.endTime,
            duration: duration !== undefined ? duration : existing.duration,
        },
    });
    (0, response_1.sendSuccess)(res, activity, 'Timer updated');
});
// EOD Summary
router.post('/eod', async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eod = await database_1.prisma.dailyEODSummary.upsert({
        where: { date_userId: { date: today, userId: req.user.id } },
        update: { ...req.body },
        create: { ...req.body, date: today, userId: req.user.id },
    });
    (0, response_1.sendSuccess)(res, eod, 'EOD summary saved');
});
router.get('/eod/today', async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eod = await database_1.prisma.dailyEODSummary.findUnique({
        where: { date_userId: { date: today, userId: req.user.id } },
    });
    (0, response_1.sendSuccess)(res, eod);
});
router.get('/eod/:date', async (req, res) => {
    const d = new Date(req.params.date);
    d.setHours(0, 0, 0, 0);
    const eod = await database_1.prisma.dailyEODSummary.findUnique({
        where: { date_userId: { date: d, userId: req.user.id } },
    });
    (0, response_1.sendSuccess)(res, eod);
});
exports.default = router;
//# sourceMappingURL=activities.routes.js.map