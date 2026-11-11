"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.networkRouter = exports.ispRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const idGenerator_1 = require("../utils/idGenerator");
const auditLog_1 = require("../utils/auditLog");
const dateUtils_1 = require("../utils/dateUtils");
require("express-async-errors");
const ispRouter = (0, express_1.Router)();
exports.ispRouter = ispRouter;
const networkRouter = (0, express_1.Router)();
exports.networkRouter = networkRouter;
ispRouter.use(authenticate_1.authenticate);
networkRouter.use(authenticate_1.authenticate);
// ISP Routes
ispRouter.get('/', async (_req, res) => {
    const isps = await database_1.prisma.iSPConnection.findMany({
        where: { isActive: true },
        include: { vendor: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
        orderBy: { ispName: 'asc' },
    });
    (0, response_1.sendSuccess)(res, isps);
});
ispRouter.post('/', async (req, res) => {
    const code = await (0, idGenerator_1.generateISPCode)();
    const isp = await database_1.prisma.iSPConnection.create({
        data: { ...req.body, connectionCode: code, connectionType: req.body.connectionType },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'isp', recordId: isp.id, recordCode: code });
    (0, response_1.sendCreated)(res, isp, 'ISP connection added');
});
ispRouter.put('/:id', async (req, res) => {
    const isp = await database_1.prisma.iSPConnection.update({ where: { id: req.params.id }, data: req.body });
    (0, response_1.sendSuccess)(res, isp, 'ISP updated');
});
// Network Device Routes
networkRouter.get('/devices', async (_req, res) => {
    const devices = await database_1.prisma.networkDevice.findMany({
        include: { location: { select: { id: true, name: true } }, isp: { select: { id: true, ispName: true } } },
        orderBy: { name: 'asc' },
    });
    (0, response_1.sendSuccess)(res, devices);
});
networkRouter.post('/devices', async (req, res) => {
    const code = await (0, idGenerator_1.generateNetworkDeviceCode)();
    const device = await database_1.prisma.networkDevice.create({
        data: { ...req.body, deviceCode: code },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'network', recordId: device.id, recordCode: code });
    (0, response_1.sendCreated)(res, device, 'Network device added');
});
// Downtime Routes
networkRouter.get('/downtime', async (req, res) => {
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { ispId, deviceId, startDate, endDate } = req.query;
    const where = {};
    if (ispId)
        where.ispId = ispId;
    if (deviceId)
        where.deviceId = deviceId;
    if (startDate && endDate)
        where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    const [data, total] = await Promise.all([
        database_1.prisma.networkDowntime.findMany({
            where, skip, take: limit,
            orderBy: { date: 'desc' },
            include: {
                device: { select: { id: true, name: true, deviceType: true } },
                isp: { select: { id: true, ispName: true } },
            },
        }),
        database_1.prisma.networkDowntime.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'Downtime records', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
networkRouter.post('/downtime', async (req, res) => {
    const code = await (0, idGenerator_1.generateDowntimeCode)();
    const data = req.body;
    // Calculate duration
    let durationMinutes = null;
    if (data.startTime && data.endTime) {
        const start = new Date(data.startTime);
        const end = new Date(data.endTime);
        durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    }
    const downtime = await database_1.prisma.networkDowntime.create({
        data: {
            ...data,
            downtimeCode: code,
            date: new Date(data.date),
            startTime: new Date(data.startTime),
            endTime: data.endTime ? new Date(data.endTime) : null,
            durationMinutes,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'network_downtime', recordId: downtime.id, recordCode: code });
    (0, response_1.sendCreated)(res, downtime, 'Downtime recorded');
});
// Uptime calculation
networkRouter.get('/uptime', async (req, res) => {
    const { year, month } = req.query;
    const date = year && month ? new Date(parseInt(year), parseInt(month) - 1, 1) : new Date();
    const monthStart = (0, dateUtils_1.startOfMonth)(date);
    const monthEnd = (0, dateUtils_1.endOfMonth)(date);
    const totalMinutes = (monthEnd.getDate()) * 24 * 60;
    const agg = await database_1.prisma.networkDowntime.aggregate({
        _sum: { durationMinutes: true },
        where: { date: { gte: monthStart, lte: monthEnd } },
    });
    const downtimeMinutes = agg._sum.durationMinutes || 0;
    const uptimeMinutes = totalMinutes - downtimeMinutes;
    const uptimePercent = parseFloat(((uptimeMinutes / totalMinutes) * 100).toFixed(4));
    // ISP-wise uptime
    const ispDowntime = await database_1.prisma.networkDowntime.groupBy({
        by: ['ispId'],
        _sum: { durationMinutes: true },
        where: { date: { gte: monthStart, lte: monthEnd }, ispId: { not: null } },
    });
    const ispUptimes = await Promise.all(ispDowntime.map(async (i) => {
        const isp = i.ispId ? await database_1.prisma.iSPConnection.findUnique({ where: { id: i.ispId }, select: { ispName: true } }) : null;
        const dm = i._sum.durationMinutes || 0;
        return {
            isp: isp?.ispName || 'Unknown',
            downtimeMinutes: dm,
            uptimePercent: parseFloat(((totalMinutes - dm) / totalMinutes * 100).toFixed(4)),
        };
    }));
    (0, response_1.sendSuccess)(res, {
        period: { year: date.getFullYear(), month: date.getMonth() + 1 },
        totalMinutes,
        downtimeMinutes,
        uptimeMinutes,
        uptimePercent,
        downtimeHours: parseFloat((downtimeMinutes / 60).toFixed(2)),
        ispUptimes,
    });
});
//# sourceMappingURL=network.routes.js.map