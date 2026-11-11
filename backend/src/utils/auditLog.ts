import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/authenticate';

interface AuditLogOptions {
  req: AuthenticatedRequest;
  action: string;
  module: string;
  recordId?: string;
  recordCode?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  description?: string;
}

export async function createAuditLog(options: AuditLogOptions): Promise<void> {
  try {
    const { req, action, module, recordId, recordCode, oldValues, newValues, description } = options;

    await prisma.auditLog.create({
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
  } catch (error) {
    // Audit log failure should never crash the application
    console.error('[AuditLog] Failed to create audit log:', error);
  }
}
