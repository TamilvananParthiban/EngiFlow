import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/database';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest, buildPaginationMeta, getPaginationParams } from '../utils/response';
import { generateFollowupCode, generateExpenseCode } from '../utils/idGenerator';
import { createAuditLog } from '../utils/auditLog';
import { AuthenticatedRequest } from '../middleware/authenticate';
import 'express-async-errors';

const followupRouter = Router();
const expenseRouter = Router();

followupRouter.use(authenticate);
expenseRouter.use(authenticate);

// Follow-ups
followupRouter.get('/', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { status, followupDate, vendorId, ticketId, taskId, invoiceId, search } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (vendorId) where.vendorId = vendorId;
  if (ticketId) where.ticketId = ticketId;
  if (taskId) where.taskId = taskId;
  if (invoiceId) where.invoiceId = invoiceId;
  if (search) where.subject = { contains: search };
  if (followupDate) {
    const d = new Date(followupDate);
    d.setHours(0, 0, 0, 0);
    const e = new Date(followupDate);
    e.setHours(23, 59, 59, 999);
    where.followupDate = { gte: d, lte: e };
  }

  const [data, total] = await Promise.all([
    prisma.followup.findMany({
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
    prisma.followup.count({ where }),
  ]);

  sendSuccess(res, data, 'Follow-ups retrieved', 200, buildPaginationMeta(total, page, limit));
});

followupRouter.get('/today', async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const followups = await prisma.followup.findMany({
    where: { followupDate: { gte: today, lte: todayEnd }, status: { not: 'COMPLETED' } },
    include: {
      vendor: { select: { id: true, name: true } },
      ticket: { select: { id: true, ticketNumber: true } },
      invoice: { select: { id: true, invoiceCode: true } },
      task: { select: { id: true, taskCode: true } },
    },
    orderBy: { followupDate: 'asc' },
  });

  sendSuccess(res, followups);
});

followupRouter.get('/:id', async (req, res) => {
  const followup = await prisma.followup.findUnique({
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
  if (!followup) { sendNotFound(res); return; }
  sendSuccess(res, followup);
});

followupRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const code = await generateFollowupCode();
  const followup = await prisma.followup.create({
    data: {
      ...req.body,
      followupCode: code,
      followupDate: new Date(req.body.followupDate),
      nextFollowupDate: req.body.nextFollowupDate ? new Date(req.body.nextFollowupDate) : null,
      userId: req.user!.id,
    },
    include: { history: true },
  });

  if (req.body.discussion) {
    await prisma.followupHistory.create({
      data: {
        followupId: followup.id,
        note: req.body.discussion,
        nextFollowupDate: req.body.nextFollowupDate ? new Date(req.body.nextFollowupDate) : null,
        status: followup.status,
        createdById: req.user!.id,
      },
    });
  }

  await createAuditLog({ req, action: 'CREATE', module: 'followups', recordId: followup.id, recordCode: code });
  sendCreated(res, followup, 'Follow-up created');
});

followupRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.followup.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  const completedDate = req.body.status === 'COMPLETED' ? new Date() : undefined;
  const followup = await prisma.followup.update({
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
    await prisma.followupHistory.create({
      data: {
        followupId: followup.id,
        note: req.body.discussion || req.body.note || `Status updated to ${req.body.status || followup.status}`,
        nextFollowupDate: req.body.nextFollowupDate ? new Date(req.body.nextFollowupDate) : followup.nextFollowupDate,
        status: followup.status,
        createdById: req.user!.id,
      },
    });
  }

  sendSuccess(res, followup, 'Follow-up updated');
});

followupRouter.post('/:id/history', async (req: AuthenticatedRequest, res) => {
  const { note, nextFollowupDate, status } = req.body;
  const historyItem = await prisma.followupHistory.create({
    data: {
      followupId: req.params.id,
      note: note || 'Discussion note added',
      nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate) : null,
      status: status || undefined,
      createdById: req.user!.id,
    },
  });

  if (nextFollowupDate || status) {
    await prisma.followup.update({
      where: { id: req.params.id },
      data: {
        ...(nextFollowupDate ? { nextFollowupDate: new Date(nextFollowupDate) } : {}),
        ...(status ? { status } : {}),
      },
    });
  }

  sendCreated(res, historyItem, 'Follow-up history added');
});

followupRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  await prisma.followupHistory.deleteMany({ where: { followupId: req.params.id } });
  await prisma.followup.delete({ where: { id: req.params.id } });
  sendSuccess(res, null, 'Follow-up deleted');
});

