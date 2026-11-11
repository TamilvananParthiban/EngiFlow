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
const vendorSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    type: zod_1.z.string().min(1),
    contactPerson: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    address: zod_1.z.string().optional(),
    gstNumber: zod_1.z.string().optional(),
    panNumber: zod_1.z.string().optional(),
    bankName: zod_1.z.string().optional(),
    bankAccount: zod_1.z.string().optional(),
    bankIfsc: zod_1.z.string().optional(),
    services: zod_1.z.string().optional(),
    contractStart: zod_1.z.string().optional(),
    contractEnd: zod_1.z.string().optional(),
    sla: zod_1.z.string().optional(),
    status: zod_1.z.string().default('ACTIVE'),
    remarks: zod_1.z.string().optional(),
});
router.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { status, type, search } = req.query;
    const where = { deletedAt: null };
    if (status)
        where.status = status;
    if (type)
        where.type = type;
    if (search)
        where.OR = [
            { name: { contains: search } },
            { vendorCode: { contains: search } },
            { contactPerson: { contains: search } },
        ];
    const [data, total] = await Promise.all([
        database_1.prisma.vendor.findMany({
            where, skip, take: limit,
            orderBy: { name: 'asc' },
            include: {
                _count: { select: { invoices: true, tickets: true, amcContracts: true } },
            },
        }),
        database_1.prisma.vendor.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'Vendors retrieved', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
router.get('/:id/profile', async (req, res) => {
    const vendor = await database_1.prisma.vendor.findFirst({
        where: { OR: [{ id: req.params.id }, { vendorCode: req.params.id }], deletedAt: null },
        include: {
            contacts: true,
            contracts: true,
            invoices: { orderBy: { invoiceDate: 'desc' }, take: 10 },
            payments: { orderBy: { paymentDate: 'desc' }, take: 10 },
            tickets: { where: { deletedAt: null }, orderBy: { date: 'desc' }, take: 10 },
            amcContracts: { orderBy: { endDate: 'asc' }, take: 5 },
            followups: { orderBy: { followupDate: 'desc' }, take: 10 },
            _count: { select: { invoices: true, payments: true, tickets: true } },
        },
    });
    if (!vendor) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    (0, response_1.sendSuccess)(res, vendor);
});
router.get('/:id', async (req, res) => {
    const vendor = await database_1.prisma.vendor.findFirst({
        where: { OR: [{ id: req.params.id }, { vendorCode: req.params.id }], deletedAt: null },
        include: { contacts: true },
    });
    if (!vendor) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    (0, response_1.sendSuccess)(res, vendor);
});
router.post('/', async (req, res) => {
    const result = vendorSchema.safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const code = await (0, idGenerator_1.generateVendorCode)();
    const vendor = await database_1.prisma.vendor.create({
        data: {
            ...result.data,
            vendorCode: code,
            type: result.data.type,
            status: result.data.status,
            contractStart: result.data.contractStart ? new Date(result.data.contractStart) : null,
            contractEnd: result.data.contractEnd ? new Date(result.data.contractEnd) : null,
            email: result.data.email || null,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'vendors', recordId: vendor.id, recordCode: code });
    (0, response_1.sendCreated)(res, vendor, 'Vendor created');
});
router.put('/:id', async (req, res) => {
    const existing = await database_1.prisma.vendor.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const result = vendorSchema.partial().safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const vendor = await database_1.prisma.vendor.update({
        where: { id: req.params.id },
        data: {
            ...result.data,
            type: result.data.type,
            status: result.data.status,
            contractStart: result.data.contractStart ? new Date(result.data.contractStart) : undefined,
            contractEnd: result.data.contractEnd ? new Date(result.data.contractEnd) : undefined,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'UPDATE', module: 'vendors', recordId: vendor.id, recordCode: vendor.vendorCode });
    (0, response_1.sendSuccess)(res, vendor, 'Vendor updated');
});
router.delete('/:id', async (req, res) => {
    const existing = await database_1.prisma.vendor.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    await database_1.prisma.vendor.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    await (0, auditLog_1.createAuditLog)({ req, action: 'DELETE', module: 'vendors', recordId: req.params.id });
    (0, response_1.sendSuccess)(res, null, 'Vendor deleted');
});
// POST /api/v1/vendors/bulk-delete
router.post('/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        (0, response_1.sendBadRequest)(res, 'Array of ids is required');
        return;
    }
    await database_1.prisma.vendor.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: new Date() },
    });
    await (0, auditLog_1.createAuditLog)({
        req,
        action: 'BULK_DELETE',
        module: 'vendors',
        recordId: 'bulk',
        description: JSON.stringify({ count: ids.length, ids }),
    });
    (0, response_1.sendSuccess)(res, { count: ids.length }, `Successfully deleted ${ids.length} vendor(s)`);
});
exports.default = router;
//# sourceMappingURL=vendors.routes.js.map