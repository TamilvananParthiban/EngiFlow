import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/database';
import { sendSuccess, sendBadRequest, buildPaginationMeta, getPaginationParams } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/authenticate';
import 'express-async-errors';

const router = Router();
router.use(authenticate);

// Global search across all modules
router.get('/', async (req: AuthenticatedRequest, res) => {
  const { q, modules } = req.query as Record<string, string>;

  if (!q || q.trim().length < 2) {
    sendBadRequest(res, 'Search query must be at least 2 characters');
    return;
  }

  const search = q.trim();
  const searchModules = modules ? modules.split(',') : ['assets', 'vendors', 'tickets', 'tasks', 'invoices'];

  const results: Record<string, unknown[]> = {};

  await Promise.all(searchModules.map(async (mod) => {
    switch (mod) {
      case 'assets':
        results.assets = await prisma.asset.findMany({
          where: {
            deletedAt: null,
            OR: [
              { assetCode: { contains: search } },
              { brand: { contains: search } },
              { model: { contains: search } },
              { serialNumber: { contains: search } },
              { hostname: { contains: search } },
            ],
          },
          take: 5,
          select: { id: true, assetCode: true, brand: true, model: true, type: true, status: true },
        });
        break;
      case 'vendors':
        results.vendors = await prisma.vendor.findMany({
          where: {
            deletedAt: null,
            OR: [{ name: { contains: search } }, { vendorCode: { contains: search } }],
          },
          take: 5,
          select: { id: true, vendorCode: true, name: true, type: true, status: true },
        });
        break;
      case 'tickets':
        results.tickets = await prisma.ticket.findMany({
          where: {
            deletedAt: null,
            OR: [{ ticketNumber: { contains: search } }, { subject: { contains: search } }],
          },
          take: 5,
          select: { id: true, ticketNumber: true, subject: true, status: true, priority: true },
        });
        break;
      case 'tasks':
        results.tasks = await prisma.task.findMany({
          where: { OR: [{ taskCode: { contains: search } }, { title: { contains: search } }] },
          take: 5,
          select: { id: true, taskCode: true, title: true, status: true, priority: true },
        });
        break;
      case 'invoices':
        results.invoices = await prisma.invoice.findMany({
          where: {
            OR: [{ invoiceCode: { contains: search } }, { invoiceNumber: { contains: search } }],
          },
          take: 5,
          select: { id: true, invoiceCode: true, invoiceNumber: true, totalAmount: true, paymentStatus: true },
        });
        break;
      case 'amc':
        results.amc = await prisma.aMCContract.findMany({
          where: { OR: [{ amcCode: { contains: search } }, { serviceType: { contains: search } }] },
          take: 5,
          select: { id: true, amcCode: true, serviceType: true, renewalStatus: true },
        });
        break;
    }
  }));

  sendSuccess(res, results);
});

// Notifications
import { generateOperationalNotifications } from '../services/notification.service';

const notifRouter = Router();
notifRouter.use(authenticate);

notifRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);

  // Generate deduplicated operational notifications for tasks & followups
  try {
    await generateOperationalNotifications(req.user!.id);
  } catch (err) {
    // Non-blocking
  }

  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where: { OR: [{ userId: req.user!.id }, { userId: null }] },
      skip, take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where: { OR: [{ userId: req.user!.id }, { userId: null }] } }),
  ]);

  const unread = await prisma.notification.count({
    where: { OR: [{ userId: req.user!.id }, { userId: null }], isRead: false },
  });

  sendSuccess(res, { notifications: data, unread }, 'Notifications', 200, buildPaginationMeta(total, page, limit));
});

notifRouter.patch('/:id/read', async (req: AuthenticatedRequest, res) => {
  await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true, readAt: new Date() } });
  sendSuccess(res, null, 'Marked as read');
});

notifRouter.patch('/read-all', async (req: AuthenticatedRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  sendSuccess(res, null, 'All notifications marked as read');
});

// Users Management API
const usersRouter = Router();
usersRouter.use(authenticate);

// List all users
usersRouter.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true, employeeId: true, name: true, email: true, role: true, status: true,
      phone: true, designation: true, avatar: true, lastLoginAt: true, createdAt: true,
      departmentId: true,
      department: { select: { id: true, name: true, code: true } },
    },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, users);
});

// Get user by ID
usersRouter.get('/:id', async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: {
      id: true, employeeId: true, name: true, email: true, role: true, status: true,
      phone: true, designation: true, avatar: true, lastLoginAt: true, createdAt: true,
      departmentId: true,
      department: { select: { id: true, name: true, code: true } },
    },
  });
  if (!user) { sendBadRequest(res, 'User not found'); return; }
  sendSuccess(res, user);
});

// Create new user
usersRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const { name, email, password, role, status, employeeId, phone, designation, departmentId } = req.body;

  if (!name || !email) {
    sendBadRequest(res, 'Name and email are required');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    sendBadRequest(res, 'A user with this email address already exists');
    return;
  }

  const { hashPassword } = await import('../services/auth.service');
  const passwordHash = await hashPassword(password || 'Admin@1234');

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: role || 'IT_SUPPORT',
      status: status || 'ACTIVE',
      employeeId: employeeId || null,
      phone: phone || null,
      designation: designation || null,
      departmentId: departmentId || null,
    },
    select: {
      id: true, employeeId: true, name: true, email: true, role: true, status: true,
      phone: true, designation: true, department: { select: { id: true, name: true } },
    },
  });

  sendSuccess(res, user, 'User created successfully', 201);
});

