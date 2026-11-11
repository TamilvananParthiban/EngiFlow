import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/database';
import {
  sendSuccess, sendCreated, sendNotFound, sendBadRequest,
  buildPaginationMeta, getPaginationParams,
} from '../utils/response';
import { generateTaskCode } from '../utils/idGenerator';
import { createAuditLog } from '../utils/auditLog';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { z } from 'zod';
import 'express-async-errors';

const router = Router();
router.use(authenticate);

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  assignedUserId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED']).default('TODO'),
  assetId: z.string().optional(),
  vendorId: z.string().optional(),
  ticketId: z.string().optional(),
  remarks: z.string().optional(),
});

router.get('/', async (req: AuthenticatedRequest, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { status, priority, assignedUserId, search } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedUserId) where.assignedUserId = assignedUserId;
  if (search) where.title = { contains: search };

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where, skip, take: limit,
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      include: {
        assignedUser: { select: { id: true, name: true, avatar: true } },
        createdBy: { select: { id: true, name: true } },
        subtasks: true,
        asset: { select: { id: true, assetCode: true, brand: true, model: true } },
        vendor: { select: { id: true, name: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  sendSuccess(res, data, 'Tasks retrieved', 200, buildPaginationMeta(total, page, limit));
});

router.get('/kanban', async (req: AuthenticatedRequest, res) => {
  const statuses = ['TODO', 'IN_PROGRESS', 'WAITING', 'COMPLETED'];
  const kanban: Record<string, unknown[]> = {};

  await Promise.all(statuses.map(async (s) => {
    kanban[s] = await prisma.task.findMany({
      where: { status: s as never },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      include: {
        assignedUser: { select: { id: true, name: true, avatar: true } },
        subtasks: true,
        asset: { select: { id: true, assetCode: true, brand: true, model: true } },
        vendor: { select: { id: true, name: true } },
      },
      take: 50,
    });
  }));

  sendSuccess(res, kanban);
});

router.get('/:id', async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      ticket: { select: { id: true, ticketNumber: true, subject: true } },
      asset: { select: { id: true, assetCode: true, brand: true, model: true } },
      vendor: { select: { id: true, name: true } },
      subtasks: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!task) { sendNotFound(res); return; }
  sendSuccess(res, task);
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  const result = taskSchema.safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const code = await generateTaskCode();
  const task = await prisma.task.create({
    data: {
      ...result.data,
      taskCode: code,
      createdById: req.user!.id,
      startDate: result.data.startDate ? new Date(result.data.startDate) : null,
      dueDate: result.data.dueDate ? new Date(result.data.dueDate) : null,
      priority: result.data.priority as never,
      status: result.data.status as never,
    },
    include: { subtasks: true },
  });

  await createAuditLog({ req, action: 'CREATE', module: 'tasks', recordId: task.id, recordCode: code });
  sendCreated(res, task, 'Task created');
});

router.put('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  const result = taskSchema.partial().safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const completedDate = result.data.status === 'COMPLETED' ? new Date() : undefined;
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      ...result.data,
      startDate: result.data.startDate ? new Date(result.data.startDate) : undefined,
      dueDate: result.data.dueDate ? new Date(result.data.dueDate) : undefined,
      completedDate,
      priority: result.data.priority as never,
      status: result.data.status as never,
    },
    include: { subtasks: true },
  });

  await createAuditLog({ req, action: 'UPDATE', module: 'tasks', recordId: task.id, recordCode: task.taskCode });
  sendSuccess(res, task, 'Task updated');
});

router.patch('/:id/status', async (req: AuthenticatedRequest, res) => {
  const { status } = req.body;
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      status: status as never,
      completedDate: status === 'COMPLETED' ? new Date() : undefined,
    },
  });
  sendSuccess(res, task, 'Task status updated');
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }
  await prisma.task.delete({ where: { id: req.params.id } });
  await createAuditLog({ req, action: 'DELETE', module: 'tasks', recordId: req.params.id });
  sendSuccess(res, null, 'Task deleted');
});

router.post('/bulk-delete', async (req: AuthenticatedRequest, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    sendBadRequest(res, 'Array of task IDs required');
    return;
  }
  await prisma.taskSubtask.deleteMany({ where: { taskId: { in: ids } } });
  await prisma.task.deleteMany({ where: { id: { in: ids } } });
  await createAuditLog({ req, action: 'DELETE', module: 'tasks', recordId: 'BULK_DELETE', recordCode: `${ids.length} tasks deleted` });
  sendSuccess(res, null, `${ids.length} tasks deleted successfully`);
});

// Subtask endpoints
router.post('/:id/subtasks', async (req: AuthenticatedRequest, res) => {
  const { title } = req.body;
  if (!title) { sendBadRequest(res, 'Subtask title is required'); return; }

  const subtask = await prisma.taskSubtask.create({
    data: {
      taskId: req.params.id,
      title,
      isCompleted: false,
    },
  });
  sendCreated(res, subtask, 'Subtask added');
});

router.patch('/subtasks/:subtaskId', async (req: AuthenticatedRequest, res) => {
  const { isCompleted, title } = req.body;
  const subtask = await prisma.taskSubtask.update({
    where: { id: req.params.subtaskId },
    data: {
      ...(isCompleted !== undefined ? { isCompleted } : {}),
      ...(title ? { title } : {}),
    },
  });
  sendSuccess(res, subtask, 'Subtask updated');
});

router.delete('/subtasks/:subtaskId', async (req: AuthenticatedRequest, res) => {
  await prisma.taskSubtask.delete({ where: { id: req.params.subtaskId } });
  sendSuccess(res, null, 'Subtask deleted');
});

export default router;