// POST /api/v1/followups/bulk-delete
followupRouter.post('/bulk-delete', async (req: AuthenticatedRequest, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    sendBadRequest(res, 'Array of ids is required');
    return;
  }
  await prisma.followupHistory.deleteMany({ where: { followupId: { in: ids } } });
  await prisma.followup.deleteMany({ where: { id: { in: ids } } });
  sendSuccess(res, { count: ids.length }, `Successfully deleted ${ids.length} follow-up(s)`);
});

// Expenses
expenseRouter.get('/', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { month, year, categoryId, vendorId } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (month) where.month = parseInt(month);
  if (year) where.year = parseInt(year);
  if (categoryId) where.categoryId = categoryId;
  if (vendorId) where.vendorId = vendorId;

  const [data, total] = await Promise.all([
    prisma.expense.findMany({
      where, skip, take: limit,
      orderBy: { expenseDate: 'desc' },
      include: {
        category: true,
        vendor: { select: { id: true, name: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  sendSuccess(res, data, 'Expenses retrieved', 200, buildPaginationMeta(total, page, limit));
});

expenseRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const code = await generateExpenseCode();
  const d = new Date(req.body.expenseDate);
  const expense = await prisma.expense.create({
    data: {
      ...req.body,
      expenseCode: code,
      expenseDate: d,
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    },
  });
  await createAuditLog({ req, action: 'CREATE', module: 'expenses', recordId: expense.id, recordCode: code });
  sendCreated(res, expense, 'Expense recorded');
});

// Laptop Rentals
const rentalRouter = Router();
rentalRouter.use(authenticate);

rentalRouter.get('/', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { vendorId, paymentStatus, search } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (vendorId) where.vendorId = vendorId;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (search) {
    where.OR = [
      { rentalCode: { contains: search } },
      { serialNumber: { contains: search } },
      { laptopModel: { contains: search } },
      { assignedUserName: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.laptopRental.findMany({
      where, skip, take: limit,
      orderBy: { rentalStart: 'desc' },
      include: {
        vendor: { select: { id: true, name: true } },
        asset: { select: { id: true, assetCode: true } },
      },
    }),
    prisma.laptopRental.count({ where }),
  ]);

  sendSuccess(res, data, 'Laptop rentals retrieved', 200, buildPaginationMeta(total, page, limit));
});

rentalRouter.get('/:id', async (req, res) => {
  const rental = await prisma.laptopRental.findUnique({
    where: { id: req.params.id },
    include: { vendor: true, asset: true },
  });
  if (!rental) { sendNotFound(res); return; }
  sendSuccess(res, rental);
});

rentalRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const { generateRentalCode } = await import('../utils/idGenerator');
  const code = await generateRentalCode();
  const subtotal = Number(req.body.monthlyRental || 0);
  const gstPercent = Number(req.body.gstPercent || 18);
  const gstAmount = (subtotal * gstPercent) / 100;
  const totalMonthly = subtotal + gstAmount;

  const rental = await prisma.laptopRental.create({
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

  await createAuditLog({ req, action: 'CREATE', module: 'laptop_rentals', recordId: rental.id, recordCode: code });
  sendCreated(res, rental, 'Laptop rental created');
});

rentalRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.laptopRental.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  const subtotal = req.body.monthlyRental !== undefined ? Number(req.body.monthlyRental) : Number(existing.monthlyRental);
  const gstPercent = req.body.gstPercent !== undefined ? Number(req.body.gstPercent) : Number(existing.gstPercent);
  const gstAmount = (subtotal * gstPercent) / 100;
  const totalMonthly = subtotal + gstAmount;

  const rental = await prisma.laptopRental.update({
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

  sendSuccess(res, rental, 'Laptop rental updated');
});

rentalRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  await prisma.laptopRental.delete({ where: { id: req.params.id } });
  sendSuccess(res, null, 'Laptop rental deleted');
});

// POST /api/v1/rentals/bulk-delete
rentalRouter.post('/bulk-delete', async (req: AuthenticatedRequest, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    sendBadRequest(res, 'Array of ids is required');
    return;
  }
  await prisma.laptopRental.deleteMany({ where: { id: { in: ids } } });
  sendSuccess(res, { count: ids.length }, `Successfully deleted ${ids.length} rental(s)`);
});

export { followupRouter, expenseRouter, rentalRouter };
