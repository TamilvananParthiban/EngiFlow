"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendCreated = sendCreated;
exports.sendError = sendError;
exports.sendNotFound = sendNotFound;
exports.sendUnauthorized = sendUnauthorized;
exports.sendForbidden = sendForbidden;
exports.sendBadRequest = sendBadRequest;
exports.buildPaginationMeta = buildPaginationMeta;
exports.getPaginationParams = getPaginationParams;
function sendSuccess(res, data, message = 'Success', statusCode = 200, meta) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        ...(meta ? { meta } : {}),
    });
}
function sendCreated(res, data, message = 'Created successfully') {
    return sendSuccess(res, data, message, 201);
}
function sendError(res, message, statusCode = 500, errors) {
    return res.status(statusCode).json({
        success: false,
        message,
        ...(errors !== undefined ? { errors } : {}),
    });
}
function sendNotFound(res, message = 'Resource not found') {
    return sendError(res, message, 404);
}
function sendUnauthorized(res, message = 'Unauthorized') {
    return sendError(res, message, 401);
}
function sendForbidden(res, message = 'Forbidden') {
    return sendError(res, message, 403);
}
function sendBadRequest(res, message, errors) {
    return sendError(res, message, 400, errors);
}
function buildPaginationMeta(total, page, limit) {
    return {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
    };
}
function getPaginationParams(query) {
    const page = Math.max(1, parseInt(String(query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
//# sourceMappingURL=response.js.map