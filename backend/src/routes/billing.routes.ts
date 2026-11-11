import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/database';
import {
  sendSuccess, sendCreated, sendNotFound, sendBadRequest,
  buildPaginationMeta, getPaginationParams,
} from '../utils/response';
import { generateInvoiceCode, generatePaymentCode } from '../utils/idGenerator';
import { createAuditLog } from '../utils/auditLog';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { z } from 'zod';
import 'express-async-errors';

const invoiceRouter = Router();
const paymentRouter = Router();

invoiceRouter.use(authenticate);
paymentRouter.use(authenticate);

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1),
  vendorId: z.string().min(1),
  service: z.string().optional(),
  invoiceDate: z.string().min(1),
  billingPeriod: z.string().optional(),
  subtotal: z.number().positive(),
  gstPercent: z.number().default(18),
  dueDate: z.string().optional(),
  approvalStatus: z.string().default('DRAFT'),
  paymentStatus: z.string().default('PENDING'),
  remarks: z.string().optional(),
});

invoiceRouter.get('/', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { paymentStatus, approvalStatus, vendorId } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (approvalStatus) where.approvalStatus = approvalStatus;
  if (vendorId) where.vendorId = vendorId;

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where, skip, take: limit,
      orderBy: { invoiceDate: 'desc' },
      include: { vendor: { select: { id: true, name: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);

  sendSuccess(res, data, 'Invoices retrieved', 200, buildPaginationMeta(total, page, limit));
});

invoiceRouter.get('/:id', async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      vendor: true,
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  });
  if (!invoice) { sendNotFound(res); return; }
  sendSuccess(res, invoice);
});

invoiceRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const result = invoiceSchema.safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const gstAmount = (result.data.subtotal * result.data.gstPercent) / 100;
  const totalAmount = result.data.subtotal + gstAmount;
  const code = await generateInvoiceCode();

  const invoice = await prisma.invoice.create({
    data: {
      invoiceCode: code,
      invoiceNumber: result.data.invoiceNumber,
      vendorId: result.data.vendorId,
      service: result.data.service,
      invoiceDate: new Date(result.data.invoiceDate),
      billingPeriod: result.data.billingPeriod,
      subtotal: result.data.subtotal,
      gstPercent: result.data.gstPercent,
      gstAmount,
      totalAmount,
      dueDate: result.data.dueDate ? new Date(result.data.dueDate) : null,
      approvalStatus: result.data.approvalStatus as never,
      paymentStatus: result.data.paymentStatus as never,
      remarks: result.data.remarks,
    },
  });

  await createAuditLog({ req, action: 'CREATE', module: 'invoices', recordId: invoice.id, recordCode: code });
  sendCreated(res, invoice, 'Invoice created');
});

invoiceRouter.patch('/:id/approve', async (req: AuthenticatedRequest, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) { sendNotFound(res); return; }

  const updated = await prisma.invoice.update({
    where: { id: req.params.id },
    data: { approvalStatus: 'APPROVED', paymentStatus: 'PAYMENT_PENDING' as never },
  });
  await createAuditLog({ req, action: 'APPROVE', module: 'invoices', recordId: invoice.id, recordCode: invoice.invoiceCode });
  sendSuccess(res, updated, 'Invoice approved');
});

invoiceRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  const result = invoiceSchema.partial().safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  let gstAmount = Number(existing.gstAmount);
  let totalAmount = Number(existing.totalAmount);
  if (result.data.subtotal !== undefined || result.data.gstPercent !== undefined) {
    const sub = result.data.subtotal ?? Number(existing.subtotal);
    const gst = result.data.gstPercent ?? Number(existing.gstPercent);
    gstAmount = (sub * gst) / 100;
    totalAmount = sub + gstAmount;
  }

  const invoice = await prisma.invoice.update({
    where: { id: req.params.id },
    data: {
      ...result.data,
      invoiceDate: result.data.invoiceDate ? new Date(result.data.invoiceDate) : undefined,
      dueDate: result.data.dueDate ? new Date(result.data.dueDate) : undefined,
      gstAmount,
      totalAmount,
      approvalStatus: result.data.approvalStatus as never,
      paymentStatus: result.data.paymentStatus as never,
    },
  });
  sendSuccess(res, invoice, 'Invoice updated');
});

invoiceRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  // Unlink associated payments and followups
  await prisma.payment.updateMany({ where: { invoiceId: req.params.id }, data: { invoiceId: null } });
  await prisma.followup.updateMany({ where: { invoiceId: req.params.id }, data: { invoiceId: null } });

  await prisma.invoice.delete({ where: { id: req.params.id } });

  await createAuditLog({
    req,
    action: 'DELETE',
    module: 'invoices',
    recordId: req.params.id,
    recordCode: existing.invoiceCode,
  });

  sendSuccess(res, null, 'Invoice deleted successfully');
});

invoiceRouter.post('/bulk-delete', async (req: AuthenticatedRequest, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    sendBadRequest(res, 'Array of invoice IDs required');
    return;
  }
  await prisma.payment.updateMany({ where: { invoiceId: { in: ids } }, data: { invoiceId: null } });
  await prisma.followup.updateMany({ where: { invoiceId: { in: ids } }, data: { invoiceId: null } });
  await prisma.invoice.deleteMany({ where: { id: { in: ids } } });
  await createAuditLog({ req, action: 'DELETE', module: 'invoices', recordId: 'BULK_DELETE', recordCode: `${ids.length} invoices deleted` });
  sendSuccess(res, null, `${ids.length} invoices deleted successfully`);
});

// PAYMENTS
paymentRouter.get('/', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { vendorId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (vendorId) where.vendorId = vendorId;

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where, skip, take: limit,
      orderBy: { paymentDate: 'desc' },
      include: { vendor: { select: { id: true, name: true } }, invoice: { select: { id: true, invoiceCode: true, invoiceNumber: true } } },
    }),
    prisma.payment.count({ where }),
  ]);
  sendSuccess(res, data, 'Payments retrieved', 200, buildPaginationMeta(total, page, limit));
});

paymentRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const code = await generatePaymentCode();
  const payment = await prisma.payment.create({
    data: {
      ...req.body,
      paymentCode: code,
      paymentDate: new Date(req.body.paymentDate),
    },
  });

  // Update invoice payment status if linked
  if (payment.invoiceId) {
    const invoice = await prisma.invoice.findUnique({ where: { id: payment.invoiceId } });
    if (invoice) {
      const totalPaid = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { invoiceId: payment.invoiceId },
      });
      const paid = Number(totalPaid._sum.amount || 0);
      if (paid >= Number(invoice.totalAmount)) {
        await prisma.invoice.update({
          where: { id: payment.invoiceId },
          data: { paymentStatus: 'PAID', paymentDate: payment.paymentDate, paymentReference: payment.referenceNumber },
        });
      }
    }
  }

  await createAuditLog({ req, action: 'CREATE', module: 'payments', recordId: payment.id, recordCode: code });
  sendCreated(res, payment, 'Payment recorded');
});

export { invoiceRouter, paymentRouter };
