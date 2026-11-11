"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const idGenerator_1 = require("../utils/idGenerator");
const auditLog_1 = require("../utils/auditLog");
const multer_1 = __importDefault(require("multer"));
const exceljs_1 = __importDefault(require("exceljs"));
const zod_1 = require("zod");
const pingUtils_1 = require("../utils/pingUtils");
require("express-async-errors");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });
const cameraSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    locationId: zod_1.z.string().optional(),
    ipAddress: zod_1.z.string().optional(),
    brand: zod_1.z.string().optional(),
    model: zod_1.z.string().optional(),
    nvrId: zod_1.z.string().optional(),
    channel: zod_1.z.number().optional(),
    status: zod_1.z.enum(['ONLINE', 'OFFLINE', 'FAULT', 'UNDER_MAINTENANCE']).default('ONLINE'),
    remarks: zod_1.z.string().optional(),
});
const nvrSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    brand: zod_1.z.string().optional(),
    model: zod_1.z.string().optional(),
    ipAddress: zod_1.z.string().optional(),
    locationId: zod_1.z.string().optional(),
    totalChannels: zod_1.z.number().default(16),
    status: zod_1.z.string().default('ONLINE'),
    remarks: zod_1.z.string().optional(),
});
// CCTV Summary Statistics
router.get('/summary', async (_req, res) => {
    const [nvrs, totalCameras, onlineCameras, offlineCameras, faultCameras] = await Promise.all([
        database_1.prisma.nVRDevice.findMany({
            include: {
                _count: { select: { cameras: true } },
                location: { select: { id: true, name: true } },
            },
            orderBy: { name: 'asc' },
        }),
        database_1.prisma.cCTVCamera.count(),
        database_1.prisma.cCTVCamera.count({ where: { status: 'ONLINE' } }),
        database_1.prisma.cCTVCamera.count({ where: { status: 'OFFLINE' } }),
        database_1.prisma.cCTVCamera.count({ where: { status: 'FAULT' } }),
    ]);
    const totalChannelsCapacity = nvrs.reduce((sum, n) => sum + (n.totalChannels || 16), 0);
    const totalChannelsUsed = nvrs.reduce((sum, n) => sum + n._count.cameras, 0);
    (0, response_1.sendSuccess)(res, {
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
    const { page, limit, skip } = (0, response_1.getPaginationParams)(req.query);
    const { status, nvrId, locationId, search } = req.query;
    const where = {};
    if (status)
        where.status = status;
    if (nvrId)
        where.nvrId = nvrId;
    if (locationId)
        where.locationId = locationId;
    if (search) {
        where.OR = [
            { cameraCode: { contains: search } },
            { name: { contains: search } },
            { ipAddress: { contains: search } },
            { remarks: { contains: search } },
        ];
    }
    const [data, total] = await Promise.all([
        database_1.prisma.cCTVCamera.findMany({
            where, skip, take: limit,
            orderBy: [{ nvrId: 'asc' }, { channel: 'asc' }, { cameraCode: 'asc' }],
            include: {
                location: { select: { id: true, name: true } },
                nvr: { select: { id: true, nvrCode: true, name: true, ipAddress: true, brand: true } },
            },
        }),
        database_1.prisma.cCTVCamera.count({ where }),
    ]);
    (0, response_1.sendSuccess)(res, data, 'CCTV cameras retrieved', 200, (0, response_1.buildPaginationMeta)(total, page, limit));
});
// POST /api/v1/cctv/cameras
router.post('/cameras', async (req, res) => {
    const result = cameraSchema.safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const code = await (0, idGenerator_1.generateCCTVCode)();
    const camera = await database_1.prisma.cCTVCamera.create({
        data: {
            cameraCode: code,
            ...result.data,
            status: result.data.status,
        },
        include: { location: true, nvr: true },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'cctv_camera', recordId: camera.id, recordCode: code });
    (0, response_1.sendCreated)(res, camera, 'CCTV camera added');
});
// PUT /api/v1/cctv/cameras/:id
router.put('/cameras/:id', async (req, res) => {
    const existing = await database_1.prisma.cCTVCamera.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const result = cameraSchema.partial().safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const camera = await database_1.prisma.cCTVCamera.update({
        where: { id: req.params.id },
        data: {
            ...result.data,
            status: result.data.status,
        },
        include: { location: true, nvr: true },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'UPDATE', module: 'cctv_camera', recordId: camera.id, recordCode: camera.cameraCode });
    (0, response_1.sendSuccess)(res, camera, 'CCTV camera updated');
});
// DELETE /api/v1/cctv/cameras/:id
router.delete('/cameras/:id', async (req, res) => {
    const existing = await database_1.prisma.cCTVCamera.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    await database_1.prisma.cCTVCamera.delete({ where: { id: req.params.id } });
    await (0, auditLog_1.createAuditLog)({ req, action: 'DELETE', module: 'cctv_camera', recordId: req.params.id, recordCode: existing.cameraCode });
    (0, response_1.sendSuccess)(res, null, 'CCTV camera deleted');
});
// POST /api/v1/cctv/cameras/bulk-delete
router.post('/cameras/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        (0, response_1.sendBadRequest)(res, 'Array of camera IDs required');
        return;
    }
    await database_1.prisma.cCTVCamera.deleteMany({ where: { id: { in: ids } } });
    await (0, auditLog_1.createAuditLog)({ req, action: 'DELETE', module: 'cctv_camera', recordId: 'BULK_DELETE', recordCode: `${ids.length} cameras deleted` });
    (0, response_1.sendSuccess)(res, null, `${ids.length} CCTV cameras deleted successfully`);
});
// POST /api/v1/cctv/cameras/:id/ping
router.post('/cameras/:id/ping', async (req, res) => {
    const camera = await database_1.prisma.cCTVCamera.findUnique({ where: { id: req.params.id } });
    if (!camera) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const pingResult = await (0, pingUtils_1.pingDevice)(camera.ipAddress);
    const updatedCamera = await database_1.prisma.cCTVCamera.update({
        where: { id: req.params.id },
        data: {
            status: pingResult.status,
            lastPingAt: pingResult.testedAt,
            latencyMs: pingResult.latencyMs,
        },
    });
    (0, response_1.sendSuccess)(res, {
        camera: updatedCamera,
        pingResult,
    }, `Camera ping test complete: ${pingResult.status} (${pingResult.latencyMs ? pingResult.latencyMs + 'ms' : 'no response'})`);
});
// POST /api/v1/cctv/nvrs/:id/ping
router.post('/nvrs/:id/ping', async (req, res) => {
    const nvr = await database_1.prisma.nVRDevice.findUnique({ where: { id: req.params.id } });
    if (!nvr) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const pingResult = await (0, pingUtils_1.pingDevice)(nvr.ipAddress);
    const updatedNVR = await database_1.prisma.nVRDevice.update({
        where: { id: req.params.id },
        data: {
            status: pingResult.status,
            lastPingAt: pingResult.testedAt,
            latencyMs: pingResult.latencyMs,
        },
    });
    (0, response_1.sendSuccess)(res, {
        nvr: updatedNVR,
        pingResult,
    }, `NVR ping test complete: ${pingResult.status} (${pingResult.latencyMs ? pingResult.latencyMs + 'ms' : 'no response'})`);
});
let isPingCancelled = false;
// POST /api/v1/cctv/ping-stop
router.post('/ping-stop', async (_req, res) => {
    isPingCancelled = true;
    (0, response_1.sendSuccess)(res, { cancelled: true }, 'Ping operation cancelled');
});
// POST /api/v1/cctv/ping-all
router.post('/ping-all', async (_req, res) => {
    isPingCancelled = false;
    const [cameras, nvrs] = await Promise.all([
        database_1.prisma.cCTVCamera.findMany({ select: { id: true, ipAddress: true } }),
        database_1.prisma.nVRDevice.findMany({ select: { id: true, ipAddress: true } }),
    ]);
    const startTime = Date.now();
    let onlineCount = 0;
    let offlineCount = 0;
    // Process cameras in parallel batches of 15
    const BATCH_SIZE = 15;
    for (let i = 0; i < cameras.length; i += BATCH_SIZE) {
        if (isPingCancelled)
            break;
        const batch = cameras.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (cam) => {
            if (isPingCancelled)
                return;
            const pingResult = await (0, pingUtils_1.pingDevice)(cam.ipAddress);
            if (pingResult.alive)
                onlineCount++;
            else
                offlineCount++;
            await database_1.prisma.cCTVCamera.update({
                where: { id: cam.id },
                data: {
                    status: pingResult.status,
                    lastPingAt: pingResult.testedAt,
                    latencyMs: pingResult.latencyMs,
                },
            });
        }));
    }
    // Ping NVRs
    for (const nvr of nvrs) {
        if (isPingCancelled)
            break;
        const pingResult = await (0, pingUtils_1.pingDevice)(nvr.ipAddress);
        await database_1.prisma.nVRDevice.update({
            where: { id: nvr.id },
            data: {
                status: pingResult.status,
                lastPingAt: pingResult.testedAt,
                latencyMs: pingResult.latencyMs,
            },
        });
    }
    const durationMs = Date.now() - startTime;
    (0, response_1.sendSuccess)(res, {
        totalTested: cameras.length + nvrs.length,
        onlineCount,
        offlineCount,
        durationMs,
        cancelled: isPingCancelled,
        testedAt: new Date(),
    }, isPingCancelled
        ? `Ping test stopped after ${Math.round(durationMs / 1000)}s`
        : `Bulk IP ping test completed in ${Math.round(durationMs / 1000)}s`);
});
// NVR Routes
router.get('/nvrs', async (_req, res) => {
    const nvrs = await database_1.prisma.nVRDevice.findMany({
        include: {
            location: { select: { id: true, name: true } },
            _count: { select: { cameras: true } },
        },
        orderBy: { nvrCode: 'asc' },
    });
    (0, response_1.sendSuccess)(res, nvrs);
});
router.post('/nvrs', async (req, res) => {
    const result = nvrSchema.safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const code = await (0, idGenerator_1.generateNVRCode)();
    const nvr = await database_1.prisma.nVRDevice.create({
        data: {
            nvrCode: code,
            ...result.data,
        },
    });
    await (0, auditLog_1.createAuditLog)({ req, action: 'CREATE', module: 'nvr_device', recordId: nvr.id, recordCode: code });
    (0, response_1.sendCreated)(res, nvr, 'NVR device added');
});
router.put('/nvrs/:id', async (req, res) => {
    const existing = await database_1.prisma.nVRDevice.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    const result = nvrSchema.partial().safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const nvr = await database_1.prisma.nVRDevice.update({
        where: { id: req.params.id },
        data: result.data,
    });
    (0, response_1.sendSuccess)(res, nvr, 'NVR device updated');
});
router.delete('/nvrs/:id', async (req, res) => {
    const existing = await database_1.prisma.nVRDevice.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        (0, response_1.sendNotFound)(res);
        return;
    }
    // Unlink cameras
    await database_1.prisma.cCTVCamera.updateMany({ where: { nvrId: req.params.id }, data: { nvrId: null } });
    await database_1.prisma.nVRDevice.delete({ where: { id: req.params.id } });
    await (0, auditLog_1.createAuditLog)({ req, action: 'DELETE', module: 'nvr_device', recordId: req.params.id, recordCode: existing.nvrCode });
    (0, response_1.sendSuccess)(res, null, 'NVR device deleted');
});
// Bulk Upload CCTV Excel File
router.post('/upload-file', upload.single('file'), async (req, res) => {
    if (!req.file) {
        (0, response_1.sendBadRequest)(res, 'CCTV Excel or CSV file is required');
        return;
    }
    const workbook = new exceljs_1.default.Workbook();
    const buffer = req.file.buffer;
    if (req.file.originalname.toLowerCase().endsWith('.csv')) {
        const { Readable } = await Promise.resolve().then(() => __importStar(require('stream')));
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);
        await workbook.csv.read(stream);
    }
    else {
        await workbook.xlsx.load(buffer);
    }
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
        (0, response_1.sendBadRequest)(res, 'Excel file must contain at least 1 data row');
        return;
    }
    let plant = await database_1.prisma.location.findFirst({ where: { name: { contains: 'PLANT 5' } } });
    if (!plant) {
        plant = await database_1.prisma.location.create({ data: { name: 'PLANT 5', code: 'LOC-PLANT5' } });
    }
    // Define 4 default NVRs if needed
    const nvrConfigs = [
        { nvrCode: 'NVR-P5-01', name: 'NVR NO 1 (192.168.65.21)', brand: 'HIKVISION', model: 'DS-7732NXI-K4', ipAddress: '192.168.65.21', totalChannels: 32, locationId: plant.id },
        { nvrCode: 'NVR-P5-02', name: 'NVR NO 2 (192.168.65.22)', brand: 'HIKVISION', model: 'DS-7732NXI-K4', ipAddress: '192.168.65.22', totalChannels: 32, locationId: plant.id },
        { nvrCode: 'NVR-P5-03', name: 'NVR NO 3 (192.168.65.23)', brand: 'HIKVISION', model: 'DS-7616NXI-K2', ipAddress: '192.168.65.23', totalChannels: 16, locationId: plant.id },
        { nvrCode: 'NVR-P5-04', name: 'NVR NO 4 (192.168.65.24)', brand: 'CP PLUS', model: 'CP PLUS 16CH', ipAddress: '192.168.65.24', totalChannels: 16, locationId: plant.id },
    ];
    const nvrMap = new Map();
    for (const nvrData of nvrConfigs) {
        const nvr = await database_1.prisma.nVRDevice.upsert({
            where: { nvrCode: nvrData.nvrCode },
            update: nvrData,
            create: nvrData,
        });
        nvrMap.set(nvrData.nvrCode, nvr.id);
    }
    let currentNvrCode = 'NVR-P5-01';
    const createdCameras = [];
    const errors = [];
    for (let r = 1; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        if (!row.hasValues)
            continue;
        const cellVal = (col) => {
            try {
                const c = row.getCell(col);
                let val = c.value;
                if (val && typeof val === 'object') {
                    if (val.result !== undefined)
                        val = val.result;
                    else if (val.richText)
                        val = val.richText.map((t) => t.text).join('');
                    else
                        val = String(val);
                }
                return val ? String(val).trim() : '';
            }
            catch (e) {
                return '';
            }
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
        if (c3.includes('NVR NO 1') || (c1 === '1' && c3.includes('NVR')))
            currentNvrCode = 'NVR-P5-01';
        else if (c3.includes('NVR NO 2') || (c1 === '2' && c3.includes('NVR')))
            currentNvrCode = 'NVR-P5-02';
        else if (c3.includes('NVR NO 3') || (c1 === '3' && c3.includes('NVR')))
            currentNvrCode = 'NVR-P5-03';
        else if (c3.includes('NVR NO 4') || (c1 === '4' && c3.includes('NVR')))
            currentNvrCode = 'NVR-P5-04';
        if (!c4.toUpperCase().includes('PPAP') && !c4.toUpperCase().includes('CAM') && !c7.includes('192.168'))
            continue;
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
            status: 'ONLINE',
            remarks,
        };
        try {
            const existingCam = await database_1.prisma.cCTVCamera.findFirst({
                where: { OR: [{ cameraCode }, ...(ipAddress ? [{ ipAddress }] : [])] },
            });
            let cam;
            if (existingCam) {
                cam = await database_1.prisma.cCTVCamera.update({ where: { id: existingCam.id }, data: camData });
            }
            else {
                cam = await database_1.prisma.cCTVCamera.create({ data: { cameraCode, ...camData } });
            }
            createdCameras.push(cam);
        }
        catch (err) {
            errors.push({ row: r, error: err.message });
        }
    }
    await (0, auditLog_1.createAuditLog)({
        req,
        action: 'CREATE',
        module: 'cctv',
        recordId: 'CCTV_EXCEL_IMPORT',
        recordCode: `${createdCameras.length} CCTV cameras imported`,
    });
    (0, response_1.sendCreated)(res, { count: createdCameras.length, cameras: createdCameras, errors }, `CCTV Excel import completed: ${createdCameras.length} cameras processed successfully`);
});
exports.default = router;
//# sourceMappingURL=cctv.routes.js.map