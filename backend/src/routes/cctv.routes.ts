import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/database';
import {
  sendSuccess, sendCreated, sendNotFound, sendBadRequest,
  buildPaginationMeta, getPaginationParams,
} from '../utils/response';
import { generateCCTVCode, generateNVRCode } from '../utils/idGenerator';
import { createAuditLog } from '../utils/auditLog';
import { AuthenticatedRequest } from '../middleware/authenticate';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { pingDevice } from '../utils/pingUtils';
import 'express-async-errors';

const router = Router();
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

const cameraSchema = z.object({
  name: z.string().min(1),
  locationId: z.string().optional(),
  ipAddress: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  nvrId: z.string().optional(),
  channel: z.number().optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'FAULT', 'UNDER_MAINTENANCE']).default('ONLINE'),
  remarks: z.string().optional(),
});

const nvrSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  ipAddress: z.string().optional(),
  locationId: z.string().optional(),
  totalChannels: z.number().default(16),
  status: z.string().default('ONLINE'),
  remarks: z.string().optional(),
});

// CCTV Summary Statistics
router.get('/summary', async (_req, res) => {
  const [nvrs, totalCameras, onlineCameras, offlineCameras, faultCameras] = await Promise.all([
    prisma.nVRDevice.findMany({
      include: {
        _count: { select: { cameras: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.cCTVCamera.count(),
    prisma.cCTVCamera.count({ where: { status: 'ONLINE' } }),
    prisma.cCTVCamera.count({ where: { status: 'OFFLINE' } }),
    prisma.cCTVCamera.count({ where: { status: 'FAULT' } }),
  ]);

  const totalChannelsCapacity = nvrs.reduce((sum, n) => sum + (n.totalChannels || 16), 0);
  const totalChannelsUsed = nvrs.reduce((sum, n) => sum + n._count.cameras, 0);

  sendSuccess(res, {
    totalNvrs: nvrs.length,
    totalCameras,
    onlineCameras,
    offlineCameras,
    faultCameras,
    totalChannelsCapacity,
    totalChannelsUsed,
    nvrs,
  });
});

// GET /api/v1/cctv/cameras
router.get('/cameras', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { status, nvrId, locationId, search } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (nvrId) where.nvrId = nvrId;
  if (locationId) where.locationId = locationId;
  if (search) {
    where.OR = [
      { cameraCode: { contains: search } },
      { name: { contains: search } },
      { ipAddress: { contains: search } },
      { remarks: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.cCTVCamera.findMany({
      where, skip, take: limit,
      orderBy: [{ nvrId: 'asc' }, { channel: 'asc' }, { cameraCode: 'asc' }],
      include: {
        location: { select: { id: true, name: true } },
        nvr: { select: { id: true, nvrCode: true, name: true, ipAddress: true, brand: true } },
      },
    }),
    prisma.cCTVCamera.count({ where }),
  ]);

  sendSuccess(res, data, 'CCTV cameras retrieved', 200, buildPaginationMeta(total, page, limit));
});

// POST /api/v1/cctv/cameras
router.post('/cameras', async (req: AuthenticatedRequest, res) => {
  const result = cameraSchema.safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const code = await generateCCTVCode();
  const camera = await prisma.cCTVCamera.create({
    data: {
      cameraCode: code,
      ...result.data,
      status: result.data.status as never,
    },
    include: { location: true, nvr: true },
  });

  await createAuditLog({ req, action: 'CREATE', module: 'cctv_camera', recordId: camera.id, recordCode: code });
  sendCreated(res, camera, 'CCTV camera added');
});

// PUT /api/v1/cctv/cameras/:id
router.put('/cameras/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.cCTVCamera.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  const result = cameraSchema.partial().safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const camera = await prisma.cCTVCamera.update({
    where: { id: req.params.id },
    data: {
      ...result.data,
      status: result.data.status as never,
    },
    include: { location: true, nvr: true },
  });

  await createAuditLog({ req, action: 'UPDATE', module: 'cctv_camera', recordId: camera.id, recordCode: camera.cameraCode });
  sendSuccess(res, camera, 'CCTV camera updated');
});

// DELETE /api/v1/cctv/cameras/:id
router.delete('/cameras/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.cCTVCamera.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }
  await prisma.cCTVCamera.delete({ where: { id: req.params.id } });
  await createAuditLog({ req, action: 'DELETE', module: 'cctv_camera', recordId: req.params.id, recordCode: existing.cameraCode });
  sendSuccess(res, null, 'CCTV camera deleted');
});

// POST /api/v1/cctv/cameras/bulk-delete
router.post('/cameras/bulk-delete', async (req: AuthenticatedRequest, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    sendBadRequest(res, 'Array of camera IDs required');
    return;
  }
  await prisma.cCTVCamera.deleteMany({ where: { id: { in: ids } } });
  await createAuditLog({ req, action: 'DELETE', module: 'cctv_camera', recordId: 'BULK_DELETE', recordCode: `${ids.length} cameras deleted` });
  sendSuccess(res, null, `${ids.length} CCTV cameras deleted successfully`);
});

