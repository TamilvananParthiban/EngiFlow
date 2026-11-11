"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pmRouter = exports.amcRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const idGenerator_1 = require("../utils/idGenerator");
const auditLog_1 = require("../utils/auditLog");
require("express-async-errors");
const amcRouter = (0, express_1.Router)();
exports.amcRouter = amcRouter;
const pmRouter = (0, express_1.Router)();
exports.pmRouter = pmRouter;
amcRouter.use(authenticate_1.authenticate);
pmRouter.use(authenticate_1.authenticate);
// AMC Routes
amcRouter.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { renewalStatus, vendorId } = req.query;
    const where = {};
    if (renewalStatus)
        where.renewalStatus = renewalStatus;
    if (vendorId)
        where.vendorId = vendorId;
    const [data, total] = await Promise.all([
        database_1.prisma.aMCContract.findMany({
            where, skip, take: limit,
            orderBy: { endDate: 'asc' },
            include: {
                vendor: { select: { id: true, name: true } },
                _count: { select: { services: true } },
            },
        }),
        database_1.prisma.aMCContract.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'AMC contracts retrieved', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
amcRouter.get('/expiring', async (_req, res) => {
    const now = new Date();
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const amcs = await database_1.prisma.aMCContract.findMany({
        where: { endDate: { gte: now, lte: ninetyDays } },
        include: { vendor: { select: { id: true, name: true } } },
        orderBy: { endDate: 'asc' },
    });
    (0, response_1.sendSuccess)(res, amcs);
});
amcRouter.get('/:id', async (req, res) => {
    const amc = await database_1.prisma.aMCContract.findUnique({
        where: { id: req.params.id },
        include: {
            vendor: true,
            services: { orderBy: { serviceDate: 'desc' } },
            assets: true,
        },
    });
    if (!amc) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    (0, response_1.sendSuccess)(res, amc);
});
amcRouter.post('/', async (req, res) => {
    const code = await (0, idGenerator_1.generateAMCCode)();
    const data = req.body;
    const gstAmount = (data.contractValue * data.gstPercent) / 100;
    const totalValue = data.contractValue + gstAmount;
    const amc = await database_1.prisma.aMCContract.create({
        data: {
            ...data,
            amcCode: code,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            gstAmount,
            totalValue,
            lastService: data.lastService ? new Date(data.lastService) : null,
            nextService: data.nextService ? new Date(data.nextService) : null,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'amc', recordId: amc.id, recordCode: code });
    (0, response_1.sendCreated)(res, amc, 'AMC contract created');
});
amcRouter.put('/:id', async (req, res) => {
    const existing = await database_1.prisma.aMCContract.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const data = req.body;
    let gstAmount = Number(existing.gstAmount);
    let totalValue = Number(existing.totalValue);
    if (data.contractValue !== undefined) {
        const gp = data.gstPercent ?? Number(existing.gstPercent);
        gstAmount = (data.contractValue * gp) / 100;
        totalValue = data.contractValue + gstAmount;
    }
    const amc = await database_1.prisma.aMCContract.update({
        where: { id: req.params.id },
        data: {
            ...data,
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
            gstAmount,
            totalValue,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'UPDATE', module: 'amc', recordId: amc.id, recordCode: amc.amcCode });
    (0, response_1.sendSuccess)(res, amc, 'AMC updated');
});
// PM Routes
pmRouter.get('/', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { status, assetType, startDate, endDate } = req.query;
    const where = {};
    if (status)
        where.status = status;
    if (assetType)
        where.assetType = assetType;
    if (startDate && endDate)
        where.scheduledDate = { gte: new Date(startDate), lte: new Date(endDate) };
    const [data, total] = await Promise.all([
        database_1.prisma.preventiveMaintenance.findMany({
            where, skip, take: limit,
            orderBy: { scheduledDate: 'asc' },
            include: {
                asset: { select: { id: true, assetCode: true, brand: true, model: true } },
                engineer: { select: { id: true, name: true } },
            },
        }),
        database_1.prisma.preventiveMaintenance.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'PM records retrieved', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
pmRouter.get('/calendar', async (req, res) => {
    const { year, month } = req.query;
    const y = parseInt(year || String(new Date().getFullYear()));
    const m = parseInt(month || String(new Date().getMonth() + 1));
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);
    const pms = await database_1.prisma.preventiveMaintenance.findMany({
        where: { scheduledDate: { gte: startDate, lte: endDate } },
        include: {
            asset: { select: { id: true, assetCode: true, brand: true, model: true, type: true } },
            engineer: { select: { id: true, name: true } },
        },
    });
    (0, response_1.sendSuccess)(res, pms);
});
pmRouter.post('/', async (req, res) => {
    const code = await (0, idGenerator_1.generatePMCode)();
    const pm = await database_1.prisma.preventiveMaintenance.create({
        data: {
            ...req.body,
            pmCode: code,
            scheduledDate: new Date(req.body.scheduledDate),
            completedDate: req.body.completedDate ? new Date(req.body.completedDate) : null,
            nextPMDate: req.body.nextPMDate ? new Date(req.body.nextPMDate) : null,
            checklist: req.body.checklist ? JSON.stringify(req.body.checklist) : null,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'maintenance', recordId: pm.id, recordCode: code });
    (0, response_1.sendCreated)(res, pm, 'PM scheduled');
});
pmRouter.put('/:id', async (req, res) => {
    const existing = await database_1.prisma.preventiveMaintenance.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const pm = await database_1.prisma.preventiveMaintenance.update({
        where: { id: req.params.id },
        data: {
            ...req.body,
            scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
            completedDate: req.body.completedDate ? new Date(req.body.completedDate) : undefined,
            nextPMDate: req.body.nextPMDate ? new Date(req.body.nextPMDate) : undefined,
            checklist: req.body.checklist ? JSON.stringify(req.body.checklist) : undefined,
        },
    });
    // Update asset last/next maintenance if PM completed
    if (req.body.status === 'COMPLETED' && pm.assetId) {
        await database_1.prisma.asset.update({
            where: { id: pm.assetId },
            data: {
                lastMaintenance: pm.completedDate || new Date(),
                nextMaintenance: pm.nextPMDate || undefined,
            },
        });
        await database_1.prisma.assetHistory.create({
            data: {
                assetId: pm.assetId,
                action: 'MAINTENANCE_COMPLETED',
                description: `PM ${pm.pmCode} completed: ${pm.maintenanceType}`,
                performedBy: req.user?.name,
            },
        });
    }
    await (0, auditLog_1.createAuditLog)({ req, action: 'UPDATE', module: 'maintenance', recordId: pm.id, recordCode: pm.pmCode });
    (0, response_1.sendSuccess)(res, pm, 'PM updated');
});
//# sourceMappingURL=amc.routes.js.map