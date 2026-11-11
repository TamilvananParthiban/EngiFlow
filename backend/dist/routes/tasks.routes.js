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
const taskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    assignedUserId: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().optional(),
    status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED']).default('TODO'),
    assetId: zod_1.z.string().optional(),
    vendorId: zod_1.z.string().optional(),
    ticketId: zod_1.z.string().optional(),
    remarks: zod_1.z.string().optional(),
});
router.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { status, priority, assignedUserId, search } = req.query;
    const where = {};
    if (status)
        where.status = status;
    if (priority)
        where.priority = priority;
    if (assignedUserId)
        where.assignedUserId = assignedUserId;
    if (search)
        where.title = { contains: search };
    const [data, total] = await Promise.all([
        database_1.prisma.task.findMany({
            where, skip, take: limit,
            orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
            include: {
                assignedUser: { select: { id: true, name: true, avatar: true } },
                createdBy: { select: { id: true, name: true } },
                subtasks: true,
                asset: { select: { id: true, assetCode: true, brand: true, model: true } },
                vendor: { select: { id: true, name: true } },
            },
        }),
        database_1.prisma.task.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'Tasks retrieved', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
router.get('/kanban', async (req, res) => {
    const statuses = ['TODO', 'IN_PROGRESS', 'WAITING', 'COMPLETED'];
    const kanban = {};
    await Promise.all(statuses.map(async (s) => {
        kanban[s] = await database_1.prisma.task.findMany({
            where: { status: s },
            orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
            include: {
                assignedUser: { select: { id: true, name: true, avatar: true } },
                subtasks: true,
                asset: { select: { id: true, assetCode: true, brand: true, model: true } },
                vendor: { select: { id: true, name: true } },
            },
            take: 50,
        });
    }));
    (0, response_1.sendSuccess)(res, kanban);
});
router.get('/:id', async (req, res) => {
    const task = await database_1.prisma.task.findUnique({
        where: { id: req.params.id },
        include: {
            assignedUser: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true } },
            ticket: { select: { id: true, ticketNumber: true, subject: true } },
            asset: { select: { id: true, assetCode: true, brand: true, model: true } },
            vendor: { select: { id: true, name: true } },
            subtasks: { orderBy: { createdAt: 'asc' } },
        },
    });
    if (!task) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    (0, response_1.sendSuccess)(res, task);
});
router.post('/', async (req, res) => {
    const result = taskSchema.safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const code = await (0, idGenerator_1.generateTaskCode)();
    const task = await database_1.prisma.task.create({
        data: {
            ...result.data,
            taskCode: code,
            createdById: req.user.id,
            startDate: result.data.startDate ? new Date(result.data.startDate) : null,
            dueDate: result.data.dueDate ? new Date(result.data.dueDate) : null,
            priority: result.data.priority,
            status: result.data.status,
        },
        include: { subtasks: true },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'tasks', recordId: task.id, recordCode: code });
    (0, response_1.sendCreated)(res, task, 'Task created');
});
router.put('/:id', async (req, res) => {
    const existing = await database_1.prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const result = taskSchema.partial().safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const completedDate = result.data.status === 'COMPLETED' ? new Date() : undefined;
    const task = await database_1.prisma.task.update({
        where: { id: req.params.id },
        data: {
            ...result.data,
            startDate: result.data.startDate ? new Date(result.data.startDate) : undefined,
            dueDate: result.data.dueDate ? new Date(result.data.dueDate) : undefined,
            completedDate,
            priority: result.data.priority,
            status: result.data.status,
        },
        include: { subtasks: true },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'UPDATE', module: 'tasks', recordId: task.id, recordCode: task.taskCode });
    (0, response_1.sendSuccess)(res, task, 'Task updated');
});
router.patch('/:id/status', async (req, res) => {
    const { status } = req.body;
    const existing = await database_1.prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const task = await database_1.prisma.task.update({
        where: { id: req.params.id },
        data: {
            status: status,
            completedDate: status === 'COMPLETED' ? new Date() : undefined,
        },
    });
    (0, response_1.sendSuccess)(res, task, 'Task status updated');
});
router.delete('/:id', async (req, res) => {
    const existing = await database_1.prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    await database_1.prisma.task.delete({ where: { id: req.params.id } });
    await (0, auditLog_1.createAuditLog)({ req, action: 'DELETE', module: 'tasks', recordId: req.params.id });
    (0, response_1.sendSuccess)(res, null, 'Task deleted');
});
router.post('/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        (0, response_1.sendBadRequest)(res, 'Array of task IDs required');
        return;
    }
    await database_1.prisma.taskSubtask.deleteMany({ where: { taskId: { in: ids } } });
    await database_1.prisma.task.deleteMany({ where: { id: { in: ids } } });
    await (0, auditLog_1.createAuditLog)({ req, action: 'DELETE', module: 'tasks', recordId: 'BULK_DELETE', recordCode: `${ids.length} tasks deleted` });
    (0, response_1.sendSuccess)(res, null, `${ids.length} tasks deleted successfully`);
});
// Subtask endpoints
router.post('/:id/subtasks', async (req, res) => {
    const { title } = req.body;
    if (!title) {
        (0, response_1.sendBadRequest)(res, 'Subtask title is required');
        return;
    }
    const subtask = await database_1.prisma.taskSubtask.create({
        data: {
            taskId: req.params.id,
            title,
            isCompleted: false,
        },
    });
    (0, response_1.sendCreated)(res, subtask, 'Subtask added');
});
router.patch('/subtasks/:subtaskId', async (req, res) => {
    const { isCompleted, title } = req.body;
    const subtask = await database_1.prisma.taskSubtask.update({
        where: { id: req.params.subtaskId },
        data: {
            ...(isCompleted !== undefined ? { isCompleted } : {}),
            ...(title ? { title } : {}),
        },
    });
    (0, response_1.sendSuccess)(res, subtask, 'Subtask updated');
});
router.delete('/subtasks/:subtaskId', async (req, res) => {
    await database_1.prisma.taskSubtask.delete({ where: { id: req.params.subtaskId } });
    (0, response_1.sendSuccess)(res, null, 'Subtask deleted');
});
exports.default = router;
//# sourceMappingURL=tasks.routes.js.map