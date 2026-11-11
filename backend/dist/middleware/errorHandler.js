"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = createError;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const env_1 = require("../config/env");
function createError(message, statusCode = 500) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorHandler(err, req, res, _next) {
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Internal server error';
    if (!env_1.env.isProduction) {
        console.error('[Error]', {
            message: err.message,
            stack: err.stack,
            statusCode,
        });
    }
    res.status(statusCode).json({
        success: false,
        message,
        ...(env_1.env.isDevelopment && { stack: err.stack }),
    });
}
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
    });
}
//# sourceMappingURL=errorHandler.js.map