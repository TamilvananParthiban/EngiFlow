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
const ticketSchema = zod_1.z.object({
    date: zod_1.z.string().min(1),
    reportedById: zod_1.z.string().optional(),
    departmentId: zod_1.z.string().optional(),
    assetId: zod_1.z.string().optional(),
    category: zod_1.z.string().min(1),
    priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    subject: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    rootCause: zod_1.z.string().optional(),
    actionTaken: zod_1.z.string().optional(),
    resolution: zod_1.z.string().optional(),
    vendorId: zod_1.z.string().optional(),
    vendorTicketNumber: zod_1.z.string().optional(),
    downtimeStart: zod_1.z.string().optional(),
    downtimeEnd: zod_1.z.string().optional(),
    slaHours: zod_1.z.number().optional(),
    status: zod_1.z.string().default('OPEN'),
    assignedEngineerId: zod_1.z.string().optional(),
    remarks: zod_1.z.string().optional(),
});
router.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { status, priority, category, search } = req.query;
    const where = { deletedAt: null };
    if (status)
        where.status = status;
    if (priority)
        where.priority = priority;
    if (category)
        where.category = category;
    if (search)
        where.OR = [
            { subject: { contains: search } },
            { ticketNumber: { contains: search } },
        ];
    const [data, total] = await Promise.all([
        database_1.prisma.ticket.findMany({
            where, skip, take: limit,
            orderBy: [{ date: 'desc' }],
            include: {
                reportedBy: { select: { id: true, name: true } },
                assignedEngineer: { select: { id: true, name: true } },
                asset: { select: { id: true, assetCode: true, brand: true, model: true } },
                department: { select: { id: true, name: true } },
                vendor: { select: { id: true, name: true } },
            },
        }),
        database_1.prisma.ticket.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'Tickets retrieved', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
router.get('/next-number', async (_req, res) => {
    const number = await (0, idGenerator_1.generateTicketNumber)();
    (0, response_1.sendSuccess)(res, { ticketNumber: number });
});
router.get('/:id', async (req, res) => {
    const ticket = await database_1.prisma.ticket.findFirst({
        where: { OR: [{ id: req.params.id }, { ticketNumber: req.params.id }], deletedAt: null },
        include: {
            reportedBy: { select: { id: true, name: true } },
            assignedEngineer: { select: { id: true, name: true } },
            asset: true,
            department: true,
            vendor: true,
            tasks: true,
            followups: { orderBy: { followupDate: 'desc' } },
        },
    });
    if (!ticket) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    (0, response_1.sendSuccess)(res, ticket);
});
router.post('/', async (req, res) => {
    const result = ticketSchema.safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const ticketNumber = await (0, idGenerator_1.generateTicketNumber)();
    // Calculate downtime duration
    let downtimeDuration = null;
    if (result.data.downtimeStart && result.data.downtimeEnd) {
        const start = new Date(result.data.downtimeStart);
        const end = new Date(result.data.downtimeEnd);
        downtimeDuration = Math.round((end.getTime() - start.getTime()) / 60000);
    }
    const ticket = await database_1.prisma.ticket.create({
        data: {
            ticketNumber,
            date: new Date(result.data.date),
            reportedById: result.data.reportedById,
            departmentId: result.data.departmentId,
            assetId: result.data.assetId,
            category: result.data.category,
            priority: result.data.priority,
            subject: result.data.subject,
            description: result.data.description,
            rootCause: result.data.rootCause,
            actionTaken: result.data.actionTaken,
            resolution: result.data.resolution,
            vendorId: result.data.vendorId,
            vendorTicketNumber: result.data.vendorTicketNumber,
            downtimeStart: result.data.downtimeStart ? new Date(result.data.downtimeStart) : null,
            downtimeEnd: result.data.downtimeEnd ? new Date(result.data.downtimeEnd) : null,
            downtimeDuration,
            slaHours: result.data.slaHours,
            status: result.data.status,
            assignedEngineerId: result.data.assignedEngineerId,
            remarks: result.data.remarks,
        },
    });
    // Add to asset history if asset selected
    if (ticket.assetId) {
        await database_1.prisma.assetHistory.create({
            data: {
                assetId: ticket.assetId,
                action: 'TICKET_CREATED',
                description: `Ticket ${ticketNumber} created: ${result.data.subject}`,
                performedBy: req.user?.name,
                ticketId: ticket.id,
            },
        });
    }
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'tickets', recordId: ticket.id, recordCode: ticketNumber });
    (0, response_1.sendCreated)(res, ticket, 'Ticket created');
});
router.put('/:id', async (req, res) => {
    const existing = await database_1.prisma.ticket.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const result = ticketSchema.partial().safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    let downtimeDuration = existing.downtimeDuration;
    if (result.data.downtimeStart && result.data.downtimeEnd) {
        const start = new Date(result.data.downtimeStart);
        const end = new Date(result.data.downtimeEnd);
        downtimeDuration = Math.round((end.getTime() - start.getTime()) / 60000);
    }
    const ticket = await database_1.prisma.ticket.update({
        where: { id: req.params.id },
        data: {
            ...result.data,
            date: result.data.date ? new Date(result.data.date) : undefined,
            downtimeStart: result.data.downtimeStart ? new Date(result.data.downtimeStart) : undefined,
            downtimeEnd: result.data.downtimeEnd ? new Date(result.data.downtimeEnd) : undefined,
            downtimeDuration,
            closedDate: result.data.status === 'CLOSED' ? new Date() : existing.closedDate,
            category: result.data.category,
            priority: result.data.priority,
            status: result.data.status,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'UPDATE', module: 'tickets', recordId: ticket.id, recordCode: ticket.ticketNumber });
    (0, response_1.sendSuccess)(res, ticket, 'Ticket updated');
});
router.delete('/:id', async (req, res) => {
    const existing = await database_1.prisma.ticket.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    await database_1.prisma.ticket.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    await (0, auditLog_1.createAuditLog)({ req, action: 'DELETE', module: 'tickets', recordId: req.params.id });
    (0, response_1.sendSuccess)(res, null, 'Ticket deleted');
});
// POST /api/v1/tickets/bulk-delete
router.post('/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        (0, response_1.sendBadRequest)(res, 'Array of ids is required');
        return;
    }
    await database_1.prisma.ticket.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: new Date() },
    });
    await (0, auditLog_1.createAuditLog)({
        req,
        action: 'BULK_DELETE',
        module: 'tickets',
        recordId: 'bulk',
        description: JSON.stringify({ count: ids.length, ids }),
    });
    (0, response_1.sendSuccess)(res, { count: ids.length }, `Successfully deleted ${ids.length} ticket(s)`);
});
exports.default = router;
//# sourceMappingURL=tickets.routes.js.map