import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/database';
import {
  sendSuccess, sendCreated, sendNotFound, sendBadRequest,
  buildPaginationMeta, getPaginationParams,
} from '../utils/response';
import { generateVendorCode } from '../utils/idGenerator';
import { createAuditLog } from '../utils/auditLog';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { z } from 'zod';
import 'express-async-errors';

const router = Router();
router.use(authenticate);

const vendorSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  services: z.string().optional(),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  sla: z.string().optional(),
  status: z.string().default('ACTIVE'),
  remarks: z.string().optional(),
});

router.get('/', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { status, type, search } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (type) where.type = type;
  if (search) where.OR = [
    { name: { contains: search } },
    { vendorCode: { contains: search } },
    { contactPerson: { contains: search } },
  ];

  const [data, total] = await Promise.all([
    prisma.vendor.findMany({
      where, skip, take: limit,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { invoices: true, tickets: true, amcContracts: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  sendSuccess(res, data, 'Vendors retrieved', 200, buildPaginationMeta(total, page, limit));
});

router.get('/:id/profile', async (req, res) => {
  const vendor = await prisma.vendor.findFirst({
    where: { OR: [{ id: req.params.id }, { vendorCode: req.params.id }], deletedAt: null },
    include: {
      contacts: true,
      contracts: true,
      invoices: { orderBy: { invoiceDate: 'desc' }, take: 10 },
      payments: { orderBy: { paymentDate: 'desc' }, take: 10 },
      tickets: { where: { deletedAt: null }, orderBy: { date: 'desc' }, take: 10 },
      amcContracts: { orderBy: { endDate: 'asc' }, take: 5 },
      followups: { orderBy: { followupDate: 'desc' }, take: 10 },
      _count: { select: { invoices: true, payments: true, tickets: true } },
    },
  });
  if (!vendor) { sendNotFound(res); return; }
  sendSuccess(res, vendor);
});

router.get('/:id', async (req, res) => {
  const vendor = await prisma.vendor.findFirst({
    where: { OR: [{ id: req.params.id }, { vendorCode: req.params.id }], deletedAt: null },
    include: { contacts: true },
  });
  if (!vendor) { sendNotFound(res); return; }
  sendSuccess(res, vendor);
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  const result = vendorSchema.safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const code = await generateVendorCode();
  const vendor = await prisma.vendor.create({
    data: {
      ...result.data,
      vendorCode: code,
      type: result.data.type as never,
      status: result.data.status as never,
      contractStart: result.data.contractStart ? new Date(result.data.contractStart) : null,
      contractEnd: result.data.contractEnd ? new Date(result.data.contractEnd) : null,
      email: result.data.email || null,
    },
  });

  await createAuditLog({ req, action: 'CREATE', module: 'vendors', recordId: vendor.id, recordCode: code });
  sendCreated(res, vendor, 'Vendor created');
});

router.put('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.vendor.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) { sendNotFound(res); return; }

  const result = vendorSchema.partial().safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const vendor = await prisma.vendor.update({
    where: { id: req.params.id },
    data: {
      ...result.data,
      type: result.data.type as never,
      status: result.data.status as never,
      contractStart: result.data.contractStart ? new Date(result.data.contractStart) : undefined,
      contractEnd: result.data.contractEnd ? new Date(result.data.contractEnd) : undefined,
    },
  });

  await createAuditLog({ req, action: 'UPDATE', module: 'vendors', recordId: vendor.id, recordCode: vendor.vendorCode });
  sendSuccess(res, vendor, 'Vendor updated');
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.vendor.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) { sendNotFound(res); return; }
  await prisma.vendor.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await createAuditLog({ req, action: 'DELETE', module: 'vendors', recordId: req.params.id });
  sendSuccess(res, null, 'Vendor deleted');
});

// POST /api/v1/vendors/bulk-delete
router.post('/bulk-delete', async (req: AuthenticatedRequest, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    sendBadRequest(res, 'Array of ids is required');
    return;
  }

  await prisma.vendor.updateMany({
    where: { id: { in: ids } },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    req,
    action: 'BULK_DELETE',
    module: 'vendors',
    recordId: 'bulk',
    description: JSON.stringify({ count: ids.length, ids }),
  });

  sendSuccess(res, { count: ids.length }, `Successfully deleted ${ids.length} vendor(s)`);
});

export default router;
