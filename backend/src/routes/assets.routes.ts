import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/database';
import {
  sendSuccess, sendCreated, sendNotFound, sendBadRequest,
  buildPaginationMeta, getPaginationParams,
} from '../utils/response';
import { generateAssetCode } from '../utils/idGenerator';
import { createAuditLog } from '../utils/auditLog';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { z } from 'zod';
import QRCode from 'qrcode';
import multer from 'multer';
import ExcelJS from 'exceljs';
import 'express-async-errors';

const router = Router();
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function mapAssetType(category?: string, description?: string): string {
  const text = `${category || ''} ${description || ''}`.toUpperCase();
  if (text.includes('LAPTOP')) return 'LAPTOP';
  if (text.includes('DESKTOP')) return 'DESKTOP';
  if (text.includes('SERVER') || text.includes('ENCLOSURE') || text.includes('RACK')) return 'SERVER';
  if (text.includes('SWITCH')) return 'NETWORK_SWITCH';
  if (text.includes('ROUTER') || text.includes('MODEM')) return 'ROUTER';
  if (text.includes('FIREWALL')) return 'FIREWALL';
  if (text.includes('ACCESS POINT') || text.includes('WI-FI') || text.includes('WIFI')) return 'ACCESS_POINT';
  if (text.includes('CCTV') || text.includes('CAMERA')) return 'CCTV_CAMERA';
  if (text.includes('NVR')) return 'NVR';
  if (text.includes('UPS') || text.includes('STABILIZER')) return 'UPS';
  if (text.includes('PRINTER') || text.includes('SCANNER')) return 'PRINTER';
  if (text.includes('MONITOR')) return 'MONITOR';
  return 'OTHER';
}

const assetSchema = z.object({
  type: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.number().optional(),
  vendorId: z.string().optional(),
  warrantyStart: z.string().optional(),
  warrantyEnd: z.string().optional(),
  assignedUserId: z.string().optional(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
  ipAddress: z.string().optional(),
  macAddress: z.string().optional(),
  hostname: z.string().optional(),
  operatingSystem: z.string().optional(),
  status: z.string().default('ACTIVE'),
  condition: z.string().default('GOOD'),
  lastMaintenance: z.string().optional(),
  nextMaintenance: z.string().optional(),
  remarks: z.string().optional(),
});

router.get('/', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { status, type, departmentId, locationId, search } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (type) where.type = type;
  if (departmentId) where.departmentId = departmentId;
  if (locationId) where.locationId = locationId;
  if (search) where.OR = [
    { assetCode: { contains: search } },
    { brand: { contains: search } },
    { model: { contains: search } },
    { serialNumber: { contains: search } },
    { hostname: { contains: search } },
  ];

  const [data, total] = await Promise.all([
    prisma.asset.findMany({
      where, skip, take: limit,
      orderBy: { assetCode: 'asc' },
      include: {
        assignedUser: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
      },
    }),
    prisma.asset.count({ where }),
  ]);

  sendSuccess(res, data, 'Assets retrieved', 200, buildPaginationMeta(total, page, limit));
});

router.get('/expiring-warranty', async (_req, res) => {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const assets = await prisma.asset.findMany({
    where: {
      warrantyEnd: { gte: now, lte: ninetyDays },
      deletedAt: null,
    },
    include: { department: true, assignedUser: { select: { id: true, name: true } } },
    orderBy: { warrantyEnd: 'asc' },
  });

  const grouped = {
    expired: assets.filter((a) => a.warrantyEnd && a.warrantyEnd < now),
    in30Days: assets.filter((a) => a.warrantyEnd && a.warrantyEnd >= now && a.warrantyEnd <= thirtyDays),
    in31to90Days: assets.filter((a) => a.warrantyEnd && a.warrantyEnd > thirtyDays && a.warrantyEnd <= ninetyDays),
  };

  sendSuccess(res, grouped);
});

