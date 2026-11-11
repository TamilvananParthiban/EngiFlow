import { createId } from '@paralleldrive/cuid2';
import { prisma } from '../config/database';

// Generate CUID2 for internal IDs
export function generateId(): string {
  return createId();
}

// Auto-increment style codes with prefix
// e.g., INC-2026-0001, AST-00045

export async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.ticket.count({
    where: {
      ticketNumber: {
        startsWith: `INC-${year}-`,
      },
    },
  });
  const seq = String(count + 1).padStart(4, '0');
  return `INC-${year}-${seq}`;
}

export async function generateAssetCode(): Promise<string> {
  const count = await prisma.asset.count();
  const seq = String(count + 1).padStart(5, '0');
  return `AST-${seq}`;
}

export async function generateVendorCode(): Promise<string> {
  const count = await prisma.vendor.count();
  const seq = String(count + 1).padStart(4, '0');
  return `VND-${seq}`;
}

export async function generateActivityCode(): Promise<string> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await prisma.activity.count({
    where: {
      activityCode: {
        startsWith: `ACT-${dateStr}-`,
      },
    },
  });
  const seq = String(count + 1).padStart(3, '0');
  return `ACT-${dateStr}-${seq}`;
}

export async function generateTaskCode(): Promise<string> {
  const count = await prisma.task.count();
  const seq = String(count + 1).padStart(5, '0');
  return `TSK-${seq}`;
}

export async function generateInvoiceCode(): Promise<string> {
  const count = await prisma.invoice.count();
  const seq = String(count + 1).padStart(5, '0');
  return `INV-${seq}`;
}

export async function generatePaymentCode(): Promise<string> {
  const count = await prisma.payment.count();
  const seq = String(count + 1).padStart(5, '0');
  return `PAY-${seq}`;
}

export async function generateFollowupCode(): Promise<string> {
  const count = await prisma.followup.count();
  const seq = String(count + 1).padStart(5, '0');
  return `FUP-${seq}`;
}

export async function generateAMCCode(): Promise<string> {
  const count = await prisma.aMCContract.count();
  const seq = String(count + 1).padStart(4, '0');
  return `AMC-${seq}`;
}

export async function generatePMCode(): Promise<string> {
  const count = await prisma.preventiveMaintenance.count();
  const seq = String(count + 1).padStart(5, '0');
  return `PM-${seq}`;
}

export async function generateLicenseCode(): Promise<string> {
  const count = await prisma.softwareLicense.count();
  const seq = String(count + 1).padStart(4, '0');
  return `LIC-${seq}`;
}

export async function generateExpenseCode(): Promise<string> {
  const count = await prisma.expense.count();
  const seq = String(count + 1).padStart(5, '0');
  return `EXP-${seq}`;
}

export async function generatePurchaseCode(): Promise<string> {
  const count = await prisma.purchaseRequest.count();
  const seq = String(count + 1).padStart(5, '0');
  return `PR-${seq}`;
}

export async function generateRentalCode(): Promise<string> {
  const count = await prisma.laptopRental.count();
  const seq = String(count + 1).padStart(4, '0');
  return `RNT-${seq}`;
}

export async function generateISPCode(): Promise<string> {
  const count = await prisma.iSPConnection.count();
  const seq = String(count + 1).padStart(3, '0');
  return `ISP-${seq}`;
}

export async function generateNetworkDeviceCode(): Promise<string> {
  const count = await prisma.networkDevice.count();
  const seq = String(count + 1).padStart(4, '0');
  return `NET-${seq}`;
}

export async function generateDowntimeCode(): Promise<string> {
  const count = await prisma.networkDowntime.count();
  const seq = String(count + 1).padStart(5, '0');
  return `DWN-${seq}`;
}

export async function generateCCTVCode(): Promise<string> {
  const count = await prisma.cCTVCamera.count();
  const seq = String(count + 1).padStart(4, '0');
  return `CAM-${seq}`;
}

export async function generateNVRCode(): Promise<string> {
  const count = await prisma.nVRDevice.count();
  const seq = String(count + 1).padStart(3, '0');
  return `NVR-${seq}`;
}

export async function generateBackupJobCode(): Promise<string> {
  const count = await prisma.backupJob.count();
  const seq = String(count + 1).padStart(4, '0');
  return `BCK-${seq}`;
}
