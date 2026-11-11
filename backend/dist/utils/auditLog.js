"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
const database_1 = require("../config/database");
async function createAuditLog(options) {
    try {
        const { req, action, module, recordId, recordCode, oldValues, newValues, description } = options;
        await database_1.prisma.auditLog.create({
            data: {
                userId: req.user?.id,
                userEmail: req.user?.email,
                action,
                module,
                recordId,
                recordCode,
                oldValues: oldValues ? JSON.stringify(oldValues) : null,
                newValues: newValues ? JSON.stringify(newValues) : null,
                description,
                ipAddress: req.ip || req.socket.remoteAddress || null,
                userAgent: req.headers['user-agent'] || null,
            },
        });
    }
    catch (error) {
        // Audit log failure should never crash the application
        console.error('[AuditLog] Failed to create audit log:', error);
    }
}
//# sourceMappingURL=auditLog.js.map