import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { UserRole } from '@prisma/client';
import crypto from 'crypto';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function generateAccessToken(user: { id: string; email: string; role: UserRole; name: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions,
  );
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function loginUser(
  payload: LoginPayload,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ user: Record<string, unknown>; tokens: TokenPair }> {
  const user = await prisma.user.findUnique({
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

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isPasswordValid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401, isOperational: true });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  // Update last login
  await prisma.user.update({
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

export async function refreshTokens(
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<TokenPair> {
  const tokenHash = hashToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401, isOperational: true });
  }

  // Revoke old token (token rotation)
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const { user } = storedToken;
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
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

export async function logoutUser(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
