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
exports.rentalRouter = exports.expenseRouter = exports.followupRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const idGenerator_1 = require("../utils/idGenerator");
const auditLog_1 = require("../utils/auditLog");
require("express-async-errors");
const followupRouter = (0, express_1.Router)();
exports.followupRouter = followupRouter;
const expenseRouter = (0, express_1.Router)();
exports.expenseRouter = expenseRouter;
followupRouter.use(authenticate_1.authenticate);
expenseRouter.use(authenticate_1.authenticate);
// Follow-ups
followupRouter.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { status, followupDate, vendorId, ticketId, taskId, invoiceId, search } = req.query;
    const where = {};
    if (status)
        where.status = status;
    if (vendorId)
        where.vendorId = vendorId;
    if (ticketId)
        where.ticketId = ticketId;
    if (taskId)
        where.taskId = taskId;
    if (invoiceId)
        where.invoiceId = invoiceId;
    if (search)
        where.subject = { contains: search };
    if (followupDate) {
        const d = new Date(followupDate);
        d.setHours(0, 0, 0, 0);
        const e = new Date(followupDate);
        e.setHours(23, 59, 59, 999);
        where.followupDate = { gte: d, lte: e };
    }
    const [data, total] = await Promise.all([
        database_1.prisma.followup.findMany({
            where, skip, take: limit,
            orderBy: { followupDate: 'asc' },
            include: {
                vendor: { select: { id: true, name: true } },
                ticket: { select: { id: true, ticketNumber: true, subject: true } },
                invoice: { select: { id: true, invoiceCode: true, invoiceNumber: true } },
                task: { select: { id: true, taskCode: true, title: true } },
                asset: { select: { id: true, assetCode: true, brand: true, model: true } },
                history: { orderBy: { createdAt: 'desc' } },
            },
        }),
        database_1.prisma.followup.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'Follow-ups retrieved', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
followupRouter.get('/today', async (_req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const followups = await database_1.prisma.followup.findMany({
        where: { followupDate: { gte: today, lte: todayEnd }, status: { not: 'COMPLETED' } },
        include: {
            vendor: { select: { id: true, name: true } },
            ticket: { select: { id: true, ticketNumber: true } },
            invoice: { select: { id: true, invoiceCode: true } },
            task: { select: { id: true, taskCode: true } },
        },
        orderBy: { followupDate: 'asc' },
    });
    (0, response_1.sendSuccess)(res, followups);
});
followupRouter.get('/:id', async (req, res) => {
    const followup = await database_1.prisma.followup.findUnique({
        where: { id: req.params.id },
        include: {
            vendor: true,
            ticket: true,
            invoice: true,
            task: true,
            asset: true,
            user: { select: { id: true, name: true } },
            history: { orderBy: { createdAt: 'desc' } },
        },
    });
    if (!followup) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    (0, response_1.sendSuccess)(res, followup);
});
followupRouter.post('/', async (req, res) => {
    const code = await (0, idGenerator_1.generateFollowupCode)();
    const followup = await database_1.prisma.followup.create({
        data: {
            ...req.body,
            followupCode: code,
            followupDate: new Date(req.body.followupDate),
            nextFollowupDate: req.body.nextFollowupDate ? new Date(req.body.nextFollowupDate) : null,
            userId: req.user.id,
        },
        include: { history: true },
    });
    if (req.body.discussion) {
        await database_1.prisma.followupHistory.create({
            data: {
                followupId: followup.id,
                note: req.body.discussion,
                nextFollowupDate: req.body.nextFollowupDate ? new Date(req.body.nextFollowupDate) : null,
                status: followup.status,
                createdById: req.user.id,
            },
        });
    }
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'followups', recordId: followup.id, recordCode: code });
    (0, response_1.sendCreated)(res, followup, 'Follow-up created');
});
followupRouter.put('/:id', async (req, res) => {
    const existing = await database_1.prisma.followup.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const completedDate = req.body.status === 'COMPLETED' ? new Date() : undefined;
    const followup = await database_1.prisma.followup.update({
        where: { id: req.params.id },
        data: {
            ...req.body,
            followupDate: req.body.followupDate ? new Date(req.body.followupDate) : undefined,
            nextFollowupDate: req.body.nextFollowupDate ? new Date(req.body.nextFollowupDate) : undefined,
            completedDate,
        },
        include: { history: true },
    });
    if (req.body.discussion || req.body.note || req.body.status) {
        await database_1.prisma.followupHistory.create({
            data: {
                followupId: followup.id,
                note: req.body.discussion || req.body.note || `Status updated to ${req.body.status || followup.status}`,
                nextFollowupDate: req.body.nextFollowupDate ? new Date(req.body.nextFollowupDate) : followup.nextFollowupDate,
                status: followup.status,
                createdById: req.user.id,
            },
        });
    }
    (0, response_1.sendSuccess)(res, followup, 'Follow-up updated');
});
followupRouter.post('/:id/history', async (req, res) => {
    const { note, nextFollowupDate, status } = req.body;
    const historyItem = await database_1.prisma.followupHistory.create({
        data: {
            followupId: req.params.id,
            note: note || 'Discussion note added',
            nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate) : null,
            status: status || undefined,
            createdById: req.user.id,
        },
    });
    if (nextFollowupDate || status) {
        await database_1.prisma.followup.update({
            where: { id: req.params.id },
            data: {
                ...(nextFollowupDate ? { nextFollowupDate: new Date(nextFollowupDate) } : {}),
                ...(status ? { status } : {}),
            },
        });
    }
    (0, response_1.sendCreated)(res, historyItem, 'Follow-up history added');
});
followupRouter.delete('/:id', async (req, res) => {
    await database_1.prisma.followupHistory.deleteMany({ where: { followupId: req.params.id } });
    await database_1.prisma.followup.delete({ where: { id: req.params.id } });
    (0, response_1.sendSuccess)(res, null, 'Follow-up deleted');
});
// POST /api/v1/followups/bulk-delete
followupRouter.post('/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        (0, response_1.sendBadRequest)(res, 'Array of ids is required');
        return;
    }
    await database_1.prisma.followupHistory.deleteMany({ where: { followupId: { in: ids } } });
    await database_1.prisma.followup.deleteMany({ where: { id: { in: ids } } });
    (0, response_1.sendSuccess)(res, { count: ids.length }, `Successfully deleted ${ids.length} follow-up(s)`);
});
// Expenses
expenseRouter.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { month, year, categoryId, vendorId } = req.query;
    const where = {};
    if (month)
        where.month = parseInt(month);
    if (year)
        where.year = parseInt(year);
    if (categoryId)
        where.categoryId = categoryId;
    if (vendorId)
        where.vendorId = vendorId;
    const [data, total] = await Promise.all([
        database_1.prisma.expense.findMany({
            where, skip, take: limit,
            orderBy: { expenseDate: 'desc' },
            include: {
                category: true,
                vendor: { select: { id: true, name: true } },
            },
        }),
        database_1.prisma.expense.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'Expenses retrieved', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
expenseRouter.post('/', async (req, res) => {
    const code = await (0, idGenerator_1.generateExpenseCode)();
    const d = new Date(req.body.expenseDate);
    const expense = await database_1.prisma.expense.create({
        data: {
            ...req.body,
            expenseCode: code,
            expenseDate: d,
            month: d.getMonth() + 1,
            year: d.getFullYear(),
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'expenses', recordId: expense.id, recordCode: code });
    (0, response_1.sendCreated)(res, expense, 'Expense recorded');
});
// Laptop Rentals
const rentalRouter = (0, express_1.Router)();
exports.rentalRouter = rentalRouter;
rentalRouter.use(authenticate_1.authenticate);
rentalRouter.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { vendorId, paymentStatus, search } = req.query;
    const where = {};
    if (vendorId)
        where.vendorId = vendorId;
    if (paymentStatus)
        where.paymentStatus = paymentStatus;
    if (search) {
        where.OR = [
            { rentalCode: { contains: search } },
            { serialNumber: { contains: search } },
            { laptopModel: { contains: search } },
            { assignedUserName: { contains: search } },
        ];
    }
    const [data, total] = await Promise.all([
        database_1.prisma.laptopRental.findMany({
            where, skip, take: limit,
            orderBy: { rentalStart: 'desc' },
            include: {
                vendor: { select: { id: true, name: true } },
                asset: { select: { id: true, assetCode: true } },
            },
        }),
        database_1.prisma.laptopRental.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'Laptop rentals retrieved', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
rentalRouter.get('/:id', async (req, res) => {
    const rental = await database_1.prisma.laptopRental.findUnique({
        where: { id: req.params.id },
        include: { vendor: true, asset: true },
    });
    if (!rental) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    (0, response_1.sendSuccess)(res, rental);
});
rentalRouter.post('/', async (req, res) => {
    const { generateRentalCode } = await Promise.resolve().then(() => __importStar(require('../utils/idGenerator')));
    const code = await generateRentalCode();
    const subtotal = Number(req.body.monthlyRental || 0);
    const gstPercent = Number(req.body.gstPercent || 18);
    const gstAmount = (subtotal * gstPercent) / 100;
    const totalMonthly = subtotal + gstAmount;
    const rental = await database_1.prisma.laptopRental.create({
        data: {
            ...req.body,
            rentalCode: code,
            rentalStart: new Date(req.body.rentalStart),
            rentalEnd: req.body.rentalEnd ? new Date(req.body.rentalEnd) : null,
            monthlyRental: subtotal,
            gstPercent,
            gstAmount,
            totalMonthly,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'laptop_rentals', recordId: rental.id, recordCode: code });
    (0, response_1.sendCreated)(res, rental, 'Laptop rental created');
});
rentalRouter.put('/:id', async (req, res) => {
    const existing = await database_1.prisma.laptopRental.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const subtotal = req.body.monthlyRental !== undefined ? Number(req.body.monthlyRental) : Number(existing.monthlyRental);
    const gstPercent = req.body.gstPercent !== undefined ? Number(req.body.gstPercent) : Number(existing.gstPercent);
    const gstAmount = (subtotal * gstPercent) / 100;
    const totalMonthly = subtotal + gstAmount;
    const rental = await database_1.prisma.laptopRental.update({
        where: { id: req.params.id },
        data: {
            ...req.body,
            rentalStart: req.body.rentalStart ? new Date(req.body.rentalStart) : undefined,
            rentalEnd: req.body.rentalEnd ? new Date(req.body.rentalEnd) : undefined,
            returnDate: req.body.returnDate ? new Date(req.body.returnDate) : undefined,
            monthlyRental: subtotal,
            gstPercent,
            gstAmount,
            totalMonthly,
        },
    });
    (0, response_1.sendSuccess)(res, rental, 'Laptop rental updated');
});
rentalRouter.delete('/:id', async (req, res) => {
    await database_1.prisma.laptopRental.delete({ where: { id: req.params.id } });
    (0, response_1.sendSuccess)(res, null, 'Laptop rental deleted');
});
// POST /api/v1/rentals/bulk-delete
rentalRouter.post('/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        (0, response_1.sendBadRequest)(res, 'Array of ids is required');
        return;
    }
    await database_1.prisma.laptopRental.deleteMany({ where: { id: { in: ids } } });
    (0, response_1.sendSuccess)(res, { count: ids.length }, `Successfully deleted ${ids.length} rental(s)`);
});
//# sourceMappingURL=operations.routes.js.map