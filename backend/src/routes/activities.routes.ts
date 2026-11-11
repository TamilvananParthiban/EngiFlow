import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/database';
import {
  sendSuccess, sendCreated, sendNotFound, sendBadRequest,
  buildPaginationMeta, getPaginationParams,
} from '../utils/response';
import { generateActivityCode } from '../utils/idGenerator';
import { createAuditLog } from '../utils/auditLog';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { z } from 'zod';
import 'express-async-errors';

const router = Router();
router.use(authenticate);

const activitySchema = z.object({
  date: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  title: z.string().min(1).max(200),
  category: z.string().min(1),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  description: z.string().optional(),
  actionTaken: z.string().optional(),
  assetId: z.string().optional(),
  departmentId: z.string().optional(),
  vendorId: z.string().optional(),
  status: z.string().default('PLANNED'),
  followupRequired: z.boolean().default(false),
  followupDate: z.string().optional(),
  remarks: z.string().optional(),
});

// GET /api/v1/activities
router.get('/', async (req: AuthenticatedRequest, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { status, category, date, startDate, endDate, search } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (date) where.date = new Date(date);
  if (startDate && endDate) where.date = { gte: new Date(startDate), lte: new Date(endDate) };
  if (search) where.title = { contains: search };

  const [data, total] = await Promise.all([
    prisma.activity.findMany({
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
    prisma.activity.count({ where }),
  ]);

  sendSuccess(res, data, 'Activities retrieved', 200, buildPaginationMeta(total, page, limit));
});

// GET /api/v1/activities/today
router.get('/today', async (req: AuthenticatedRequest, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const activities = await prisma.activity.findMany({
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

  sendSuccess(res, { activities, summary });
});

// GET /api/v1/activities/:id
router.get('/:id', async (req, res) => {
  const activity = await prisma.activity.findUnique({
    where: { id: req.params.id },
    include: {
      asset: true,
      vendor: true,
      department: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!activity) { sendNotFound(res); return; }
  sendSuccess(res, activity);
});

// POST /api/v1/activities
router.post('/', async (req: AuthenticatedRequest, res) => {
  const result = activitySchema.safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const code = await generateActivityCode();
  const activity = await prisma.activity.create({
    data: {
      ...result.data,
      activityCode: code,
      date: new Date(result.data.date),
      followupDate: result.data.followupDate ? new Date(result.data.followupDate) : null,
      category: result.data.category as never,
      priority: result.data.priority as never,
      status: result.data.status as never,
      createdById: req.user!.id,
    },
  });

  await createAuditLog({ req, action: 'CREATE', module: 'activities', recordId: activity.id, recordCode: code });
  sendCreated(res, activity, 'Activity created successfully');
});

// PUT /api/v1/activities/:id
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.activity.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  const result = activitySchema.partial().safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const activity = await prisma.activity.update({
    where: { id: req.params.id },
    data: {
      ...result.data,
      date: result.data.date ? new Date(result.data.date) : undefined,
      followupDate: result.data.followupDate ? new Date(result.data.followupDate) : undefined,
      category: result.data.category as never,
      priority: result.data.priority as never,
      status: result.data.status as never,
    },
  });

  await createAuditLog({ req, action: 'UPDATE', module: 'activities', recordId: activity.id, recordCode: activity.activityCode });
  sendSuccess(res, activity, 'Activity updated');
});

// DELETE /api/v1/activities/:id
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.activity.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }
  await prisma.activity.delete({ where: { id: req.params.id } });
  await createAuditLog({ req, action: 'DELETE', module: 'activities', recordId: req.params.id });
  sendSuccess(res, null, 'Activity deleted');
});

// POST /api/v1/activities/bulk-delete
router.post('/bulk-delete', async (req: AuthenticatedRequest, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    sendBadRequest(res, 'Array of activity IDs required');
    return;
  }
  await prisma.activity.deleteMany({ where: { id: { in: ids } } });
  await createAuditLog({ req, action: 'DELETE', module: 'activities', recordId: 'BULK_DELETE', recordCode: `${ids.length} activities deleted` });
  sendSuccess(res, null, `${ids.length} activities deleted successfully`);
});

// POST /api/v1/activities/:id/duplicate
router.post('/:id/duplicate', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.activity.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  const code = await generateActivityCode();
  const activity = await prisma.activity.create({
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
      createdById: req.user!.id,
    },
  });
  await createAuditLog({ req, action: 'CREATE', module: 'activities', recordId: activity.id, recordCode: code });
  sendCreated(res, activity, 'Activity duplicated');
});

// POST /api/v1/activities/:id/timer
router.post('/:id/timer', async (req: AuthenticatedRequest, res) => {
  const { startTime, endTime, duration } = req.body;
  const existing = await prisma.activity.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  const activity = await prisma.activity.update({
    where: { id: req.params.id },
    data: {
      startTime: startTime || existing.startTime,
      endTime: endTime || existing.endTime,
      duration: duration !== undefined ? duration : existing.duration,
    },
  });
  sendSuccess(res, activity, 'Timer updated');
});

// EOD Summary
router.post('/eod', async (req: AuthenticatedRequest, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eod = await prisma.dailyEODSummary.upsert({
    where: { date_userId: { date: today, userId: req.user!.id } },
    update: { ...req.body },
    create: { ...req.body, date: today, userId: req.user!.id },
  });
  sendSuccess(res, eod, 'EOD summary saved');
});

router.get('/eod/today', async (req: AuthenticatedRequest, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eod = await prisma.dailyEODSummary.findUnique({
    where: { date_userId: { date: today, userId: req.user!.id } },
  });
  sendSuccess(res, eod);
});

router.get('/eod/:date', async (req: AuthenticatedRequest, res) => {
  const d = new Date(req.params.date);
  d.setHours(0, 0, 0, 0);
  const eod = await prisma.dailyEODSummary.findUnique({
    where: { date_userId: { date: d, userId: req.user!.id } },
  });
  sendSuccess(res, eod);
});

export default router;
