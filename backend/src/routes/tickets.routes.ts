import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/database';
import {
  sendSuccess, sendCreated, sendNotFound, sendBadRequest,
  buildPaginationMeta, getPaginationParams,
} from '../utils/response';
import { generateTicketNumber } from '../utils/idGenerator';
import { createAuditLog } from '../utils/auditLog';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { z } from 'zod';
import 'express-async-errors';

const router = Router();
router.use(authenticate);

const ticketSchema = z.object({
  date: z.string().min(1),
  reportedById: z.string().optional(),
  departmentId: z.string().optional(),
  assetId: z.string().optional(),
  category: z.string().min(1),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  subject: z.string().min(1).max(200),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  actionTaken: z.string().optional(),
  resolution: z.string().optional(),
  vendorId: z.string().optional(),
  vendorTicketNumber: z.string().optional(),
  downtimeStart: z.string().optional(),
  downtimeEnd: z.string().optional(),
  slaHours: z.number().optional(),
  status: z.string().default('OPEN'),
  assignedEngineerId: z.string().optional(),
  remarks: z.string().optional(),
});

router.get('/', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { status, priority, category, search } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category) where.category = category;
  if (search) where.OR = [
    { subject: { contains: search } },
    { ticketNumber: { contains: search } },
  ];

  const [data, total] = await Promise.all([
    prisma.ticket.findMany({
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
    prisma.ticket.count({ where }),
  ]);

  sendSuccess(res, data, 'Tickets retrieved', 200, buildPaginationMeta(total, page, limit));
});

router.get('/next-number', async (_req, res) => {
  const number = await generateTicketNumber();
  sendSuccess(res, { ticketNumber: number });
});

router.get('/:id', async (req, res) => {
  const ticket = await prisma.ticket.findFirst({
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
  if (!ticket) { sendNotFound(res); return; }
  sendSuccess(res, ticket);
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  const result = ticketSchema.safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const ticketNumber = await generateTicketNumber();

  // Calculate downtime duration
  let downtimeDuration: number | null = null;
  if (result.data.downtimeStart && result.data.downtimeEnd) {
    const start = new Date(result.data.downtimeStart);
    const end = new Date(result.data.downtimeEnd);
    downtimeDuration = Math.round((end.getTime() - start.getTime()) / 60000);
  }

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      date: new Date(result.data.date),
      reportedById: result.data.reportedById,
      departmentId: result.data.departmentId,
      assetId: result.data.assetId,
      category: result.data.category as never,
      priority: result.data.priority as never,
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
      status: result.data.status as never,
      assignedEngineerId: result.data.assignedEngineerId,
      remarks: result.data.remarks,
    },
  });

  // Add to asset history if asset selected
  if (ticket.assetId) {
    await prisma.assetHistory.create({
      data: {
        assetId: ticket.assetId,
        action: 'TICKET_CREATED',
        description: `Ticket ${ticketNumber} created: ${result.data.subject}`,
        performedBy: req.user?.name,
        ticketId: ticket.id,
      },
    });
  }

  await createAuditLog({ req, action: 'CREATE', module: 'tickets', recordId: ticket.id, recordCode: ticketNumber });
  sendCreated(res, ticket, 'Ticket created');
});

router.put('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.ticket.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) { sendNotFound(res); return; }

  const result = ticketSchema.partial().safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  let downtimeDuration = existing.downtimeDuration;
  if (result.data.downtimeStart && result.data.downtimeEnd) {
    const start = new Date(result.data.downtimeStart);
    const end = new Date(result.data.downtimeEnd);
    downtimeDuration = Math.round((end.getTime() - start.getTime()) / 60000);
  }

  const ticket = await prisma.ticket.update({
    where: { id: req.params.id },
    data: {
      ...result.data,
      date: result.data.date ? new Date(result.data.date) : undefined,
      downtimeStart: result.data.downtimeStart ? new Date(result.data.downtimeStart) : undefined,
      downtimeEnd: result.data.downtimeEnd ? new Date(result.data.downtimeEnd) : undefined,
      downtimeDuration,
      closedDate: result.data.status === 'CLOSED' ? new Date() : existing.closedDate,
      category: result.data.category as never,
      priority: result.data.priority as never,
      status: result.data.status as never,
    },
  });

  await createAuditLog({ req, action: 'UPDATE', module: 'tickets', recordId: ticket.id, recordCode: ticket.ticketNumber });
  sendSuccess(res, ticket, 'Ticket updated');
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.ticket.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) { sendNotFound(res); return; }
  await prisma.ticket.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await createAuditLog({ req, action: 'DELETE', module: 'tickets', recordId: req.params.id });
  sendSuccess(res, null, 'Ticket deleted');
});

// POST /api/v1/tickets/bulk-delete
router.post('/bulk-delete', async (req: AuthenticatedRequest, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    sendBadRequest(res, 'Array of ids is required');
    return;
  }

  await prisma.ticket.updateMany({
    where: { id: { in: ids } },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    req,
    action: 'BULK_DELETE',
    module: 'tickets',
    recordId: 'bulk',
    description: JSON.stringify({ count: ids.length, ids }),
  });

  sendSuccess(res, { count: ids.length }, `Successfully deleted ${ids.length} ticket(s)`);
});

export default router;
