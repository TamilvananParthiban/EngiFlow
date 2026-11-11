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
export declare function createAuditLog(options: AuditLogOptions): Promise<void>;
export {};
//# sourceMappingURL=auditLog.d.ts.map