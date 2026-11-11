import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/database';
import {
  sendSuccess, sendCreated, sendNotFound, sendBadRequest,
  buildPaginationMeta, getPaginationParams,
} from '../utils/response';
import { generateAMCCode, generatePMCode } from '../utils/idGenerator';
import { createAuditLog } from '../utils/auditLog';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { z } from 'zod';
import 'express-async-errors';

const amcRouter = Router();
const pmRouter = Router();

amcRouter.use(authenticate);
pmRouter.use(authenticate);

// AMC Routes
amcRouter.get('/', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { renewalStatus, vendorId } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (renewalStatus) where.renewalStatus = renewalStatus;
  if (vendorId) where.vendorId = vendorId;

  const [data, total] = await Promise.all([
    prisma.aMCContract.findMany({
      where, skip, take: limit,
      orderBy: { endDate: 'asc' },
      include: {
        vendor: { select: { id: true, name: true } },
        _count: { select: { services: true } },
      },
    }),
    prisma.aMCContract.count({ where }),
  ]);

  sendSuccess(res, data, 'AMC contracts retrieved', 200, buildPaginationMeta(total, page, limit));
});

amcRouter.get('/expiring', async (_req, res) => {
  const now = new Date();
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const amcs = await prisma.aMCContract.findMany({
    where: { endDate: { gte: now, lte: ninetyDays } },
    include: { vendor: { select: { id: true, name: true } } },
    orderBy: { endDate: 'asc' },
  });

  sendSuccess(res, amcs);
});

amcRouter.get('/:id', async (req, res) => {
  const amc = await prisma.aMCContract.findUnique({
    where: { id: req.params.id },
    include: {
      vendor: true,
      services: { orderBy: { serviceDate: 'desc' } },
      assets: true,
    },
  });
  if (!amc) { sendNotFound(res); return; }
  sendSuccess(res, amc);
});

amcRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const code = await generateAMCCode();
  const data = req.body;
  const gstAmount = (data.contractValue * data.gstPercent) / 100;
  const totalValue = data.contractValue + gstAmount;

  const amc = await prisma.aMCContract.create({
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
  await createAuditLog({ req, action: 'CREATE', module: 'amc', recordId: amc.id, recordCode: code });
  sendCreated(res, amc, 'AMC contract created');
});

amcRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.aMCContract.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  const data = req.body;
  let gstAmount = Number(existing.gstAmount);
  let totalValue = Number(existing.totalValue);
  if (data.contractValue !== undefined) {
    const gp = data.gstPercent ?? Number(existing.gstPercent);
    gstAmount = (data.contractValue * gp) / 100;
    totalValue = data.contractValue + gstAmount;
  }

  const amc = await prisma.aMCContract.update({
    where: { id: req.params.id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      gstAmount,
      totalValue,
    },
  });
  await createAuditLog({ req, action: 'UPDATE', module: 'amc', recordId: amc.id, recordCode: amc.amcCode });
  sendSuccess(res, amc, 'AMC updated');
});

// PM Routes
pmRouter.get('/', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { status, assetType, startDate, endDate } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (assetType) where.assetType = assetType;
  if (startDate && endDate) where.scheduledDate = { gte: new Date(startDate), lte: new Date(endDate) };

  const [data, total] = await Promise.all([
    prisma.preventiveMaintenance.findMany({
      where, skip, take: limit,
      orderBy: { scheduledDate: 'asc' },
      include: {
        asset: { select: { id: true, assetCode: true, brand: true, model: true } },
        engineer: { select: { id: true, name: true } },
      },
    }),
    prisma.preventiveMaintenance.count({ where }),
  ]);

  sendSuccess(res, data, 'PM records retrieved', 200, buildPaginationMeta(total, page, limit));
});

pmRouter.get('/calendar', async (req, res) => {
  const { year, month } = req.query as Record<string, string>;
  const y = parseInt(year || String(new Date().getFullYear()));
  const m = parseInt(month || String(new Date().getMonth() + 1));

  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59, 999);

  const pms = await prisma.preventiveMaintenance.findMany({
    where: { scheduledDate: { gte: startDate, lte: endDate } },
    include: {
      asset: { select: { id: true, assetCode: true, brand: true, model: true, type: true } },
      engineer: { select: { id: true, name: true } },
    },
  });

  sendSuccess(res, pms);
});

pmRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const code = await generatePMCode();
  const pm = await prisma.preventiveMaintenance.create({
    data: {
      ...req.body,
      pmCode: code,
      scheduledDate: new Date(req.body.scheduledDate),
      completedDate: req.body.completedDate ? new Date(req.body.completedDate) : null,
      nextPMDate: req.body.nextPMDate ? new Date(req.body.nextPMDate) : null,
      checklist: req.body.checklist ? JSON.stringify(req.body.checklist) : null,
    },
  });
  await createAuditLog({ req, action: 'CREATE', module: 'maintenance', recordId: pm.id, recordCode: code });
  sendCreated(res, pm, 'PM scheduled');
});

pmRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.preventiveMaintenance.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  const pm = await prisma.preventiveMaintenance.update({
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
    await prisma.asset.update({
      where: { id: pm.assetId },
      data: {
        lastMaintenance: pm.completedDate || new Date(),
        nextMaintenance: pm.nextPMDate || undefined,
      },
    });
    await prisma.assetHistory.create({
      data: {
        assetId: pm.assetId,
        action: 'MAINTENANCE_COMPLETED',
        description: `PM ${pm.pmCode} completed: ${pm.maintenanceType}`,
        performedBy: req.user?.name,
      },
    });
  }

  await createAuditLog({ req, action: 'UPDATE', module: 'maintenance', recordId: pm.id, recordCode: pm.pmCode });
  sendSuccess(res, pm, 'PM updated');
});

export { amcRouter, pmRouter };
