import { Response } from 'express';
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    meta?: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}
export declare function sendSuccess<T>(res: Response, data: T, message?: string, statusCode?: number, meta?: ApiResponse['meta']): Response;
export declare function sendCreated<T>(res: Response, data: T, message?: string): Response;
export declare function sendError(res: Response, message: string, statusCode?: number, errors?: unknown): Response;
export declare function sendNotFound(res: Response, message?: string): Response;
export declare function sendUnauthorized(res: Response, message?: string): Response;
export declare function sendForbidden(res: Response, message?: string): Response;
export declare function sendBadRequest(res: Response, message: string, errors?: unknown): Response;
export declare function buildPaginationMeta(total: number, page: number, limit: number): {
    total: number;
    page: number;
    limit: number;
    pages: number;
};
export declare function getPaginationParams(query: Record<string, unknown>): {
    page: number;
    limit: number;
    skip: number;
};
//# sourceMappingURL=response.d.ts.map