// POST /api/v1/cctv/cameras/:id/ping
router.post('/cameras/:id/ping', async (req, res) => {
  const camera = await prisma.cCTVCamera.findUnique({ where: { id: req.params.id } });
  if (!camera) { sendNotFound(res); return; }

  const pingResult = await pingDevice(camera.ipAddress);
  const updatedCamera = await prisma.cCTVCamera.update({
    where: { id: req.params.id },
    data: {
      status: pingResult.status as 'ONLINE' | 'OFFLINE',
      lastPingAt: pingResult.testedAt,
      latencyMs: pingResult.latencyMs,
    },
  });

  sendSuccess(res, {
    camera: updatedCamera,
    pingResult,
  }, `Camera ping test complete: ${pingResult.status} (${pingResult.latencyMs ? pingResult.latencyMs + 'ms' : 'no response'})`);
});

// POST /api/v1/cctv/nvrs/:id/ping
router.post('/nvrs/:id/ping', async (req, res) => {
  const nvr = await prisma.nVRDevice.findUnique({ where: { id: req.params.id } });
  if (!nvr) { sendNotFound(res); return; }

  const pingResult = await pingDevice(nvr.ipAddress);
  const updatedNVR = await prisma.nVRDevice.update({
    where: { id: req.params.id },
    data: {
      status: pingResult.status,
      lastPingAt: pingResult.testedAt,
      latencyMs: pingResult.latencyMs,
    },
  });

  sendSuccess(res, {
    nvr: updatedNVR,
    pingResult,
  }, `NVR ping test complete: ${pingResult.status} (${pingResult.latencyMs ? pingResult.latencyMs + 'ms' : 'no response'})`);
});

let isPingCancelled = false;

// POST /api/v1/cctv/ping-stop
router.post('/ping-stop', async (_req, res) => {
  isPingCancelled = true;
  sendSuccess(res, { cancelled: true }, 'Ping operation cancelled');
});

// POST /api/v1/cctv/ping-all
router.post('/ping-all', async (_req, res) => {
  isPingCancelled = false;

  const [cameras, nvrs] = await Promise.all([
    prisma.cCTVCamera.findMany({ select: { id: true, ipAddress: true } }),
    prisma.nVRDevice.findMany({ select: { id: true, ipAddress: true } }),
  ]);

  const startTime = Date.now();
  let onlineCount = 0;
  let offlineCount = 0;

  // Process cameras in parallel batches of 15
  const BATCH_SIZE = 15;
  for (let i = 0; i < cameras.length; i += BATCH_SIZE) {
    if (isPingCancelled) break;
    const batch = cameras.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (cam) => {
        if (isPingCancelled) return;
        const pingResult = await pingDevice(cam.ipAddress);
        if (pingResult.alive) onlineCount++;
        else offlineCount++;

        await prisma.cCTVCamera.update({
          where: { id: cam.id },
          data: {
            status: pingResult.status as 'ONLINE' | 'OFFLINE',
            lastPingAt: pingResult.testedAt,
            latencyMs: pingResult.latencyMs,
          },
        });
      })
    );
  }

  // Ping NVRs
  for (const nvr of nvrs) {
    if (isPingCancelled) break;
    const pingResult = await pingDevice(nvr.ipAddress);
    await prisma.nVRDevice.update({
      where: { id: nvr.id },
      data: {
        status: pingResult.status,
        lastPingAt: pingResult.testedAt,
        latencyMs: pingResult.latencyMs,
      },
    });
  }

  const durationMs = Date.now() - startTime;

  sendSuccess(
    res,
    {
      totalTested: cameras.length + nvrs.length,
      onlineCount,
      offlineCount,
      durationMs,
      cancelled: isPingCancelled,
      testedAt: new Date(),
    },
    isPingCancelled
      ? `Ping test stopped after ${Math.round(durationMs / 1000)}s`
      : `Bulk IP ping test completed in ${Math.round(durationMs / 1000)}s`
  );
});

