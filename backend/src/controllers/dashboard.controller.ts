import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { getDashboardSummary, getDashboardCharts } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export async function summary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const data = await getDashboardSummary();
  sendSuccess(res, data, 'Dashboard summary');
}

export async function charts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const data = await getDashboardCharts();
  sendSuccess(res, data, 'Dashboard charts');
}
