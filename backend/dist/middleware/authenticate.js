"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.authorizeMinRole = authorizeMinRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const response_1 = require("../utils/response");
const client_1 = require("@prisma/client");
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        (0, response_1.sendUnauthorized)(res, 'Access token required');
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            (0, response_1.sendUnauthorized)(res, 'Access token expired');
        }
        else {
            (0, response_1.sendUnauthorized)(res, 'Invalid access token');
        }
    }
}
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            (0, response_1.sendUnauthorized)(res);
            return;
        }
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            (0, response_1.sendForbidden)(res, 'You do not have permission to perform this action');
            return;
        }
        next();
    };
}
// Roles hierarchy — higher index = more permissions
const ROLE_HIERARCHY = [
    client_1.UserRole.VIEWER,
    client_1.UserRole.IT_SUPPORT,
    client_1.UserRole.IT_ENGINEER,
    client_1.UserRole.SYSTEM_ADMIN,
    client_1.UserRole.IT_MANAGER,
    client_1.UserRole.SUPER_ADMIN,
];
function authorizeMinRole(minRole) {
    return (req, res, next) => {
        if (!req.user) {
            (0, response_1.sendUnauthorized)(res);
            return;
        }
        const userRoleIndex = ROLE_HIERARCHY.indexOf(req.user.role);
        const minRoleIndex = ROLE_HIERARCHY.indexOf(minRole);
        if (userRoleIndex < minRoleIndex) {
            (0, response_1.sendForbidden)(res, 'Insufficient permissions');
            return;
        }
        next();
    };
}
//# sourceMappingURL=authenticate.js.map