// Update user details
usersRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  const { password, email, ...rest } = req.body;
  const data: Record<string, unknown> = { ...rest };

  if (email) {
    data.email = email.toLowerCase().trim();
  }

  if (password && password.trim().length > 0) {
    const { hashPassword } = await import('../services/auth.service');
    data.passwordHash = await hashPassword(password.trim());
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: {
      id: true, employeeId: true, name: true, email: true, role: true, status: true,
      phone: true, designation: true, department: { select: { id: true, name: true } },
    },
  });
  sendSuccess(res, user, 'User updated successfully');
});

// Password Management (Reset / Change Password)
usersRouter.patch('/:id/password', async (req: AuthenticatedRequest, res) => {
  const { password } = req.body;
  if (!password || password.trim().length < 6) {
    sendBadRequest(res, 'Password must be at least 6 characters long');
    return;
  }

  const { hashPassword } = await import('../services/auth.service');
  const passwordHash = await hashPassword(password.trim());

  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash },
  });

  // Invalidate any active refresh tokens for security reset
  await prisma.refreshToken.updateMany({
    where: { userId: req.params.id },
    data: { revokedAt: new Date() },
  });

  sendSuccess(res, null, 'User password reset successfully');
});

// Role & Rights Update
usersRouter.patch('/:id/role', async (req: AuthenticatedRequest, res) => {
  const { role } = req.body;
  if (!role) {
    sendBadRequest(res, 'Role is required');
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });
  sendSuccess(res, user, `User role updated to ${role.replace(/_/g, ' ')}`);
});

// Status Update (ACTIVE / INACTIVE / SUSPENDED)
usersRouter.patch('/:id/status', async (req: AuthenticatedRequest, res) => {
  const { status } = req.body;
  if (!status) {
    sendBadRequest(res, 'Status is required');
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status },
    select: { id: true, name: true, email: true, status: true },
  });
  sendSuccess(res, user, `User status updated to ${status}`);
});

// Delete user (Soft delete)
usersRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date(), status: 'INACTIVE' },
  });
  sendSuccess(res, null, 'User removed successfully');
});

// Audit logs
const auditRouter = Router();
auditRouter.use(authenticate);

auditRouter.get('/', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { module, userId, action } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (module) where.module = module;
  if (userId) where.userId = userId;
  if (action) where.action = action;

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  sendSuccess(res, data, 'Audit logs', 200, buildPaginationMeta(total, page, limit));
});

// Departments & Locations
const deptRouter = Router();
deptRouter.use(authenticate);

deptRouter.get('/', async (_req, res) => {
  const depts = await prisma.department.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  sendSuccess(res, depts);
});

const locRouter = Router();
locRouter.use(authenticate);
locRouter.get('/', async (_req, res) => {
  const locs = await prisma.location.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  sendSuccess(res, locs);
});

// KPI Targets
const kpiRouter = Router();
kpiRouter.use(authenticate);

kpiRouter.get('/', async (_req, res) => {
  const targets = await prisma.kPITarget.findMany();
  sendSuccess(res, targets);
});

kpiRouter.put('/:metric', async (req: AuthenticatedRequest, res) => {
  const target = await prisma.kPITarget.upsert({
    where: { metric: req.params.metric },
    update: { targetValue: req.body.targetValue, updatedById: req.user?.id },
    create: {
      metric: req.params.metric,
      targetValue: req.body.targetValue,
      unit: req.body.unit || '%',
      description: req.body.description,
      updatedById: req.user?.id,
    },
  });
  sendSuccess(res, target, 'KPI target updated');
});

// Calendar Unified Events
const calendarRouter = Router();
calendarRouter.use(authenticate);

calendarRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const { start, end, types } = req.query as Record<string, string>;
  const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = end ? new Date(end) : new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);

  const selectedTypes = types ? types.split(',') : ['activity', 'task', 'followup'];
  const events: any[] = [];

  if (selectedTypes.includes('activity')) {
    const activities = await prisma.activity.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { createdBy: { select: { name: true } }, vendor: { select: { name: true } } },
    });
    activities.forEach((a) => {
      events.push({
        id: a.id,
        code: a.activityCode,
        title: `${a.activityCode}: ${a.title}`,
        date: a.date.toISOString().split('T')[0],
        time: a.startTime || '09:00 AM',
        type: 'activity',
        status: a.status,
        priority: a.priority,
        category: a.category,
        details: a.description || a.actionTaken || '',
      });
    });
  }

  if (selectedTypes.includes('task')) {
    const tasks = await prisma.task.findMany({
      where: { dueDate: { gte: startDate, lte: endDate } },
      include: { assignedUser: { select: { name: true } } },
    });
    tasks.forEach((t) => {
      if (t.dueDate) {
        events.push({
          id: t.id,
          code: t.taskCode,
          title: `${t.taskCode}: ${t.title}`,
          date: t.dueDate.toISOString().split('T')[0],
          time: '05:00 PM',
          type: 'task',
          status: t.status,
          priority: t.priority,
          assignedTo: t.assignedUser?.name,
          details: t.description || '',
        });
      }
    });
  }

  if (selectedTypes.includes('followup')) {
    const followups = await prisma.followup.findMany({
      where: { followupDate: { gte: startDate, lte: endDate } },
      include: { vendor: { select: { name: true } }, ticket: { select: { ticketNumber: true } } },
    });
    followups.forEach((f) => {
      events.push({
        id: f.id,
        code: f.followupCode,
        title: `${f.followupCode}: ${f.subject}`,
        date: f.followupDate.toISOString().split('T')[0],
        time: '10:00 AM',
        type: 'followup',
        status: f.status,
        priority: f.priority,
        vendor: f.vendor?.name,
        details: f.discussion || f.remarks || '',
      });
    });
  }

  sendSuccess(res, events);
});

export { router as searchRouter, notifRouter, usersRouter, auditRouter, deptRouter, locRouter, kpiRouter, calendarRouter };