// NVR Routes
router.get('/nvrs', async (_req, res) => {
  const nvrs = await prisma.nVRDevice.findMany({
    include: {
      location: { select: { id: true, name: true } },
      _count: { select: { cameras: true } },
    },
    orderBy: { nvrCode: 'asc' },
  });
  sendSuccess(res, nvrs);
});

router.post('/nvrs', async (req: AuthenticatedRequest, res) => {
  const result = nvrSchema.safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const code = await generateNVRCode();
  const nvr = await prisma.nVRDevice.create({
    data: {
      nvrCode: code,
      ...result.data,
    },
  });

  await createAuditLog({ req, action: 'CREATE', module: 'nvr_device', recordId: nvr.id, recordCode: code });
  sendCreated(res, nvr, 'NVR device added');
});

router.put('/nvrs/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.nVRDevice.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  const result = nvrSchema.partial().safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const nvr = await prisma.nVRDevice.update({
    where: { id: req.params.id },
    data: result.data,
  });

  sendSuccess(res, nvr, 'NVR device updated');
});

router.delete('/nvrs/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.nVRDevice.findUnique({ where: { id: req.params.id } });
  if (!existing) { sendNotFound(res); return; }

  // Unlink cameras
  await prisma.cCTVCamera.updateMany({ where: { nvrId: req.params.id }, data: { nvrId: null } });
  await prisma.nVRDevice.delete({ where: { id: req.params.id } });

  await createAuditLog({ req, action: 'DELETE', module: 'nvr_device', recordId: req.params.id, recordCode: existing.nvrCode });
  sendSuccess(res, null, 'NVR device deleted');
});

