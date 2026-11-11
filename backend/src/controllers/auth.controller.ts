import { Request, Response } from 'express';
import { loginUser, refreshTokens, logoutUser } from '../services/auth.service';
import { sendSuccess, sendBadRequest } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function login(req: Request, res: Response): Promise<void> {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    sendBadRequest(res, 'Validation failed', result.error.format());
    return;
  }

  const { user, tokens } = await loginUser(result.data, req.ip, req.headers['user-agent']);

  sendSuccess(res, { user, tokens }, 'Login successful');
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const result = refreshSchema.safeParse(req.body);
  if (!result.success) {
    sendBadRequest(res, 'Validation failed', result.error.format());
    return;
  }

  const tokens = await refreshTokens(result.data.refreshToken, req.ip, req.headers['user-agent']);
  sendSuccess(res, { tokens }, 'Token refreshed');
}

export async function logout(req: Request, res: Response): Promise<void> {
  const result = refreshSchema.safeParse(req.body);
  if (result.success) {
    await logoutUser(result.data.refreshToken);
  }
  sendSuccess(res, null, 'Logged out successfully');
}

export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { prisma } = await import('../config/database');
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
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
  sendSuccess(res, user);
}
