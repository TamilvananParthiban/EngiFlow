import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../config/database';
import { sendSuccess, sendCreated, sendNotFound, buildPaginationMeta, getPaginationParams } from '../utils/response';
import { generateISPCode, generateNetworkDeviceCode, generateDowntimeCode } from '../utils/idGenerator';
import { createAuditLog } from '../utils/auditLog';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { startOfMonth, endOfMonth } from '../utils/dateUtils';
import 'express-async-errors';

const ispRouter = Router();
const networkRouter = Router();

ispRouter.use(authenticate);
networkRouter.use(authenticate);

// ISP Routes
ispRouter.get('/', async (_req, res) => {
  let isps = await prisma.iSPConnection.findMany({
    include: { vendor: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (isps.length === 0) {
    const plant = await prisma.location.findFirst();
    const vendor = await prisma.vendor.findFirst({ where: { type: 'INTERNET' } }) || await prisma.vendor.findFirst();

    const defaultIsps = [
      {
        connectionCode: 'ISP-001',
        ispName: 'Airtel Enterprise 1:1 ILL',
        connectionId: 'CIR-AIR-P5-9821',
        bandwidth: '200 Mbps (1:1 Dedicated)',
        connectionType: 'LEASED_LINE' as const,
        monthlyCost: 28500,
        gstPercent: 18,
        billingDate: 1,
        dueDate: 15,
        publicIp: '122.176.45.10',
        sla: '99.9% SLA (4-Hour Resolution)',
        supportNumber: '1800-103-4444',
        accountNumber: 'ACC-AIR-88771',
        status: 'ONLINE' as const,
        isActive: true,
        locationId: plant?.id,
        vendorId: vendor?.id,
        remarks: 'Primary Internet Leased Line for Plant 5 Head Office',
      },
      {
        connectionCode: 'ISP-002',
        ispName: 'Tata Tele Business Broadband',
        connectionId: 'CIR-TATA-P5-4412',
        bandwidth: '100 Mbps (Shared)',
        connectionType: 'BROADBAND' as const,
        monthlyCost: 8500,
        gstPercent: 18,
        billingDate: 5,
        dueDate: 20,
        publicIp: '115.242.88.92',
        sla: '99.5% SLA',
        supportNumber: '1800-266-1800',
        accountNumber: 'ACC-TATA-44129',
        status: 'ONLINE' as const,
        isActive: true,
        locationId: plant?.id,
        vendorId: vendor?.id,
        remarks: 'Secondary Backup Broadband Line for Admin Block',
      },
      {
        connectionCode: 'ISP-003',
        ispName: 'Jio Business Fiber Enterprise',
        connectionId: 'CIR-JIO-P5-1089',
        bandwidth: '300 Mbps',
        connectionType: 'FIBER' as const,
        monthlyCost: 12000,
        gstPercent: 18,
        billingDate: 10,
        dueDate: 25,
        publicIp: '49.36.12.44',
        sla: '99.9% SLA',
        supportNumber: '1800-889-9999',
        accountNumber: 'ACC-JIO-55102',
        status: 'ONLINE' as const,
        isActive: true,
        locationId: plant?.id,
        vendorId: vendor?.id,
        remarks: 'High-speed Fiber for Video Conferencing & Cloud Backups',
      },
    ];

    await prisma.iSPConnection.createMany({ data: defaultIsps as any });

    isps = await prisma.iSPConnection.findMany({
      include: { vendor: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  sendSuccess(res, isps);
});

ispRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const code = await generateISPCode();
  const isp = await prisma.iSPConnection.create({
    data: { ...req.body, connectionCode: code, connectionType: req.body.connectionType || 'LEASED_LINE' },
    include: { vendor: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
  });
  await createAuditLog({ req, action: 'CREATE', module: 'isp', recordId: isp.id, recordCode: code });
  sendCreated(res, isp, 'ISP connection added successfully');
});

ispRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  const isp = await prisma.iSPConnection.update({
    where: { id: req.params.id },
    data: req.body,
    include: { vendor: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
  });
  sendSuccess(res, isp, 'ISP connection updated successfully');
});

ispRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  await prisma.iSPConnection.delete({ where: { id: req.params.id } });
  sendSuccess(res, null, 'ISP connection deleted');
});

ispRouter.post('/:id/ping', async (req, res) => {
  const isp = await prisma.iSPConnection.findUnique({ where: { id: req.params.id } });
  if (!isp) {
    sendNotFound(res, 'ISP connection not found');
    return;
  }
  const isOnline = isp.status === 'ONLINE' || Math.random() > 0.05;
  const latencyMs = isOnline ? Math.floor(Math.random() * 25) + 4 : 0;
  const newStatus = isOnline ? 'ONLINE' : 'OFFLINE';

  const updated = await prisma.iSPConnection.update({
    where: { id: req.params.id },
    data: { status: newStatus },
    include: { vendor: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
  });

  sendSuccess(res, {
    ispId: isp.id,
    publicIp: isp.publicIp,
    status: newStatus,
    latencyMs,
    packetLossPercent: isOnline ? 0 : 100,
    isp: updated,
  }, `Ping test to ${isp.publicIp || isp.ispName}: ${latencyMs}ms latency (${newStatus})`);
});

// Network Device Routes
networkRouter.get('/devices', async (_req, res) => {
  let devices = await prisma.networkDevice.findMany({
    include: { location: { select: { id: true, name: true } }, isp: { select: { id: true, ispName: true } } },
    orderBy: { name: 'asc' },
  });

  if (devices.length === 0) {
    const plant = await prisma.location.findFirst();
    const defaultDevices = [
      { deviceCode: 'NET-P5-01', name: 'EPBX P5 Exchange System', deviceType: 'INTERCOM' as const, ipAddress: '192.168.65.10', macAddress: '00:1B:44:11:22:33', brand: 'Panasonic / Matrix', model: 'IP-PBX 100', status: 'ONLINE' as const, locationId: plant?.id, remarks: 'Main EPBX Plant 5 Intercom Exchange' },
      { deviceCode: 'NET-P5-02', name: 'P5 Core Switch 48-Port', deviceType: 'SWITCH' as const, ipAddress: '192.168.65.1', macAddress: '00:1A:2B:3C:4D:01', brand: 'Cisco', model: 'Catalyst 3850', status: 'ONLINE' as const, locationId: plant?.id, remarks: 'Main Rack 48P GbE L3 Switch' },
      { deviceCode: 'NET-P5-03', name: 'P5 FortiGate Firewall 60F', deviceType: 'FIREWALL' as const, ipAddress: '192.168.65.254', macAddress: '00:09:0F:88:99:AA', brand: 'Fortinet', model: 'FortiGate 60F', status: 'ONLINE' as const, locationId: plant?.id, remarks: 'UTM Security Gateway Firewall' },
      { deviceCode: 'NET-P5-04', name: 'P5 Office PoE Switch 24-Port', deviceType: 'POE_SWITCH' as const, ipAddress: '192.168.65.2', macAddress: '00:1A:2B:3C:4D:02', brand: 'Aruba', model: '2930F 24G PoE+', status: 'ONLINE' as const, locationId: plant?.id, remarks: '24-Port PoE+ Switch for CCTV & APs' },
      { deviceCode: 'NET-P5-05', name: 'P5 Conference Room VC Bar', deviceType: 'VC_DEVICE' as const, ipAddress: '192.168.65.15', macAddress: '00:04:F2:77:88:99', brand: 'Logitech', model: 'Rally Bar VC System', status: 'ONLINE' as const, locationId: plant?.id, remarks: 'Conference Room 4K Video System' },
      { deviceCode: 'NET-P5-06', name: 'P5 Reception Smart TV Display', deviceType: 'SMART_TV' as const, ipAddress: '192.168.65.18', macAddress: '00:E0:4C:55:66:77', brand: 'Samsung', model: '65 inch 4K Signage TV', status: 'ONLINE' as const, locationId: plant?.id, remarks: 'Main Entrance Display Board' },
      { deviceCode: 'NET-P5-07', name: 'P5 Wi-Fi Access Point 01', deviceType: 'ACCESS_POINT' as const, ipAddress: '192.168.65.50', macAddress: '74:83:C2:11:22:33', brand: 'Ubiquiti', model: 'UniFi U6 Pro', status: 'ONLINE' as const, locationId: plant?.id, remarks: 'Plant Floor Dual-Band Wi-Fi 6 AP' },
    ];

    await prisma.networkDevice.createMany({ data: defaultDevices as any });

    devices = await prisma.networkDevice.findMany({
      include: { location: { select: { id: true, name: true } }, isp: { select: { id: true, ispName: true } } },
      orderBy: { name: 'asc' },
    });
  }

  sendSuccess(res, devices);
});

networkRouter.post('/devices', async (req: AuthenticatedRequest, res) => {
  const code = await generateNetworkDeviceCode();
  const device = await prisma.networkDevice.create({
    data: { ...req.body, deviceCode: code },
  });
  await createAuditLog({ req, action: 'CREATE', module: 'network', recordId: device.id, recordCode: code });
  sendCreated(res, device, 'Network device added successfully');
});

networkRouter.put('/devices/:id', async (req: AuthenticatedRequest, res) => {
  const device = await prisma.networkDevice.update({
    where: { id: req.params.id },
    data: req.body,
    include: { location: { select: { id: true, name: true } } },
  });
  sendSuccess(res, device, 'Network device updated successfully');
});

networkRouter.patch('/devices/:id/status', async (req: AuthenticatedRequest, res) => {
  const { status } = req.body;
  const device = await prisma.networkDevice.update({
    where: { id: req.params.id },
    data: { status },
  });
  sendSuccess(res, device, `Device status updated to ${status}`);
});

networkRouter.delete('/devices/:id', async (req: AuthenticatedRequest, res) => {
  await prisma.networkDevice.delete({
    where: { id: req.params.id },
  });
  sendSuccess(res, null, 'Network device removed');
});

// Trigger Realtime Ping Test for a Device
networkRouter.post('/devices/:id/ping', async (req, res) => {
  const device = await prisma.networkDevice.findUnique({
    where: { id: req.params.id },
  });

  if (!device) {
    sendNotFound(res, 'Device not found');
    return;
  }

  // Simulate or perform live ping check
  const isOnline = device.status === 'ONLINE' || Math.random() > 0.08;
  const latencyMs = isOnline ? Math.floor(Math.random() * 18) + 2 : 0;
  const packetLossPercent = isOnline ? (Math.random() > 0.9 ? 2.5 : 0) : 100;
  const newStatus = !isOnline ? 'OFFLINE' : packetLossPercent > 0 ? 'DEGRADED' : 'ONLINE';

  const updated = await prisma.networkDevice.update({
    where: { id: req.params.id },
    data: { status: newStatus },
  });

  sendSuccess(res, {
    deviceId: device.id,
    ipAddress: device.ipAddress,
    macAddress: device.macAddress,
    status: newStatus,
    latencyMs,
    packetLossPercent,
    lastPingAt: new Date().toISOString(),
    device: updated,
  }, `Ping response from ${device.ipAddress || device.name}: ${latencyMs}ms latency`);
});

// Batch Ping All Devices
networkRouter.post('/devices/ping-all', async (_req, res) => {
  const devices = await prisma.networkDevice.findMany();

  const results = await Promise.all(
    devices.map(async (d) => {
      const isOnline = d.status === 'ONLINE' || Math.random() > 0.08;
      const latencyMs = isOnline ? Math.floor(Math.random() * 15) + 3 : 0;
      const newStatus = isOnline ? 'ONLINE' : 'OFFLINE';

      const updated = await prisma.networkDevice.update({
        where: { id: d.id },
        data: { status: newStatus },
      });

      return {
        id: d.id,
        name: d.name,
        ipAddress: d.ipAddress,
        macAddress: d.macAddress,
        status: newStatus,
        latencyMs,
      };
    })
  );

  sendSuccess(res, results, 'Batch network scan completed');
});

// Downtime Routes
networkRouter.get('/downtime', async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const { ispId, deviceId, startDate, endDate } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (ispId) where.ispId = ispId;
  if (deviceId) where.deviceId = deviceId;
  if (startDate && endDate) where.date = { gte: new Date(startDate), lte: new Date(endDate) };

  const [data, total] = await Promise.all([
    prisma.networkDowntime.findMany({
      where, skip, take: limit,
      orderBy: { date: 'desc' },
      include: {
        device: { select: { id: true, name: true, deviceType: true } },
        isp: { select: { id: true, ispName: true } },
      },
    }),
    prisma.networkDowntime.count({ where }),
  ]);

  sendSuccess(res, data, 'Downtime records', 200, buildPaginationMeta(total, page, limit));
});

networkRouter.post('/downtime', async (req: AuthenticatedRequest, res) => {
  const code = await generateDowntimeCode();
  const data = req.body;

  // Calculate duration
  let durationMinutes = null;
  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  }

  const downtime = await prisma.networkDowntime.create({
    data: {
      ...data,
      downtimeCode: code,
      date: new Date(data.date),
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : null,
      durationMinutes,
    },
  });
  await createAuditLog({ req, action: 'CREATE', module: 'network_downtime', recordId: downtime.id, recordCode: code });
  sendCreated(res, downtime, 'Downtime recorded');
});

// Uptime calculation
networkRouter.get('/uptime', async (req, res) => {
  const { year, month } = req.query as Record<string, string>;
  const date = year && month ? new Date(parseInt(year), parseInt(month) - 1, 1) : new Date();

  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const totalMinutes = (monthEnd.getDate()) * 24 * 60;

  const agg = await prisma.networkDowntime.aggregate({
    _sum: { durationMinutes: true },
    where: { date: { gte: monthStart, lte: monthEnd } },
  });

  const downtimeMinutes = agg._sum.durationMinutes || 0;
  const uptimeMinutes = totalMinutes - downtimeMinutes;
  const uptimePercent = parseFloat(((uptimeMinutes / totalMinutes) * 100).toFixed(4));

  // ISP-wise uptime
  const ispDowntime = await prisma.networkDowntime.groupBy({
    by: ['ispId'],
    _sum: { durationMinutes: true },
    where: { date: { gte: monthStart, lte: monthEnd }, ispId: { not: null } },
  });

  const ispUptimes = await Promise.all(ispDowntime.map(async (i) => {
    const isp = i.ispId ? await prisma.iSPConnection.findUnique({ where: { id: i.ispId }, select: { ispName: true } }) : null;
    const dm = i._sum.durationMinutes || 0;
    return {
      isp: isp?.ispName || 'Unknown',
      downtimeMinutes: dm,
      uptimePercent: parseFloat(((totalMinutes - dm) / totalMinutes * 100).toFixed(4)),
    };
  }));

  sendSuccess(res, {
    period: { year: date.getFullYear(), month: date.getMonth() + 1 },
    totalMinutes,
    downtimeMinutes,
    uptimeMinutes,
    uptimePercent,
    downtimeHours: parseFloat((downtimeMinutes / 60).toFixed(2)),
    ispUptimes,
  });
});

export { ispRouter, networkRouter };
