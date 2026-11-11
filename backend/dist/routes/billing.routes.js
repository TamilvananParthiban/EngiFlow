"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRouter = exports.invoiceRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const idGenerator_1 = require("../utils/idGenerator");
const auditLog_1 = require("../utils/auditLog");
const zod_1 = require("zod");
require("express-async-errors");
const invoiceRouter = (0, express_1.Router)();
exports.invoiceRouter = invoiceRouter;
const paymentRouter = (0, express_1.Router)();
exports.paymentRouter = paymentRouter;
invoiceRouter.use(authenticate_1.authenticate);
paymentRouter.use(authenticate_1.authenticate);
const invoiceSchema = zod_1.z.object({
    invoiceNumber: zod_1.z.string().min(1),
    vendorId: zod_1.z.string().min(1),
    service: zod_1.z.string().optional(),
    invoiceDate: zod_1.z.string().min(1),
    billingPeriod: zod_1.z.string().optional(),
    subtotal: zod_1.z.number().positive(),
    gstPercent: zod_1.z.number().default(18),
    dueDate: zod_1.z.string().optional(),
    approvalStatus: zod_1.z.string().default('DRAFT'),
    paymentStatus: zod_1.z.string().default('PENDING'),
    remarks: zod_1.z.string().optional(),
});
invoiceRouter.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { paymentStatus, approvalStatus, vendorId } = req.query;
    const where = {};
    if (paymentStatus)
        where.paymentStatus = paymentStatus;
    if (approvalStatus)
        where.approvalStatus = approvalStatus;
    if (vendorId)
        where.vendorId = vendorId;
    const [data, total] = await Promise.all([
        database_1.prisma.invoice.findMany({
            where, skip, take: limit,
            orderBy: { invoiceDate: 'desc' },
            include: { vendor: { select: { id: true, name: true } } },
        }),
        database_1.prisma.invoice.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'Invoices retrieved', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
invoiceRouter.get('/:id', async (req, res) => {
    const invoice = await database_1.prisma.invoice.findUnique({
        where: { id: req.params.id },
        include: {
            vendor: true,
            payments: { orderBy: { paymentDate: 'desc' } },
        },
    });
    if (!invoice) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    (0, response_1.sendSuccess)(res, invoice);
});
invoiceRouter.post('/', async (req, res) => {
    const result = invoiceSchema.safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const gstAmount = (result.data.subtotal * result.data.gstPercent) / 100;
    const totalAmount = result.data.subtotal + gstAmount;
    const code = await (0, idGenerator_1.generateInvoiceCode)();
    const invoice = await database_1.prisma.invoice.create({
        data: {
            invoiceCode: code,
            invoiceNumber: result.data.invoiceNumber,
            vendorId: result.data.vendorId,
            service: result.data.service,
            invoiceDate: new Date(result.data.invoiceDate),
            billingPeriod: result.data.billingPeriod,
            subtotal: result.data.subtotal,
            gstPercent: result.data.gstPercent,
            gstAmount,
            totalAmount,
            dueDate: result.data.dueDate ? new Date(result.data.dueDate) : null,
            approvalStatus: result.data.approvalStatus,
            paymentStatus: result.data.paymentStatus,
            remarks: result.data.remarks,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'invoices', recordId: invoice.id, recordCode: code });
    (0, response_1.sendCreated)(res, invoice, 'Invoice created');
});
invoiceRouter.patch('/:id/approve', async (req, res) => {
    const invoice = await database_1.prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const updated = await database_1.prisma.invoice.update({
        where: { id: req.params.id },
        data: { approvalStatus: 'APPROVED', paymentStatus: 'PAYMENT_PENDING' },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'APPROVE', module: 'invoices', recordId: invoice.id, recordCode: invoice.invoiceCode });
    (0, response_1.sendSuccess)(res, updated, 'Invoice approved');
});
invoiceRouter.put('/:id', async (req, res) => {
    const existing = await database_1.prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const result = invoiceSchema.partial().safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    let gstAmount = Number(existing.gstAmount);
    let totalAmount = Number(existing.totalAmount);
    if (result.data.subtotal !== undefined || result.data.gstPercent !== undefined) {
        const sub = result.data.subtotal ?? Number(existing.subtotal);
        const gst = result.data.gstPercent ?? Number(existing.gstPercent);
        gstAmount = (sub * gst) / 100;
        totalAmount = sub + gstAmount;
    }
    const invoice = await database_1.prisma.invoice.update({
        where: { id: req.params.id },
        data: {
            ...result.data,
            invoiceDate: result.data.invoiceDate ? new Date(result.data.invoiceDate) : undefined,
            dueDate: result.data.dueDate ? new Date(result.data.dueDate) : undefined,
            gstAmount,
            totalAmount,
            approvalStatus: result.data.approvalStatus,
            paymentStatus: result.data.paymentStatus,
        },
    });
    (0, response_1.sendSuccess)(res, invoice, 'Invoice updated');
});
invoiceRouter.delete('/:id', async (req, res) => {
    const existing = await database_1.prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    // Unlink associated payments and followups
    await database_1.prisma.payment.updateMany({ where: { invoiceId: req.params.id }, data: { invoiceId: null } });
    await database_1.prisma.followup.updateMany({ where: { invoiceId: req.params.id }, data: { invoiceId: null } });
    await database_1.prisma.invoice.delete({ where: { id: req.params.id } });
    await (0, auditLog_1.createAuditLog)({
        req,
        action: 'DELETE',
        module: 'invoices',
        recordId: req.params.id,
        recordCode: existing.invoiceCode,
    });
    (0, response_1.sendSuccess)(res, null, 'Invoice deleted successfully');
});
invoiceRouter.post('/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        (0, response_1.sendBadRequest)(res, 'Array of invoice IDs required');
        return;
    }
    await database_1.prisma.payment.updateMany({ where: { invoiceId: { in: ids } }, data: { invoiceId: null } });
    await database_1.prisma.followup.updateMany({ where: { invoiceId: { in: ids } }, data: { invoiceId: null } });
    await database_1.prisma.invoice.deleteMany({ where: { id: { in: ids } } });
    await (0, auditLog_1.createAuditLog)({ req, action: 'DELETE', module: 'invoices', recordId: 'BULK_DELETE', recordCode: `${ids.length} invoices deleted` });
    (0, response_1.sendSuccess)(res, null, `${ids.length} invoices deleted successfully`);
});
// PAYMENTS
paymentRouter.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { vendorId } = req.query;
    const where = {};
    if (vendorId)
        where.vendorId = vendorId;
    const [data, total] = await Promise.all([
        database_1.prisma.payment.findMany({
            where, skip, take: limit,
            orderBy: { paymentDate: 'desc' },
            include: { vendor: { select: { id: true, name: true } }, invoice: { select: { id: true, invoiceCode: true, invoiceNumber: true } } },
        }),
        database_1.prisma.payment.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'Payments retrieved', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
paymentRouter.post('/', async (req, res) => {
    const code = await (0, idGenerator_1.generatePaymentCode)();
    const payment = await database_1.prisma.payment.create({
        data: {
            ...req.body,
            paymentCode: code,
            paymentDate: new Date(req.body.paymentDate),
        },
    });
    // Update invoice payment status if linked
    if (payment.invoiceId) {
        const invoice = await database_1.prisma.invoice.findUnique({ where: { id: payment.invoiceId } });
        if (invoice) {
            const totalPaid = await database_1.prisma.payment.aggregate({
                _sum: { amount: true },
                where: { invoiceId: payment.invoiceId },
            });
            const paid = Number(totalPaid._sum.amount || 0);
            if (paid >= Number(invoice.totalAmount)) {
                await database_1.prisma.invoice.update({
                    where: { id: payment.invoiceId },
                    data: { paymentStatus: 'PAID', paymentDate: payment.paymentDate, paymentReference: payment.referenceNumber },
                });
            }
        }
    }
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'payments', recordId: payment.id, recordCode: code });
    (0, response_1.sendCreated)(res, payment, 'Payment recorded');
});
//# sourceMappingURL=billing.routes.js.map