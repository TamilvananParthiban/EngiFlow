"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.generateTicketNumber = generateTicketNumber;
exports.generateAssetCode = generateAssetCode;
exports.generateVendorCode = generateVendorCode;
exports.generateActivityCode = generateActivityCode;
exports.generateTaskCode = generateTaskCode;
exports.generateInvoiceCode = generateInvoiceCode;
exports.generatePaymentCode = generatePaymentCode;
exports.generateFollowupCode = generateFollowupCode;
exports.generateAMCCode = generateAMCCode;
exports.generatePMCode = generatePMCode;
exports.generateLicenseCode = generateLicenseCode;
exports.generateExpenseCode = generateExpenseCode;
exports.generatePurchaseCode = generatePurchaseCode;
exports.generateRentalCode = generateRentalCode;
exports.generateISPCode = generateISPCode;
exports.generateNetworkDeviceCode = generateNetworkDeviceCode;
exports.generateDowntimeCode = generateDowntimeCode;
exports.generateCCTVCode = generateCCTVCode;
exports.generateNVRCode = generateNVRCode;
exports.generateBackupJobCode = generateBackupJobCode;
const cuid2_1 = require("@paralleldrive/cuid2");
const database_1 = require("../config/database");
// Generate CUID2 for internal IDs
function generateId() {
    return (0, cuid2_1.createId)();
}
// Auto-increment style codes with prefix
// e.g., INC-2026-0001, AST-00045
async function generateTicketNumber() {
    const year = new Date().getFullYear();
    const count = await database_1.prisma.ticket.count({
        where: {
            ticketNumber: {
                startsWith: `INC-${year}-`,
            },
        },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `INC-${year}-${seq}`;
}
async function generateAssetCode() {
    const count = await database_1.prisma.asset.count();
    const seq = String(count + 1).padStart(5, '0');
    return `AST-${seq}`;
}
async function generateVendorCode() {
    const count = await database_1.prisma.vendor.count();
    const seq = String(count + 1).padStart(4, '0');
    return `VND-${seq}`;
}
async function generateActivityCode() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const count = await database_1.prisma.activity.count({
        where: {
            activityCode: {
                startsWith: `ACT-${dateStr}-`,
            },
        },
    });
    const seq = String(count + 1).padStart(3, '0');
    return `ACT-${dateStr}-${seq}`;
}
async function generateTaskCode() {
    const count = await database_1.prisma.task.count();
    const seq = String(count + 1).padStart(5, '0');
    return `TSK-${seq}`;
}
async function generateInvoiceCode() {
    const count = await database_1.prisma.invoice.count();
    const seq = String(count + 1).padStart(5, '0');
    return `INV-${seq}`;
}
async function generatePaymentCode() {
    const count = await database_1.prisma.payment.count();
    const seq = String(count + 1).padStart(5, '0');
    return `PAY-${seq}`;
}
async function generateFollowupCode() {
    const count = await database_1.prisma.followup.count();
    const seq = String(count + 1).padStart(5, '0');
    return `FUP-${seq}`;
}
async function generateAMCCode() {
    const count = await database_1.prisma.aMCContract.count();
    const seq = String(count + 1).padStart(4, '0');
    return `AMC-${seq}`;
}
async function generatePMCode() {
    const count = await database_1.prisma.preventiveMaintenance.count();
    const seq = String(count + 1).padStart(5, '0');
    return `PM-${seq}`;
}
async function generateLicenseCode() {
    const count = await database_1.prisma.softwareLicense.count();
    const seq = String(count + 1).padStart(4, '0');
    return `LIC-${seq}`;
}
async function generateExpenseCode() {
    const count = await database_1.prisma.expense.count();
    const seq = String(count + 1).padStart(5, '0');
    return `EXP-${seq}`;
}
async function generatePurchaseCode() {
    const count = await database_1.prisma.purchaseRequest.count();
    const seq = String(count + 1).padStart(5, '0');
    return `PR-${seq}`;
}
async function generateRentalCode() {
    const count = await database_1.prisma.laptopRental.count();
    const seq = String(count + 1).padStart(4, '0');
    return `RNT-${seq}`;
}
async function generateISPCode() {
    const count = await database_1.prisma.iSPConnection.count();
    const seq = String(count + 1).padStart(3, '0');
    return `ISP-${seq}`;
}
async function generateNetworkDeviceCode() {
    const count = await database_1.prisma.networkDevice.count();
    const seq = String(count + 1).padStart(4, '0');
    return `NET-${seq}`;
}
async function generateDowntimeCode() {
    const count = await database_1.prisma.networkDowntime.count();
    const seq = String(count + 1).padStart(5, '0');
    return `DWN-${seq}`;
}
async function generateCCTVCode() {
    const count = await database_1.prisma.cCTVCamera.count();
    const seq = String(count + 1).padStart(4, '0');
    return `CAM-${seq}`;
}
async function generateNVRCode() {
    const count = await database_1.prisma.nVRDevice.count();
    const seq = String(count + 1).padStart(3, '0');
    return `NVR-${seq}`;
}
async function generateBackupJobCode() {
    const count = await database_1.prisma.backupJob.count();
    const seq = String(count + 1).padStart(4, '0');
    return `BCK-${seq}`;
}
//# sourceMappingURL=idGenerator.js.map