// Bulk Upload CCTV Excel File
router.post('/upload-file', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    sendBadRequest(res, 'CCTV Excel or CSV file is required');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const buffer = req.file.buffer as unknown as Buffer;

  if (req.file.originalname.toLowerCase().endsWith('.csv')) {
    const { Readable } = await import('stream');
    const stream = new Readable();
    stream.push(buffer as any);
    stream.push(null);
    await workbook.csv.read(stream as never);
  } else {
    await workbook.xlsx.load(buffer as any);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    sendBadRequest(res, 'Excel file must contain at least 1 data row');
    return;
  }

  let plant = await prisma.location.findFirst({ where: { name: { contains: 'PLANT 5' } } });
  if (!plant) {
    plant = await prisma.location.create({ data: { name: 'PLANT 5', code: 'LOC-PLANT5' } });
  }

  // Define 4 default NVRs if needed
  const nvrConfigs = [
    { nvrCode: 'NVR-P5-01', name: 'NVR NO 1 (192.168.65.21)', brand: 'HIKVISION', model: 'DS-7732NXI-K4', ipAddress: '192.168.65.21', totalChannels: 32, locationId: plant.id },
    { nvrCode: 'NVR-P5-02', name: 'NVR NO 2 (192.168.65.22)', brand: 'HIKVISION', model: 'DS-7732NXI-K4', ipAddress: '192.168.65.22', totalChannels: 32, locationId: plant.id },
    { nvrCode: 'NVR-P5-03', name: 'NVR NO 3 (192.168.65.23)', brand: 'HIKVISION', model: 'DS-7616NXI-K2', ipAddress: '192.168.65.23', totalChannels: 16, locationId: plant.id },
    { nvrCode: 'NVR-P5-04', name: 'NVR NO 4 (192.168.65.24)', brand: 'CP PLUS', model: 'CP PLUS 16CH', ipAddress: '192.168.65.24', totalChannels: 16, locationId: plant.id },
  ];

  const nvrMap = new Map<string, string>();
  for (const nvrData of nvrConfigs) {
    const nvr = await prisma.nVRDevice.upsert({
      where: { nvrCode: nvrData.nvrCode },
      update: nvrData,
      create: nvrData,
    });
    nvrMap.set(nvrData.nvrCode, nvr.id);
  }

  let currentNvrCode = 'NVR-P5-01';
  const createdCameras: any[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (!row.hasValues) continue;

    const cellVal = (col: number) => {
      try {
        const c = row.getCell(col);
        let val = c.value;
        if (val && typeof val === 'object') {
          if ((val as any).result !== undefined) val = (val as any).result;
          else if ((val as any).richText) val = (val as any).richText.map((t: any) => t.text).join('');
          else val = String(val);
        }
        return val ? String(val).trim() : '';
      } catch (e) { return ''; }
    };

    const c1 = cellVal(1);
    const c2 = cellVal(2);
    const c3 = cellVal(3);
    const c4 = cellVal(4);
    const c5 = cellVal(5);
    const c6 = cellVal(6);
    const c7 = cellVal(7);
    const c8 = cellVal(8);
    const c10 = cellVal(10);
    const c11 = cellVal(11);

    if (c3.includes('NVR NO 1') || (c1 === '1' && c3.includes('NVR'))) currentNvrCode = 'NVR-P5-01';
    else if (c3.includes('NVR NO 2') || (c1 === '2' && c3.includes('NVR'))) currentNvrCode = 'NVR-P5-02';
    else if (c3.includes('NVR NO 3') || (c1 === '3' && c3.includes('NVR'))) currentNvrCode = 'NVR-P5-03';
    else if (c3.includes('NVR NO 4') || (c1 === '4' && c3.includes('NVR'))) currentNvrCode = 'NVR-P5-04';

    if (!c4.toUpperCase().includes('PPAP') && !c4.toUpperCase().includes('CAM') && !c7.includes('192.168')) continue;

    const channelNo = parseInt(c1, 10) || null;
    const cameraName = c2 || c3 || 'CCTV Camera';
    const cameraCode = c4 || `CAM-${String(r).padStart(4, '0')}`;
    const cameraType = c5 || 'SURVEILLANCE';
    const placement = c6 || 'IN SIDE';
    const ipAddress = c7.replace(/[^0-9.]/g, '') || null;
    const zone = c8 || c3 || 'PLANT 5';
    const password = c10 || 'Admin@123';
    const retention = c11 || '45 Days';

    const currentNvrId = nvrMap.get(currentNvrCode);
    const remarks = `Zone: ${zone} | Placement: ${placement} | Priority: ${cameraType} | Retention: ${retention} | Auth: ${password}`;

    const camData = {
      name: cameraName,
      locationId: plant.id,
      ipAddress,
      brand: currentNvrCode.includes('04') ? 'CP PLUS' : 'HIKVISION',
      model: 'HD IP Dome/Bullet Camera',
      nvrId: currentNvrId,
      channel: channelNo,
      status: 'ONLINE' as const,
      remarks,
    };

    try {
      const existingCam = await prisma.cCTVCamera.findFirst({
        where: { OR: [{ cameraCode }, ...(ipAddress ? [{ ipAddress }] : [])] },
      });

      let cam: any;
      if (existingCam) {
        cam = await prisma.cCTVCamera.update({ where: { id: existingCam.id }, data: camData });
      } else {
        cam = await prisma.cCTVCamera.create({ data: { cameraCode, ...camData } });
      }
      createdCameras.push(cam);
    } catch (err: any) {
      errors.push({ row: r, error: err.message });
    }
  }

  await createAuditLog({
    req,
    action: 'CREATE',
    module: 'cctv',
    recordId: 'CCTV_EXCEL_IMPORT',
    recordCode: `${createdCameras.length} CCTV cameras imported`,
  });

  sendCreated(res, { count: createdCameras.length, cameras: createdCameras, errors }, `CCTV Excel import completed: ${createdCameras.length} cameras processed successfully`);
});

export default router;
