"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = loginUser;
exports.refreshTokens = refreshTokens;
exports.logoutUser = logoutUser;
exports.hashPassword = hashPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const crypto_1 = __importDefault(require("crypto"));
function generateAccessToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_ACCESS_EXPIRES_IN });
}
function generateRefreshToken() {
    return crypto_1.default.randomBytes(64).toString('hex');
}
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
async function loginUser(payload, ipAddress, userAgent) {
    const user = await database_1.prisma.user.findUnique({
        where: { email: payload.email.toLowerCase().trim() },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            passwordHash: true,
            designation: true,
            avatar: true,
            department: { select: { name: true } },
        },
    });
    if (!user) {
        throw Object.assign(new Error('Invalid email or password'), { statusCode: 401, isOperational: true });
    }
    if (user.status !== 'ACTIVE') {
        throw Object.assign(new Error('Your account has been disabled. Please contact administrator.'), {
            statusCode: 401,
            isOperational: true,
        });
    }
    const isPasswordValid = await bcryptjs_1.default.compare(payload.password, user.passwordHash);
    if (!isPasswordValid) {
        throw Object.assign(new Error('Invalid email or password'), { statusCode: 401, isOperational: true });
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await database_1.prisma.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash,
            expiresAt,
            ipAddress,
            userAgent,
        },
    });
    // Update last login
    await database_1.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    const { passwordHash: _, ...safeUser } = user;
    return {
        user: safeUser,
        tokens: {
            accessToken,
            refreshToken,
            expiresIn: 900, // 15 minutes in seconds
        },
    };
}
async function refreshTokens(refreshToken, ipAddress, userAgent) {
    const tokenHash = hashToken(refreshToken);
    const storedToken = await database_1.prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
    });
    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401, isOperational: true });
    }
    // Revoke old token (token rotation)
    await database_1.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
    });
    const { user } = storedToken;
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await database_1.prisma.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash: newTokenHash,
            expiresAt,
            ipAddress,
            userAgent,
        },
    });
    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
    };
}
async function logoutUser(refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await database_1.prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() },
    });
}
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, 12);
}
//# sourceMappingURL=auth.service.js.map