import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Departments ─────────────────────────────────────
  console.log('  Creating departments...');
  const depts = await Promise.all([
    prisma.department.upsert({ where: { code: 'IT' }, update: {}, create: { name: 'Information Technology', code: 'IT' } }),
    prisma.department.upsert({ where: { code: 'FIN' }, update: {}, create: { name: 'Finance & Accounts', code: 'FIN' } }),
    prisma.department.upsert({ where: { code: 'HR' }, update: {}, create: { name: 'Human Resources', code: 'HR' } }),
    prisma.department.upsert({ where: { code: 'OPS' }, update: {}, create: { name: 'Operations', code: 'OPS' } }),
    prisma.department.upsert({ where: { code: 'SALES' }, update: {}, create: { name: 'Sales & Marketing', code: 'SALES' } }),
    prisma.department.upsert({ where: { code: 'MGMT' }, update: {}, create: { name: 'Management', code: 'MGMT' } }),
    prisma.department.upsert({ where: { code: 'LEGAL' }, update: {}, create: { name: 'Legal & Compliance', code: 'LEGAL' } }),
    prisma.department.upsert({ where: { code: 'ADMIN' }, update: {}, create: { name: 'Administration', code: 'ADMIN' } }),
  ]);
  const [itDept, finDept, hrDept, opsDept] = depts;

  // ─── Locations ────────────────────────────────────────
  console.log('  Creating locations...');
  const locs = await Promise.all([
    prisma.location.upsert({ where: { code: 'HO' }, update: {}, create: { name: 'Head Office', code: 'HO', floor: '4th Floor', building: 'Main Building' } }),
    prisma.location.upsert({ where: { code: 'DC' }, update: {}, create: { name: 'Data Center', code: 'DC', floor: 'Ground Floor', building: 'Server Room' } }),
    prisma.location.upsert({ where: { code: 'BR1' }, update: {}, create: { name: 'Branch Office - North', code: 'BR1', building: 'North Campus' } }),
    prisma.location.upsert({ where: { code: 'BR2' }, update: {}, create: { name: 'Branch Office - South', code: 'BR2', building: 'South Campus' } }),
    prisma.location.upsert({ where: { code: 'WH' }, update: {}, create: { name: 'Warehouse', code: 'WH', building: 'Warehouse Complex' } }),
  ]);
  const [headOffice, dataCenter, branchNorth] = locs;

  // ─── Users ────────────────────────────────────────────
  console.log('  Creating users...');
  const pw = await bcrypt.hash('Admin@1234', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: { passwordHash: pw, status: 'ACTIVE' },
    create: {
      name: 'System Administrator',
      email: 'admin@company.com',
      passwordHash: pw,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      designation: 'Super Admin',
      departmentId: itDept.id,
      employeeId: 'EMP001',
    },
  });

  const itManager = await prisma.user.upsert({
    where: { email: 'it.manager@company.com' },
    update: { passwordHash: pw, status: 'ACTIVE' },
    create: {
      name: 'Rajesh Kumar',
      email: 'it.manager@company.com',
      passwordHash: pw,
      role: 'IT_MANAGER',
      status: 'ACTIVE',
      designation: 'IT Manager',
      departmentId: itDept.id,
      employeeId: 'EMP002',
    },
  });

  const sysAdmin = await prisma.user.upsert({
    where: { email: 'sysadmin@company.com' },
    update: { passwordHash: pw, status: 'ACTIVE' },
    create: {
      name: 'Priya Sharma',
      email: 'sysadmin@company.com',
      passwordHash: pw,
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
      designation: 'System Administrator',
      departmentId: itDept.id,
      employeeId: 'EMP003',
    },
  });

  const itEngineer = await prisma.user.upsert({
    where: { email: 'engineer@company.com' },
    update: { passwordHash: pw, status: 'ACTIVE' },
    create: {
      name: 'Arun Patel',
      email: 'engineer@company.com',
      passwordHash: pw,
      role: 'IT_ENGINEER',
      status: 'ACTIVE',
      designation: 'IT Engineer',
      departmentId: itDept.id,
      employeeId: 'EMP004',
    },
  });

  const itSupport = await prisma.user.upsert({
    where: { email: 'support@company.com' },
    update: { passwordHash: pw, status: 'ACTIVE' },
    create: {
      name: 'Meena Nair',
      email: 'support@company.com',
      passwordHash: pw,
      role: 'IT_SUPPORT',
      status: 'ACTIVE',
      designation: 'IT Support Specialist',
      departmentId: itDept.id,
      employeeId: 'EMP005',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@company.com' },
    update: { passwordHash: pw, status: 'ACTIVE' },
    create: {
      name: 'Suresh Menon',
      email: 'viewer@company.com',
      passwordHash: pw,
      role: 'VIEWER',
      status: 'ACTIVE',
      designation: 'Finance Manager',
      departmentId: finDept.id,
      employeeId: 'EMP006',
    },
  });


  // ─── Vendors ──────────────────────────────────────────
  console.log('  Creating vendors...');

  const vendors = await Promise.all([
    prisma.vendor.upsert({
      where: { vendorCode: 'VND-0001' },
      update: {},
      create: {
        vendorCode: 'VND-0001',
        name: 'TechRent Solutions Pvt Ltd',
        type: 'LAPTOP_RENTAL',
        contactPerson: 'Vikram Singh',
        phone: '+91-9876543210',
        email: 'sales@techrent.in',
        address: '45, Tech Park, Whitefield, Bangalore - 560066',
        gstNumber: '29AABCT1234A1Z5',
        services: 'Laptop and Desktop Rental, IT Asset Leasing',
        status: 'ACTIVE',
      },
    }),
    prisma.vendor.upsert({
      where: { vendorCode: 'VND-0002' },
      update: {},
      create: {
        vendorCode: 'VND-0002',
        name: 'Airtel Business Solutions',
        type: 'INTERNET',
        contactPerson: 'Kavya Reddy',
        phone: '+91-9800012345',
        email: 'corporate@airtel.in',
        address: 'Airtel House, Connaught Place, New Delhi - 110001',
        gstNumber: '07AAACA1234A1Z5',
        services: 'Leased Line Internet, Fiber Broadband, MPLS',
        sla: '99.5% uptime SLA, 4-hour resolution time',
        status: 'ACTIVE',
      },
    }),
    prisma.vendor.upsert({
      where: { vendorCode: 'VND-0003' },
      update: {},
      create: {
        vendorCode: 'VND-0003',
        name: 'SecurEye CCTV Systems',
        type: 'CCTV',
        contactPerson: 'Ramesh Babu',
        phone: '+91-9988776655',
        email: 'service@secureye.in',
        address: '12, Industrial Estate, Chennai - 600032',
        gstNumber: '33AABCS5678A1Z5',
        services: 'CCTV Installation, AMC, IP Camera Systems, NVR',
        status: 'ACTIVE',
      },
    }),
    prisma.vendor.upsert({
      where: { vendorCode: 'VND-0004' },
      update: {},
      create: {
        vendorCode: 'VND-0004',
        name: 'NetPro Infrastructure',
        type: 'NETWORK',
        contactPerson: 'Deepak Joshi',
        phone: '+91-8877665544',
        email: 'support@netpro.in',
        address: '78, IT Hub, Hyderabad - 500081',
        gstNumber: '36AABCN9012A1Z5',
        services: 'Network Infrastructure, Switches, Routers, Firewall',
        status: 'ACTIVE',
      },
    }),
    prisma.vendor.upsert({
      where: { vendorCode: 'VND-0005' },
      update: {},
      create: {
        vendorCode: 'VND-0005',
        name: 'PrintMaster Services',
        type: 'PRINTER',
        contactPerson: 'Anita Verma',
        phone: '+91-9912345678',
        email: 'service@printmaster.in',
        address: '23, Commercial Complex, Mumbai - 400001',
        gstNumber: '27AABCP3456A1Z5',
        services: 'Printer AMC, Toner Supply, Repair Services',
        status: 'ACTIVE',
      },
    }),
    prisma.vendor.upsert({
      where: { vendorCode: 'VND-0006' },
      update: {},
      create: {
        vendorCode: 'VND-0006',
        name: 'ServerCare Technologies',
        type: 'AMC',
        contactPerson: 'Mohan Pillai',
        phone: '+91-9876543211',
        email: 'amc@servercare.in',
        address: '56, Tech Corridor, Pune - 411057',
        gstNumber: '27AABCS7890A1Z5',
        services: 'Server AMC, Hardware Maintenance, UPS Service',
        status: 'ACTIVE',
      },
    }),
    prisma.vendor.upsert({
      where: { vendorCode: 'VND-0007' },
      update: {},
      create: {
        vendorCode: 'VND-0007',
        name: 'Jio Business Connectivity',
        type: 'INTERNET',
        contactPerson: 'Sunita Shah',
        phone: '+91-9700000000',
        email: 'enterprise@jio.in',
        address: 'Maker Chambers, Nariman Point, Mumbai - 400021',
        gstNumber: '27AABCJ1111A1Z5',
        services: 'Fiber Internet, Leased Line, Backup ISP',
        status: 'ACTIVE',
      },
    }),
  ]);
  const [rentalVendor, ispVendor, cctvVendor, networkVendor, printerVendor, amcVendor, backupIspVendor] = vendors;

  // ─── Expense Categories ───────────────────────────────
  console.log('  Creating expense categories...');
  const expCats = await Promise.all([
    prisma.expenseCategory.upsert({ where: { code: 'INT' }, update: {}, create: { name: 'Internet & ISP', code: 'INT' } }),
    prisma.expenseCategory.upsert({ where: { code: 'RENT' }, update: {}, create: { name: 'Laptop Rental', code: 'RENT' } }),
    prisma.expenseCategory.upsert({ where: { code: 'AMC' }, update: {}, create: { name: 'AMC Contracts', code: 'AMC' } }),
    prisma.expenseCategory.upsert({ where: { code: 'HW' }, update: {}, create: { name: 'Hardware Purchase', code: 'HW' } }),
    prisma.expenseCategory.upsert({ where: { code: 'SW' }, update: {}, create: { name: 'Software License', code: 'SW' } }),
    prisma.expenseCategory.upsert({ where: { code: 'CLOUD' }, update: {}, create: { name: 'Cloud Services', code: 'CLOUD' } }),
    prisma.expenseCategory.upsert({ where: { code: 'CCTV' }, update: {}, create: { name: 'CCTV Maintenance', code: 'CCTV' } }),
    prisma.expenseCategory.upsert({ where: { code: 'PRINT' }, update: {}, create: { name: 'Printer & Consumables', code: 'PRINT' } }),
    prisma.expenseCategory.upsert({ where: { code: 'NET' }, update: {}, create: { name: 'Network Equipment', code: 'NET' } }),
    prisma.expenseCategory.upsert({ where: { code: 'OTHER' }, update: {}, create: { name: 'Other IT Expenses', code: 'OTHER' } }),
  ]);
  const [intCat, rentCat, amcCat] = expCats;

  // ─── ISP Connections ──────────────────────────────────
  console.log('  Creating ISP connections...');
  await Promise.all([
    prisma.iSPConnection.upsert({
      where: { connectionCode: 'ISP-001' },
      update: {},
      create: {
        connectionCode: 'ISP-001',
        ispName: 'Airtel Business',
        vendorId: ispVendor.id,
        locationId: headOffice.id,
        bandwidth: '100 Mbps',
        connectionType: 'LEASED_LINE',
        monthlyCost: 25000,
        gstPercent: 18,
        billingDate: 1,
        publicIp: '103.21.45.100',
        sla: '99.5% uptime',
        supportNumber: '1800-419-8880',
        accountNumber: 'ENT-2024-BLR-0045',
        status: 'ONLINE',
        isActive: true,
      },
    }),
    prisma.iSPConnection.upsert({
      where: { connectionCode: 'ISP-002' },
      update: {},
      create: {
        connectionCode: 'ISP-002',
        ispName: 'Jio Business',
        vendorId: backupIspVendor.id,
        locationId: headOffice.id,
        bandwidth: '50 Mbps',
        connectionType: 'FIBER',
        monthlyCost: 12000,
        gstPercent: 18,
        billingDate: 5,
        publicIp: '49.36.120.55',
        sla: '99% uptime',
        supportNumber: '1860-893-3333',
        accountNumber: 'JIO-ENT-2024-0089',
        status: 'ONLINE',
        isActive: true,
      },
    }),
    prisma.iSPConnection.upsert({
      where: { connectionCode: 'ISP-003' },
      update: {},
      create: {
        connectionCode: 'ISP-003',
        ispName: 'Airtel Business',
        vendorId: ispVendor.id,
        locationId: branchNorth.id,
        bandwidth: '30 Mbps',
        connectionType: 'FIBER',
        monthlyCost: 8000,
        gstPercent: 18,
        billingDate: 1,
        sla: '99% uptime',
        supportNumber: '1800-419-8880',
        status: 'ONLINE',
        isActive: true,
      },
    }),
  ]);

  // ─── Assets ───────────────────────────────────────────
  console.log('  Creating assets (laptops, desktops, CCTVs, network)...');
  const today = new Date();
  const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
  const oneYearAhead = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const twoYearsAhead = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
  const thirtyDaysAhead = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Laptops
  const laptopData = [
    { brand: 'Dell', model: 'Latitude 5540', serial: 'DL-2024-001' },
    { brand: 'Dell', model: 'Latitude 5540', serial: 'DL-2024-002' },
    { brand: 'HP', model: 'ProBook 450 G10', serial: 'HP-2024-001' },
    { brand: 'HP', model: 'ProBook 450 G10', serial: 'HP-2024-002' },
    { brand: 'Lenovo', model: 'ThinkPad E14', serial: 'LN-2024-001' },
    { brand: 'Lenovo', model: 'ThinkPad E14', serial: 'LN-2024-002' },
    { brand: 'Apple', model: 'MacBook Air M2', serial: 'AP-2024-001' },
    { brand: 'Dell', model: 'Latitude 3540', serial: 'DL-2023-001' },
    { brand: 'HP', model: 'EliteBook 840 G10', serial: 'HP-2023-001' },
    { brand: 'Lenovo', model: 'IdeaPad 5', serial: 'LN-2023-001' },
  ];

  for (let i = 0; i < laptopData.length; i++) {
    const code = `AST-${String(i + 1).padStart(5, '0')}`;
    await prisma.asset.upsert({
      where: { assetCode: code },
      update: {},
      create: {
        assetCode: code,
        type: 'LAPTOP',
        brand: laptopData[i].brand,
        model: laptopData[i].model,
        serialNumber: laptopData[i].serial,
        purchaseDate: twoYearsAgo,
        purchaseCost: 65000,
        vendorId: rentalVendor.id,
        warrantyStart: twoYearsAgo,
        warrantyEnd: i < 5 ? twoYearsAhead : thirtyDaysAhead, // Some expiring soon
        assignedUserId: i === 0 ? superAdmin.id : i === 1 ? itManager.id : null,
        departmentId: itDept.id,
        locationId: headOffice.id,
        status: 'ASSIGNED',
        condition: 'GOOD',
        operatingSystem: laptopData[i].brand === 'Apple' ? 'macOS Sonoma' : 'Windows 11 Pro',
      },
    });
  }

  // Desktops
  for (let i = 0; i < 8; i++) {
    const code = `AST-${String(11 + i).padStart(5, '0')}`;
    await prisma.asset.upsert({
      where: { assetCode: code },
      update: {},
      create: {
        assetCode: code,
        type: 'DESKTOP',
        brand: i % 2 === 0 ? 'Dell' : 'HP',
        model: i % 2 === 0 ? 'OptiPlex 7010' : 'EliteDesk 800 G6',
        serialNumber: `DT-2023-00${i + 1}`,
        purchaseDate: twoYearsAgo,
        purchaseCost: 45000,
        warrantyStart: twoYearsAgo,
        warrantyEnd: twoYearsAhead,
        departmentId: i < 4 ? finDept.id : hrDept.id,
        locationId: headOffice.id,
        status: 'ASSIGNED',
        condition: 'GOOD',
        operatingSystem: 'Windows 11 Pro',
      },
    });
  }

  // Server
  const serverCode = 'AST-00019';
  await prisma.asset.upsert({
    where: { assetCode: serverCode },
    update: {},
    create: {
      assetCode: serverCode,
      type: 'SERVER',
      brand: 'Dell',
      model: 'PowerEdge R740',
      serialNumber: 'SRV-2022-001',
      purchaseDate: new Date(today.getFullYear() - 3, 0, 1),
      purchaseCost: 350000,
      vendorId: amcVendor.id,
      warrantyStart: new Date(today.getFullYear() - 3, 0, 1),
      warrantyEnd: twoYearsAhead,
      departmentId: itDept.id,
      locationId: dataCenter.id,
      ipAddress: '192.168.1.10',
      hostname: 'srv-prod-01',
      status: 'ACTIVE',
      condition: 'EXCELLENT',
      operatingSystem: 'Windows Server 2022',
    },
  });

  // Network Switch
  await prisma.asset.upsert({
    where: { assetCode: 'AST-00020' },
    update: {},
    create: {
      assetCode: 'AST-00020',
      type: 'NETWORK_SWITCH',
      brand: 'Cisco',
      model: 'Catalyst 2960-X',
      serialNumber: 'CSC-SW-001',
      purchaseDate: twoYearsAgo,
      purchaseCost: 85000,
      vendorId: networkVendor.id,
      warrantyStart: twoYearsAgo,
      warrantyEnd: twoYearsAhead,
      locationId: dataCenter.id,
      ipAddress: '192.168.1.1',
      status: 'ACTIVE',
      condition: 'EXCELLENT',
    },
  });

  // NVR Devices
  console.log('  Creating NVR devices...');
  const nvrs = [];
  for (let i = 0; i < 4; i++) {
    const code = `NVR-00${i + 1}`;
    const nvr = await prisma.nVRDevice.upsert({
      where: { nvrCode: code },
      update: {},
      create: {
        nvrCode: code,
        name: `NVR-${String(i + 1).padStart(2, '0')}`,
        brand: 'Hikvision',
        model: 'DS-7632NI-K2/16P',
        ipAddress: `192.168.10.${10 + i}`,
        locationId: i === 0 ? headOffice.id : i === 1 ? dataCenter.id : i === 2 ? branchNorth.id : locs[3].id,
        totalChannels: 32,
        status: 'ONLINE',
      },
    });
    nvrs.push(nvr);
  }

  // CCTV Cameras (create 66)
  console.log('  Creating CCTV cameras (66 cameras)...');
  const cameraLocations = [headOffice, dataCenter, branchNorth, locs[3], locs[4]];
  for (let i = 0; i < 66; i++) {
    const code = `CAM-${String(i + 1).padStart(4, '0')}`;
    const locIndex = Math.floor(i / 14);
    const nvrIndex = Math.floor(i / 18);
    await prisma.cCTVCamera.upsert({
      where: { cameraCode: code },
      update: {},
      create: {
        cameraCode: code,
        name: `Camera-${String(i + 1).padStart(2, '0')}`,
        locationId: cameraLocations[Math.min(locIndex, 4)].id,
        ipAddress: `192.168.20.${100 + i}`,
        brand: i % 3 === 0 ? 'Hikvision' : i % 3 === 1 ? 'Dahua' : 'CP Plus',
        model: i % 3 === 0 ? 'DS-2CD2143G2-I' : i % 3 === 1 ? 'IPC-HDW2831T-AS' : 'CP-VNC-D21PL2-MD',
        nvrId: nvrs[Math.min(nvrIndex, 3)].id,
        channel: (i % 18) + 1,
        installationDate: twoYearsAgo,
        warrantyEnd: twoYearsAhead,
        amcEnd: new Date(today.getFullYear(), today.getMonth() + 3, 1),
        status: i > 60 ? 'OFFLINE' : i > 55 ? 'FAULT' : 'ONLINE', // Mix statuses
        lastMaintenance: new Date(today.getFullYear(), today.getMonth() - 2, 1),
        nextMaintenance: new Date(today.getFullYear(), today.getMonth() + 1, 1),
      },
    });
  }

  // ─── AMC Contracts ────────────────────────────────────
  console.log('  Creating AMC contracts...');
  await prisma.aMCContract.upsert({
    where: { amcCode: 'AMC-0001' },
    update: {},
    create: {
      amcCode: 'AMC-0001',
      vendorId: cctvVendor.id,
      contractNumber: 'AMC/CCTV/2024/001',
      serviceType: 'CCTV Systems',
      assetCategory: 'CCTV',
      startDate: new Date(today.getFullYear(), 0, 1),
      endDate: new Date(today.getFullYear(), 11, 31),
      contractValue: 120000,
      gstPercent: 18,
      gstAmount: 21600,
      totalValue: 141600,
      sla: 'Response within 4 hours, Resolution within 24 hours',
      serviceFrequency: 'QUARTERLY',
      contactPerson: 'Ramesh Babu',
      contactNumber: '+91-9988776655',
      renewalStatus: 'ACTIVE',
      alertDays: 60,
    },
  });

  await prisma.aMCContract.upsert({
    where: { amcCode: 'AMC-0002' },
    update: {},
    create: {
      amcCode: 'AMC-0002',
      vendorId: amcVendor.id,
      contractNumber: 'AMC/SRV/2024/002',
      serviceType: 'Server & Infrastructure',
      assetCategory: 'Server',
      startDate: new Date(today.getFullYear(), 0, 1),
      endDate: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000), // Expiring in 25 days
      contractValue: 85000,
      gstPercent: 18,
      gstAmount: 15300,
      totalValue: 100300,
      sla: 'Response within 2 hours, Resolution within 8 hours',
      serviceFrequency: 'MONTHLY',
      renewalStatus: 'EXPIRING_SOON',
      alertDays: 30,
    },
  });

  // ─── Software Licenses ────────────────────────────────
  console.log('  Creating software licenses...');
  await Promise.all([
    prisma.softwareLicense.upsert({
      where: { licenseCode: 'LIC-0001' },
      update: {},
      create: {
        licenseCode: 'LIC-0001',
        softwareName: 'Microsoft 365 Business Premium',
        vendorId: amcVendor.id,
        licenseType: 'SUBSCRIPTION',
        totalLicenses: 50,
        usedLicenses: 42,
        purchaseDate: new Date(today.getFullYear(), 0, 1),
        expiryDate: new Date(today.getFullYear() + 1, 0, 1),
        cost: 125000,
        renewalCost: 135000,
        status: 'ACTIVE',
      },
    }),
    prisma.softwareLicense.upsert({
      where: { licenseCode: 'LIC-0002' },
      update: {},
      create: {
        licenseCode: 'LIC-0002',
        softwareName: 'Windows 11 Pro',
        licenseType: 'VOLUME',
        totalLicenses: 60,
        usedLicenses: 55,
        purchaseDate: twoYearsAgo,
        expiryDate: twoYearsAhead,
        cost: 180000,
        status: 'ACTIVE',
      },
    }),
    prisma.softwareLicense.upsert({
      where: { licenseCode: 'LIC-0003' },
      update: {},
      create: {
        licenseCode: 'LIC-0003',
        softwareName: 'Kaspersky Endpoint Security',
        licenseType: 'SUBSCRIPTION',
        totalLicenses: 75,
        usedLicenses: 68,
        purchaseDate: new Date(today.getFullYear(), today.getMonth() - 10, 1),
        expiryDate: thirtyDaysAhead, // Expiring soon
        cost: 45000,
        renewalCost: 50000,
        status: 'EXPIRING_SOON',
      },
    }),
  ]);

  // ─── Activities (20 items) ────────────────────────────
  console.log('  Creating sample activities (20 items)...');
  const activityList = [
    { code: 'ACT-2026-0001', time: '09:00', title: 'Daily Server & Storage Health Check', cat: 'SERVER', status: 'COMPLETED', priority: 'HIGH', daysAgo: 0 },
    { code: 'ACT-2026-0002', time: '09:30', title: 'Internet Leased Line Uptime Monitoring', cat: 'INTERNET', status: 'COMPLETED', priority: 'MEDIUM', daysAgo: 0 },
    { code: 'ACT-2026-0003', time: '10:15', title: 'User Laptop RAM Upgrade - Finance Dept', cat: 'USER_SUPPORT', status: 'COMPLETED', priority: 'HIGH', daysAgo: 0 },
    { code: 'ACT-2026-0004', time: '11:30', title: 'Laptop Rental Vendor Coordination', cat: 'VENDOR', status: 'PENDING', priority: 'MEDIUM', daysAgo: 0 },
    { code: 'ACT-2026-0005', time: '14:00', title: 'CCTV Camera NVR Inspection - Floor 2', cat: 'CCTV', status: 'WAITING_FOR_VENDOR', priority: 'MEDIUM', daysAgo: 0 },
    { code: 'ACT-2026-0006', time: '15:00', title: 'Database Backup Integrity Audit', cat: 'BACKUP', status: 'COMPLETED', priority: 'HIGH', daysAgo: 0 },
    { code: 'ACT-2026-0007', time: '16:00', title: 'Firewall Policy Rule Audit & Review', cat: 'SECURITY', status: 'IN_PROGRESS', priority: 'HIGH', daysAgo: 0 },
    { code: 'ACT-2026-0008', time: '09:15', title: 'Network Core Switch Firmware Verification', cat: 'NETWORK', status: 'COMPLETED', priority: 'HIGH', daysAgo: 1 },
    { code: 'ACT-2026-0009', time: '11:00', title: 'Antivirus Definition Server Deployment', cat: 'SECURITY', status: 'COMPLETED', priority: 'CRITICAL', daysAgo: 1 },
    { code: 'ACT-2026-0010', time: '14:30', title: 'Printer Maintenance & Toner Replacement', cat: 'HARDWARE', status: 'COMPLETED', priority: 'LOW', daysAgo: 1 },
    { code: 'ACT-2026-0011', time: '16:15', title: 'IT Purchase Requisition Approval Prep', cat: 'PURCHASE', status: 'COMPLETED', priority: 'MEDIUM', daysAgo: 1 },
    { code: 'ACT-2026-0012', time: '10:00', title: 'Wi-Fi Access Point Coverage Testing', cat: 'NETWORK', status: 'COMPLETED', priority: 'MEDIUM', daysAgo: 2 },
    { code: 'ACT-2026-0013', time: '12:00', title: 'UPS Battery Backup Test - Server Room', cat: 'PREVENTIVE_MAINTENANCE', status: 'COMPLETED', priority: 'CRITICAL', daysAgo: 2 },
    { code: 'ACT-2026-0014', time: '15:00', title: 'AMC Renewal Discussion with Dell Vendor', cat: 'AMC', status: 'COMPLETED', priority: 'HIGH', daysAgo: 2 },
    { code: 'ACT-2026-0015', time: '09:30', title: 'Active Directory User Password Resets', cat: 'SYSTEM_ADMINISTRATION', status: 'COMPLETED', priority: 'LOW', daysAgo: 3 },
    { code: 'ACT-2026-0016', time: '11:45', title: 'Weekly VM Cluster Resource Optimization', cat: 'SERVER', status: 'COMPLETED', priority: 'MEDIUM', daysAgo: 3 },
    { code: 'ACT-2026-0017', time: '14:15', title: 'Office 365 License Allocation Review', cat: 'SOFTWARE', status: 'COMPLETED', priority: 'LOW', daysAgo: 3 },
    { code: 'ACT-2026-0018', time: '10:30', title: 'Preventive Maintenance - HR Laptops', cat: 'PREVENTIVE_MAINTENANCE', status: 'COMPLETED', priority: 'MEDIUM', daysAgo: 4 },
    { code: 'ACT-2026-0019', time: '13:30', title: 'Network Cable Labeling & Server Rack Clean', cat: 'DOCUMENTATION', status: 'COMPLETED', priority: 'LOW', daysAgo: 4 },
    { code: 'ACT-2026-0020', time: '15:45', title: 'IT Operations Weekly Team Meeting', cat: 'MEETING', status: 'COMPLETED', priority: 'MEDIUM', daysAgo: 4 },
  ];

  for (const a of activityList) {
    const actDate = new Date(today.getTime() - a.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.activity.upsert({
      where: { activityCode: a.code },
      update: {},
      create: {
        activityCode: a.code,
        date: actDate,
        startTime: a.time,
        title: a.title,
        category: a.cat as never,
        priority: a.priority as never,
        status: a.status as never,
        createdById: superAdmin.id,
        departmentId: itDept.id,
      },
    });
  }

  // ─── Tasks (15 items) ─────────────────────────────────
  console.log('  Creating sample tasks (15 items)...');
  const taskList = [
    { code: 'TASK-2026-0001', title: 'Server Infrastructure AMC Renewal', priority: 'HIGH', status: 'IN_PROGRESS', dueDays: 15 },
    { code: 'TASK-2026-0002', title: 'Network Core Switch Firmware Upgrade', priority: 'MEDIUM', status: 'TODO', dueDays: 7 },
    { code: 'TASK-2026-0003', title: 'Enterprise Antivirus License Renewal', priority: 'CRITICAL', status: 'TODO', dueDays: 12 },
    { code: 'TASK-2026-0004', title: 'CCTV Camera Quarterly Inspection', priority: 'MEDIUM', status: 'WAITING', dueDays: 10 },
    { code: 'TASK-2026-0005', title: 'New Onboarding Laptops Provisioning (x5)', priority: 'HIGH', status: 'IN_PROGRESS', dueDays: 3 },
    { code: 'TASK-2026-0006', title: 'IT Asset Verification - Finance Dept', priority: 'LOW', status: 'TODO', dueDays: 20 },
    { code: 'TASK-2026-0007', title: 'Overdue Task - Server Backup Storage Expansion', priority: 'CRITICAL', status: 'TODO', dueDays: -4 },
    { code: 'TASK-2026-0008', title: 'Configure VPN Access for Remote Engineers', priority: 'HIGH', status: 'COMPLETED', dueDays: -1 },
    { code: 'TASK-2026-0009', title: 'ISP Primary Line Speed Upgrade Verification', priority: 'MEDIUM', status: 'COMPLETED', dueDays: -2 },
    { code: 'TASK-2026-0010', title: 'Replace Faulty UPS Batteries in Rack B', priority: 'HIGH', status: 'TODO', dueDays: 5 },
    { code: 'TASK-2026-0011', title: 'Audit Active Directory Disabled Accounts', priority: 'LOW', status: 'TODO', dueDays: 14 },
    { code: 'TASK-2026-0012', title: 'Overdue Task - Firewall Firmware Patching', priority: 'HIGH', status: 'IN_PROGRESS', dueDays: -2 },
    { code: 'TASK-2026-0013', title: 'Procure 10x Wireless Mice & Keyboards', priority: 'LOW', status: 'COMPLETED', dueDays: -3 },
    { code: 'TASK-2026-0014', title: 'Setup Monthly Automated Database Backup Test', priority: 'MEDIUM', status: 'COMPLETED', dueDays: -5 },
    { code: 'TASK-2026-0015', title: 'Update IT Asset Disaster Recovery Documentation', priority: 'LOW', status: 'TODO', dueDays: 18 },
  ];

  for (const t of taskList) {
    const due = new Date(today.getTime() + t.dueDays * 24 * 60 * 60 * 1000);
    const createdTask = await prisma.task.upsert({
      where: { taskCode: t.code },
      update: {},
      create: {
        taskCode: t.code,
        title: t.title,
        priority: t.priority as never,
        status: t.status as never,
        dueDate: due,
        assignedUserId: itEngineer.id,
        createdById: superAdmin.id,
        departmentId: itDept.id,
        completedDate: t.status === 'COMPLETED' ? new Date() : null,
      },
    });

    // Add sample subtasks for key tasks
    if (t.code === 'TASK-2026-0002') {
      await prisma.taskSubtask.createMany({
        data: [
          { taskId: createdTask.id, title: 'Backup switch configuration', isCompleted: true },
          { taskId: createdTask.id, title: 'Download latest firmware binary', isCompleted: true },
          { taskId: createdTask.id, title: 'Schedule maintenance window', isCompleted: false },
          { taskId: createdTask.id, title: 'Perform upgrade and reboot', isCompleted: false },
        ],
      });
    }
  }

  // ─── Tickets ──────────────────────────────────────────
  console.log('  Creating sample tickets...');
  const tickets = [
    { num: 'INC-2026-0001', sub: 'Internet down at HO', cat: 'INTERNET', priority: 'CRITICAL', status: 'RESOLVED' },
    { num: 'INC-2026-0002', sub: 'Printer not working - Finance', cat: 'PRINTER', priority: 'HIGH', status: 'IN_PROGRESS' },
    { num: 'INC-2026-0003', sub: 'Email not sending - HR team', cat: 'EMAIL', priority: 'HIGH', status: 'OPEN' },
    { num: 'INC-2026-0004', sub: 'Laptop keyboard issue', cat: 'HARDWARE', priority: 'MEDIUM', status: 'OPEN' },
    { num: 'INC-2026-0005', sub: 'VPN connectivity issues', cat: 'NETWORK', priority: 'HIGH', status: 'IN_PROGRESS' },
    { num: 'INC-2026-0006', sub: 'CCTV camera offline - Entrance', cat: 'CCTV', priority: 'MEDIUM', status: 'OPEN' },
    { num: 'INC-2026-0007', sub: 'Server disk space alert', cat: 'SERVER', priority: 'CRITICAL', status: 'IN_PROGRESS' },
    { num: 'INC-2026-0008', sub: 'Software installation request', cat: 'SOFTWARE', priority: 'LOW', status: 'OPEN' },
  ];

  for (const t of tickets) {
    await prisma.ticket.upsert({
      where: { ticketNumber: t.num },
      update: {},
      create: {
        ticketNumber: t.num,
        date: new Date(),
        category: t.cat as never,
        priority: t.priority as never,
        subject: t.sub,
        status: t.status as never,
        reportedById: viewer.id,
        assignedEngineerId: itEngineer.id,
        departmentId: itDept.id,
      },
    });
  }

  // ─── Invoices ─────────────────────────────────────────
  console.log('  Creating sample invoices...');
  await Promise.all([
    prisma.invoice.upsert({
      where: { invoiceCode: 'INV-00001' },
      update: {},
      create: {
        invoiceCode: 'INV-00001',
        invoiceNumber: 'TRS/2026/SEP/001',
        vendorId: rentalVendor.id,
        service: 'Laptop Rental - September 2026',
        invoiceDate: new Date(today.getFullYear(), today.getMonth(), 1),
        billingPeriod: 'September 2026',
        subtotal: 45000,
        gstPercent: 18,
        gstAmount: 8100,
        totalAmount: 53100,
        dueDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000),
        approvalStatus: 'APPROVED',
        paymentStatus: 'PENDING',
      },
    }),
    prisma.invoice.upsert({
      where: { invoiceCode: 'INV-00002' },
      update: {},
      create: {
        invoiceCode: 'INV-00002',
        invoiceNumber: 'AIR/2026/SEP/INV-7823',
        vendorId: ispVendor.id,
        service: 'Leased Line - September 2026',
        invoiceDate: new Date(today.getFullYear(), today.getMonth(), 1),
        billingPeriod: 'September 2026',
        subtotal: 25000,
        gstPercent: 18,
        gstAmount: 4500,
        totalAmount: 29500,
        dueDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
        approvalStatus: 'APPROVED',
        paymentStatus: 'OVERDUE',
      },
    }),
    prisma.invoice.upsert({
      where: { invoiceCode: 'INV-00003' },
      update: {},
      create: {
        invoiceCode: 'INV-00003',
        invoiceNumber: 'SEC/AMC/2026/Q3/001',
        vendorId: cctvVendor.id,
        service: 'CCTV AMC - Q3 2026',
        invoiceDate: new Date(today.getFullYear(), today.getMonth() - 1, 15),
        billingPeriod: 'Q3 2026',
        subtotal: 30000,
        gstPercent: 18,
        gstAmount: 5400,
        totalAmount: 35400,
        approvalStatus: 'PAID',
        paymentStatus: 'PAID',
        paymentDate: new Date(today.getFullYear(), today.getMonth() - 1, 25),
      },
    }),
  ]);

  // ─── Expenses ─────────────────────────────────────────
  console.log('  Creating sample expenses...');
  const curMonth = today.getMonth() + 1;
  const curYear = today.getFullYear();
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
  const prevYear = curMonth === 1 ? curYear - 1 : curYear;

  const expenses = [
    { code: 'EXP-00001', cat: intCat.id, vendor: ispVendor.id, desc: 'Internet - Airtel Sep 2026', amt: 25000, month: curMonth, year: curYear },
    { code: 'EXP-00002', cat: rentCat.id, vendor: rentalVendor.id, desc: 'Laptop Rental Sep 2026', amt: 45000, month: curMonth, year: curYear },
    { code: 'EXP-00003', cat: amcCat.id, vendor: cctvVendor.id, desc: 'CCTV AMC Q3', amt: 30000, month: curMonth, year: curYear },
    { code: 'EXP-00004', cat: intCat.id, vendor: ispVendor.id, desc: 'Internet - Airtel Aug 2026', amt: 25000, month: prevMonth, year: prevYear },
    { code: 'EXP-00005', cat: rentCat.id, vendor: rentalVendor.id, desc: 'Laptop Rental Aug 2026', amt: 45000, month: prevMonth, year: prevYear },
  ];

  for (const e of expenses) {
    await prisma.expense.upsert({
      where: { expenseCode: e.code },
      update: {},
      create: {
        expenseCode: e.code,
        categoryId: e.cat,
        vendorId: e.vendor,
        description: e.desc,
        amount: e.amt,
        gstAmount: e.amt * 0.18,
        totalAmount: e.amt * 1.18,
        expenseDate: new Date(e.year, e.month - 1, 5),
        month: e.month,
        year: e.year,
        paymentStatus: 'PAID',
      },
    });
  }

  // ─── Network Downtime ─────────────────────────────────
  console.log('  Creating network downtime records...');
  const ispConn = await prisma.iSPConnection.findFirst({ where: { connectionCode: 'ISP-001' } });
  if (ispConn) {
    await prisma.networkDowntime.upsert({
      where: { downtimeCode: 'DWN-00001' },
      update: {},
      create: {
        downtimeCode: 'DWN-00001',
        ispId: ispConn.id,
        date: new Date(today.getFullYear(), today.getMonth(), 10),
        startTime: new Date(today.getFullYear(), today.getMonth(), 10, 10, 30),
        endTime: new Date(today.getFullYear(), today.getMonth(), 10, 12, 45),
        durationMinutes: 135,
        reason: 'ISP fiber cut due to road work',
        resolution: 'Switched to backup ISP, fiber restored by ISP team',
        impact: 'All internet services affected',
      },
    });
  }

  // ─── Follow-ups ───────────────────────────────────────
  console.log('  Creating sample follow-ups...');
  await Promise.all([
    prisma.followup.upsert({
      where: { followupCode: 'FUP-00001' },
      update: {},
      create: {
        followupCode: 'FUP-00001',
        subject: 'Laptop rental invoice pending - September',
        vendorId: rentalVendor.id,
        followupDate: today,
        personContacted: 'Vikram Singh',
        communicationType: 'PHONE',
        discussion: 'Called vendor regarding invoice delay. They will send by EOD today.',
        nextFollowupDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    }),
    prisma.followup.upsert({
      where: { followupCode: 'FUP-00002' },
      update: {},
      create: {
        followupCode: 'FUP-00002',
        subject: 'CCTV AMC renewal quotation',
        vendorId: cctvVendor.id,
        followupDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
        personContacted: 'Ramesh Babu',
        communicationType: 'EMAIL',
        discussion: 'Sent email requesting renewal quotation for next year',
        status: 'PENDING',
      },
    }),
  ]);

  // ─── Backup Jobs ──────────────────────────────────────
  console.log('  Creating backup jobs...');
  const backupJob = await prisma.backupJob.upsert({
    where: { jobCode: 'BCK-0001' },
    update: {},
    create: {
      jobCode: 'BCK-0001',
      jobName: 'Daily Full Backup - Production Server',
      serverName: 'srv-prod-01',
      backupType: 'Full',
      backupTarget: 'NAS - 192.168.1.200',
      schedule: 'Daily 11:00 PM',
      retention: '30 days',
      isActive: true,
    },
  });

  // Recent backup logs
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const failed = i === 2; // Day before yesterday failed
    await prisma.backupLog.create({
      data: {
        jobId: backupJob.id,
        backupDate: d,
        status: failed ? 'FAILED' : 'SUCCESSFUL',
        backupSizeBytes: failed ? null : BigInt(45 * 1024 * 1024 * 1024), // 45GB
        duration: failed ? null : 3600,
        errorMessage: failed ? 'Connection timeout to backup NAS' : null,
        actionTaken: failed ? 'Checked NAS connectivity, manual backup triggered' : null,
      },
    });
  }

  // ─── Preventive Maintenance ───────────────────────────
  console.log('  Creating PM records...');
  const serverAsset = await prisma.asset.findFirst({ where: { assetCode: 'AST-00019' } });
  if (serverAsset) {
    await prisma.preventiveMaintenance.upsert({
      where: { pmCode: 'PM-00001' },
      update: {},
      create: {
        pmCode: 'PM-00001',
        assetId: serverAsset.id,
        assetType: 'SERVER',
        maintenanceType: 'Server Health Check & Cleaning',
        frequency: 'MONTHLY',
        scheduledDate: new Date(today.getFullYear(), today.getMonth(), 25),
        engineerId: itEngineer.id,
        status: 'SCHEDULED',
        checklist: JSON.stringify([
          'Check disk health',
          'Check memory usage',
          'Clean dust filters',
          'Check cooling fans',
          'Update firmware',
          'Verify backup status',
        ]),
        nextPMDate: new Date(today.getFullYear(), today.getMonth() + 1, 25),
      },
    });

    await prisma.preventiveMaintenance.upsert({
      where: { pmCode: 'PM-00002' },
      update: {},
      create: {
        pmCode: 'PM-00002',
        assetType: 'CCTV_CAMERA',
        maintenanceType: 'CCTV Quarterly Maintenance',
        frequency: 'QUARTERLY',
        scheduledDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (overdue)
        status: 'OVERDUE',
        checklist: JSON.stringify([
          'Clean camera lens',
          'Check IR LEDs',
          'Verify recording',
          'Check NVR connectivity',
          'Test PTZ functions',
          'Review camera angles',
        ]),
        engineerId: itSupport.id,
      },
    });
  }

  // ─── KPI Targets ─────────────────────────────────────
  console.log('  Creating KPI targets...');
  const kpiTargets = [
    { metric: 'network_uptime', targetValue: 99.5, unit: '%', description: 'Network uptime target' },
    { metric: 'internet_uptime', targetValue: 99.0, unit: '%', description: 'Internet/ISP uptime target' },
    { metric: 'incident_resolution_hours', targetValue: 4, unit: 'hours', description: 'Average incident resolution time' },
    { metric: 'backup_success_rate', targetValue: 99.0, unit: '%', description: 'Backup success rate' },
    { metric: 'pm_completion_rate', targetValue: 95.0, unit: '%', description: 'Preventive maintenance completion rate' },
    { metric: 'asset_availability', targetValue: 98.0, unit: '%', description: 'Asset availability rate' },
    { metric: 'sla_compliance', targetValue: 95.0, unit: '%', description: 'Vendor SLA compliance rate' },
  ];

  for (const kpi of kpiTargets) {
    await prisma.kPITarget.upsert({
      where: { metric: kpi.metric },
      update: {},
      create: kpi,
    });
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📌 Login Credentials:');
  console.log('  Super Admin : admin@company.com / Admin@1234');
  console.log('  IT Manager  : it.manager@company.com / Admin@1234');
  console.log('  Sys Admin   : sysadmin@company.com / Admin@1234');
  console.log('  IT Engineer : engineer@company.com / Admin@1234');
  console.log('  IT Support  : support@company.com / Admin@1234');
  console.log('  Viewer      : viewer@company.com / Admin@1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