// Download Bulk Upload CSV Template
router.get('/template', async (_req, res) => {
  const headers = [
    'Type',
    'Brand',
    'Model',
    'SerialNumber',
    'PurchaseDate',
    'PurchaseCost',
    'Status',
    'Condition',
    'Hostname',
    'IpAddress',
    'MacAddress',
    'OperatingSystem',
    'Remarks',
  ].join(',');

  const sample1 = [
    'LAPTOP',
    'Dell',
    'Latitude 5430',
    'DL5430SN001',
    '2025-01-15',
    '75000',
    'ACTIVE',
    'EXCELLENT',
    'DESKTOP-IT-001',
    '192.168.1.101',
    '00:1B:44:11:3A:B7',
    'Windows 11 Pro',
    'Assigned to IT Support',
  ].join(',');

  const sample2 = [
    'NETWORK_SWITCH',
    'Cisco',
    'Catalyst 2960',
    'CS2960SN002',
    '2024-11-20',
    '45000',
    'ACTIVE',
    'GOOD',
    'SWITCH-CORE-01',
    '192.168.1.2',
    '00:1B:44:22:4B:C8',
    'Cisco IOS',
    'Server Room Rack 1',
  ].join(',');

  const csvContent = `${headers}\n${sample1}\n${sample2}\n`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=asset_bulk_upload_template.csv');
  res.status(200).send(csvContent);
});

// Bulk Import Assets
router.post('/bulk', async (req: AuthenticatedRequest, res) => {
  const { assets } = req.body;
  if (!Array.isArray(assets) || assets.length === 0) {
    sendBadRequest(res, 'Invalid payload: Array of assets required');
    return;
  }

  const createdAssets: any[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < assets.length; i++) {
    const item = assets[i];
    try {
      const typeStr = (item.type || 'LAPTOP').toUpperCase().replace(/\s+/g, '_');
      const code = await generateAssetCode();

      const newAsset = await prisma.asset.create({
        data: {
          assetCode: code,
          type: typeStr as never,
          brand: item.brand || 'Generic',
          model: item.model || 'Model 1',
          serialNumber: item.serialNumber || null,
          purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
          purchaseCost: item.purchaseCost ? Number(item.purchaseCost) : 0,
          status: (item.status || 'ACTIVE').toUpperCase() as never,
          condition: (item.condition || 'GOOD').toUpperCase() as never,
          hostname: item.hostname || null,
          ipAddress: item.ipAddress || null,
          macAddress: item.macAddress || null,
          operatingSystem: item.operatingSystem || null,
          remarks: item.remarks || 'Bulk imported asset',
        },
      });

      // Generate QR Code for asset
      const qrData = `${process.env.FRONTEND_URL}/assets/${newAsset.id}`;
      const qrCode = await QRCode.toDataURL(qrData, { width: 300 });
      await prisma.asset.update({ where: { id: newAsset.id }, data: { qrCode } });

      // Asset history entry
      await prisma.assetHistory.create({
        data: {
          assetId: newAsset.id,
          action: 'CREATED',
          description: `Bulk imported asset ${code}`,
          performedBy: req.user?.name || 'System Bulk Upload',
        },
      });

      createdAssets.push({ ...newAsset, qrCode });
    } catch (err: any) {
      errors.push({ row: i + 1, error: err.message || 'Failed to import row' });
    }
  }

  await createAuditLog({
    req,
    action: 'CREATE',
    module: 'assets',
    recordId: 'BULK_IMPORT',
    recordCode: `${createdAssets.length} assets imported`,
  });

  sendCreated(
    res,
    {
      count: createdAssets.length,
      importedAssets: createdAssets,
      errors,
    },
    `Bulk import completed: ${createdAssets.length} assets created successfully`,
  );
});

// Bulk Delete Assets
router.post('/bulk-delete', async (req: AuthenticatedRequest, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    sendBadRequest(res, 'Array of asset IDs required');
    return;
  }
  await prisma.asset.updateMany({
    where: { id: { in: ids } },
    data: { deletedAt: new Date() },
  });
  await createAuditLog({ req, action: 'DELETE', module: 'assets', recordId: 'BULK_DELETE', recordCode: `${ids.length} assets deleted` });
  sendSuccess(res, null, `${ids.length} assets deleted successfully`);
});

