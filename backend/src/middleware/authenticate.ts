import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { sendUnauthorized, sendForbidden } from '../utils/response';
import { UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    sendUnauthorized(res, 'Access token required');
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: UserRole;
      name: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendUnauthorized(res, 'Access token expired');
    } else {
      sendUnauthorized(res, 'Invalid access token');
    }
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      sendForbidden(res, 'You do not have permission to perform this action');
      return;
    }

    next();
  };
}

// Roles hierarchy — higher index = more permissions
const ROLE_HIERARCHY: UserRole[] = [
  UserRole.VIEWER,
  UserRole.IT_SUPPORT,
  UserRole.IT_ENGINEER,
  UserRole.SYSTEM_ADMIN,
  UserRole.IT_MANAGER,
  UserRole.SUPER_ADMIN,
];

export function authorizeMinRole(minRole: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userRoleIndex = ROLE_HIERARCHY.indexOf(req.user.role);
    const minRoleIndex = ROLE_HIERARCHY.indexOf(minRole);

    if (userRoleIndex < minRoleIndex) {
      sendForbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
}
