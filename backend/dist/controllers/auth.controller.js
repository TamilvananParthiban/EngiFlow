"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.getProfile = getProfile;
const auth_service_1 = require("../services/auth.service");
const response_1 = require("../utils/response");
const zod_1 = require("zod");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
async function login(req, res) {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const { user, tokens } = await (0, auth_service_1.loginUser)(result.data, req.ip, req.headers['user-agent']);
    (0, response_1.sendSuccess)(res, { user, tokens }, 'Login successful');
}
async function refresh(req, res) {
    const result = refreshSchema.safeParse(req.body);
    if (!result.success) {
        (0, response_1.sendBadRequest)(res, 'Validation failed', result.error.format());
        return;
    }
    const tokens = await (0, auth_service_1.refreshTokens)(result.data.refreshToken, req.ip, req.headers['user-agent']);
    (0, response_1.sendSuccess)(res, { tokens }, 'Token refreshed');
}
async function logout(req, res) {
    const result = refreshSchema.safeParse(req.body);
    if (result.success) {
        await (0, auth_service_1.logoutUser)(result.data.refreshToken);
    }
    (0, response_1.sendSuccess)(res, null, 'Logged out successfully');
}
async function getProfile(req, res) {
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database')));
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            role: true,
            status: true,
            phone: true,
            designation: true,
            avatar: true,
            lastLoginAt: true,
            department: { select: { id: true, name: true } },
        },
    });
    (0, response_1.sendSuccess)(res, user);
}
//# sourceMappingURL=auth.controller.js.map