// Flexible date parser for Excel dates
function parseFlexibleDate(dateStr?: string | null): Date | null {
  if (!dateStr || String(dateStr).trim() === '' || String(dateStr).trim() === 'NILL' || String(dateStr).trim() === '#N/A') {
    return null;
  }
  const str = String(dateStr).trim();
  if (/^\d{4}$/.test(str)) {
    return new Date(`${str}-01-01T00:00:00.000Z`);
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d;
  }
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
  };
  const parts = str.split(/[\s,/-]+/);
  if (parts.length >= 3) {
    let m = -1, day = -1, year = -1;
    for (const p of parts) {
      const lower = p.toLowerCase();
      if (monthMap[lower] !== undefined) {
        m = monthMap[lower];
      } else if (/^\d{1,2}$/.test(p) && day === -1) {
        day = parseInt(p, 10);
      } else if (/^\d{4}$/.test(p)) {
        year = parseInt(p, 10);
      }
    }
    if (m !== -1 && year !== -1) {
      if (day === -1) day = 1;
      return new Date(Date.UTC(year, m, day));
    }
  }
  return null;
}

// Bulk Upload via Excel / CSV file
router.post('/upload-file', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    sendBadRequest(res, 'Excel or CSV file is required');
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

  // Auto-detect header row
  let headerRowIndex = 1;
  let headers: string[] = [];

  for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const cellTexts: string[] = [];
    row.eachCell((cell, colNumber) => {
      cellTexts[colNumber - 1] = cell.text ? cell.text.trim().toLowerCase() : '';
    });
    if (cellTexts.some(t => t && (t.includes('asset') || t.includes('brand') || t.includes('model') || t.includes('serial') || t.includes('plant') || t.includes('s.no') || t.includes('category') || t.includes('description') || t.includes('type') || t.includes('qty')))) {
      headerRowIndex = r;
      headers = cellTexts;
      break;
    }
  }

  // Pre-fetch locations, departments, and users for fast matching
  const existingLocations = await prisma.location.findMany();
  const existingDepartments = await prisma.department.findMany();
  const existingUsers = await prisma.user.findMany();

  const locationMap = new Map<string, string>();
  existingLocations.forEach(l => {
    locationMap.set(l.name.toUpperCase(), l.id);
    locationMap.set(l.code.toUpperCase(), l.id);
  });

  const deptMap = new Map<string, string>();
  existingDepartments.forEach(d => {
    deptMap.set(d.name.toUpperCase(), d.id);
    deptMap.set(d.code.toUpperCase(), d.id);
  });

  const userMap = new Map<string, string>();
  existingUsers.forEach(u => {
    userMap.set(u.name.toUpperCase(), u.id);
  });

  const createdAssets: any[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let r = headerRowIndex + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (!row.hasValues) continue;

    const rowObj: Record<string, string> = {};
    row.eachCell((cell, colNumber) => {
      const headerName = headers[colNumber - 1] || `col_${colNumber}`;
      rowObj[headerName] = cell.text ? cell.text.trim() : '';
    });

    const getVal = (...keys: string[]) => {
      for (const k of keys) {
        for (const [hk, hv] of Object.entries(rowObj)) {
          if (hk.includes(k) && hv) return hv;
        }
      }
      return '';
    };

    const plantName = getVal('plant name', 'plant', 'location', 'site');
    const excelAssetCode = getVal('ppap asset id', 'asset id', 'asset code', 'code', 'asset_code');
    const rawCategory = getVal('asset type', 'category', 'type', 'segment');
    const rawBrand = getVal('asst brand', 'brand', 'make', 'manufacturer');
    const rawDescription = getVal('asset model no', 'model', 'description', 'item', 'material', 'specification');
    const rawSerial = getVal('serial no', 'serial', 's/n', 'sl. no', 'sl no');
    const productNo = getVal('product no', 'product');
    const rawCost = getVal('rate', 'cost', 'price', 'amount', 'total without tax', 'unit rate');
    const rawQtyStr = getVal('qty', 'quantity');
    const statusRaw = getVal('active / transfer', 'status', 'active');
    const departmentName = getVal('department', 'dept');
    const hostname = getVal('host name', 'system name', 'hostname');
    const currentUser = getVal('current asset allocation', 'allocation', 'assigned to', 'user', 'custodian');
    const purchaseYear = getVal('purchase year', 'purchase date', 'year');
    const warrantyStart = getVal('system warranty start date', 'warranty start');
    const warrantyEnd = getVal('system warranty end date', 'warranty end');
    const coverageType = getVal('coverage type', 'warranty type');
    const configSpecs = getVal('configuration', 'specs');
    const osName = getVal('os name', 'os tag', 'operating system');
    const osLicense = getVal('windows os licence no', 'os licence');
    const msOffice = getVal('ms office');
    const msOfficeLic = getVal('ms office licence no');
    const sap = getVal('sap');
    const autocad = getVal('auto cad');
    const catia = getVal('catia');
    const partHistory1 = getVal('system part change history 1', 'history 1');
    const partHistory2 = getVal('system part change history 2', 'history 2');
    const avStatus = getVal('av status');
    const rawRemarks = getVal('remark', 'remarks', 'notes', 'comment');

    if (!excelAssetCode && !rawDescription && !rawBrand && !rawCategory && !rawSerial) continue;

    // Resolve location
    let locationId: string | null = null;
    if (plantName) {
      const pKey = plantName.toUpperCase();
      if (locationMap.has(pKey)) {
        locationId = locationMap.get(pKey)!;
      } else {
        const newLoc = await prisma.location.create({
          data: {
            name: plantName,
            code: `LOC-${plantName.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`,
          },
        });
        locationId = newLoc.id;
        locationMap.set(pKey, newLoc.id);
      }
    }

    // Resolve department
    let departmentId: string | null = null;
    if (departmentName) {
      const dKey = departmentName.toUpperCase();
      if (deptMap.has(dKey)) {
        departmentId = deptMap.get(dKey)!;
      } else {
        const newDept = await prisma.department.create({
          data: {
            name: departmentName,
            code: `DEPT-${departmentName.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`,
          },
        });
        departmentId = newDept.id;
        deptMap.set(dKey, newDept.id);
      }
    }

    // Resolve user
    let assignedUserId: string | null = null;
    if (currentUser) {
      const uKey = currentUser.toUpperCase();
      if (userMap.has(uKey)) {
        assignedUserId = userMap.get(uKey)!;
      }
    }

    const parsedQty = Math.max(1, parseInt(rawQtyStr) || 1);
    const parsedCost = parseFloat(rawCost.replace(/[^0-9.]/g, '')) || 0;
    const assetType = mapAssetType(rawCategory, rawDescription);

    // Build rich remarks string
    const remarkParts: string[] = [];
    if (currentUser && !assignedUserId) remarkParts.push(`Assigned User: ${currentUser}`);
    if (productNo) remarkParts.push(`Product No: ${productNo}`);
    if (configSpecs) remarkParts.push(`Config: ${configSpecs}`);
    if (osName) remarkParts.push(`OS: ${osName}${osLicense ? ` (Lic: ${osLicense})` : ''}`);
    if (msOffice) remarkParts.push(`Office: ${msOffice}${msOfficeLic ? ` (Lic: ${msOfficeLic})` : ''}`);
    if (sap && sap.toUpperCase() !== 'NO') remarkParts.push(`SAP: ${sap}`);
    if (autocad && autocad.toUpperCase() !== 'NO') remarkParts.push(`AutoCAD: ${autocad}`);
    if (catia && catia.toUpperCase() !== 'NO') remarkParts.push(`CATIA: ${catia}`);
    if (coverageType) remarkParts.push(`Coverage: ${coverageType}`);
    if (partHistory1) remarkParts.push(`History 1: ${partHistory1}`);
    if (partHistory2) remarkParts.push(`History 2: ${partHistory2}`);
    if (avStatus) remarkParts.push(`AV: ${avStatus}`);
    if (rawRemarks) remarkParts.push(`Remarks: ${rawRemarks}`);

    const finalRemarks = remarkParts.join(' | ') || `Imported from Excel (${req.file?.originalname})`;

    for (let q = 1; q <= parsedQty; q++) {
      try {
        const codeToUse = excelAssetCode ? (parsedQty > 1 ? `${excelAssetCode}-${q}` : excelAssetCode) : await generateAssetCode();
        const modelName = parsedQty > 1 ? `${rawDescription || 'Equipment'} (${q} of ${parsedQty})` : (rawDescription || 'Equipment');
        const serialToUse = rawSerial ? (parsedQty > 1 ? `${rawSerial}-${q}` : rawSerial) : null;

        const assetData = {
          type: assetType as never,
          brand: rawBrand || 'Generic',
          model: modelName,
          serialNumber: serialToUse,
          purchaseCost: parsedCost,
          purchaseDate: parseFlexibleDate(purchaseYear),
          warrantyStart: parseFlexibleDate(warrantyStart),
          warrantyEnd: parseFlexibleDate(warrantyEnd),
          hostname: hostname || null,
          operatingSystem: osName || null,
          status: (statusRaw.toUpperCase().includes('TRANSFER') ? 'ASSIGNED' : statusRaw.toUpperCase().includes('E-WASTE') ? 'RETIRED' : 'ACTIVE') as never,
          condition: 'GOOD' as never,
          locationId,
          departmentId,
          assignedUserId,
          remarks: finalRemarks,
        };

        const existing = await prisma.asset.findFirst({
          where: {
            OR: [
              { assetCode: codeToUse },
              ...(serialToUse ? [{ serialNumber: serialToUse }] : []),
            ],
            deletedAt: null,
          },
        });

        let targetAsset: any;
        if (existing) {
          targetAsset = await prisma.asset.update({
            where: { id: existing.id },
            data: assetData,
          });
        } else {
          targetAsset = await prisma.asset.create({
            data: {
              assetCode: codeToUse,
              ...assetData,
            },
          });
        }

        // Generate QR code
        const qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/assets/${targetAsset.id}`;
        const qrCode = await QRCode.toDataURL(qrData, { width: 300 });
        await prisma.asset.update({ where: { id: targetAsset.id }, data: { qrCode } });

        // History entry
        await prisma.assetHistory.create({
          data: {
            assetId: targetAsset.id,
            action: existing ? 'UPDATED' : 'CREATED',
            description: existing ? `Updated via Excel upload (${req.file?.originalname})` : `Imported from Excel (${req.file?.originalname})`,
            performedBy: req.user?.name || 'Excel Importer',
          },
        });

        createdAssets.push({ ...targetAsset, qrCode });
      } catch (err: any) {
        errors.push({ row: r, error: err.message || 'Row import failed' });
      }
    }
  }

  await createAuditLog({
    req,
    action: 'CREATE',
    module: 'assets',
    recordId: 'EXCEL_IMPORT',
    recordCode: `${createdAssets.length} assets processed from Excel`,
  });

  sendCreated(
    res,
    {
      count: createdAssets.length,
      importedAssets: createdAssets,
      errors,
    },
    `Excel import completed: ${createdAssets.length} assets processed successfully`,
  );
});

router.get('/:id', async (req, res) => {
  const asset = await prisma.asset.findFirst({
    where: { OR: [{ id: req.params.id }, { assetCode: req.params.id }], deletedAt: null },
    include: {
      assignedUser: { select: { id: true, name: true } },
      department: true,
      location: true,
      vendor: true,
      history: { orderBy: { performedAt: 'desc' }, take: 20 },
      tickets: { where: { deletedAt: null }, orderBy: { date: 'desc' }, take: 10 },
      maintenance: { orderBy: { scheduledDate: 'desc' }, take: 10 },
      warranty: true,
    },
  });
  if (!asset) { sendNotFound(res); return; }
  sendSuccess(res, asset);
});

router.get('/:id/qr', async (req, res) => {
  const asset = await prisma.asset.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!asset) { sendNotFound(res); return; }

  const qrData = `${process.env.FRONTEND_URL}/assets/${asset.id}`;
  const qrCode = await QRCode.toDataURL(qrData, { width: 300 });
  sendSuccess(res, { qrCode, url: qrData, assetCode: asset.assetCode });
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  const result = assetSchema.safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const code = await generateAssetCode();
  const asset = await prisma.asset.create({
    data: {
      ...result.data,
      assetCode: code,
      type: result.data.type as never,
      status: result.data.status as never,
      condition: result.data.condition as never,
      purchaseDate: result.data.purchaseDate ? new Date(result.data.purchaseDate) : null,
      warrantyStart: result.data.warrantyStart ? new Date(result.data.warrantyStart) : null,
      warrantyEnd: result.data.warrantyEnd ? new Date(result.data.warrantyEnd) : null,
      lastMaintenance: result.data.lastMaintenance ? new Date(result.data.lastMaintenance) : null,
      nextMaintenance: result.data.nextMaintenance ? new Date(result.data.nextMaintenance) : null,
    },
  });

  // Generate QR code
  const qrData = `${process.env.FRONTEND_URL}/assets/${asset.id}`;
  const qrCode = await QRCode.toDataURL(qrData, { width: 300 });
  await prisma.asset.update({ where: { id: asset.id }, data: { qrCode } });

  // Asset history
  await prisma.assetHistory.create({
    data: {
      assetId: asset.id,
      action: 'CREATED',
      description: `Asset ${code} created`,
      performedBy: req.user?.name,
    },
  });

  await createAuditLog({ req, action: 'CREATE', module: 'assets', recordId: asset.id, recordCode: code });
  sendCreated(res, { ...asset, qrCode }, 'Asset created');
});

router.put('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.asset.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) { sendNotFound(res); return; }

  const result = assetSchema.partial().safeParse(req.body);
  if (!result.success) { sendBadRequest(res, 'Validation failed', result.error.format()); return; }

  const asset = await prisma.asset.update({
    where: { id: req.params.id },
    data: {
      ...result.data,
      type: result.data.type as never,
      status: result.data.status as never,
      condition: result.data.condition as never,
      purchaseDate: result.data.purchaseDate ? new Date(result.data.purchaseDate) : undefined,
      warrantyStart: result.data.warrantyStart ? new Date(result.data.warrantyStart) : undefined,
      warrantyEnd: result.data.warrantyEnd ? new Date(result.data.warrantyEnd) : undefined,
      lastMaintenance: result.data.lastMaintenance ? new Date(result.data.lastMaintenance) : undefined,
      nextMaintenance: result.data.nextMaintenance ? new Date(result.data.nextMaintenance) : undefined,
    },
  });

  // Track user assignment changes
  if (result.data.assignedUserId !== undefined && result.data.assignedUserId !== existing.assignedUserId) {
    await prisma.assetHistory.create({
      data: {
        assetId: asset.id,
        action: 'REASSIGNED',
        description: `Asset reassigned`,
        oldValue: existing.assignedUserId || 'Unassigned',
        newValue: result.data.assignedUserId || 'Unassigned',
        performedBy: req.user?.name,
      },
    });
  }

  if (result.data.status && result.data.status !== existing.status) {
    await prisma.assetHistory.create({
      data: {
        assetId: asset.id,
        action: 'STATUS_CHANGED',
        description: `Status changed from ${existing.status} to ${result.data.status}`,
        oldValue: existing.status,
        newValue: result.data.status,
        performedBy: req.user?.name,
      },
    });
  }

  await createAuditLog({ req, action: 'UPDATE', module: 'assets', recordId: asset.id, recordCode: asset.assetCode });
  sendSuccess(res, asset, 'Asset updated');
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.asset.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) { sendNotFound(res); return; }
  await prisma.asset.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await createAuditLog({ req, action: 'DELETE', module: 'assets', recordId: req.params.id, recordCode: existing.assetCode });
  sendSuccess(res, null, 'Asset deleted');
});

export default router;
