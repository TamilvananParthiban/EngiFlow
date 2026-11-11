import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import activitiesRoutes from './activities.routes';
import tasksRoutes from './tasks.routes';
import ticketsRoutes from './tickets.routes';
import assetsRoutes from './assets.routes';
import vendorsRoutes from './vendors.routes';
import { invoiceRouter, paymentRouter } from './billing.routes';
import { amcRouter, pmRouter } from './amc.routes';
import { ispRouter, networkRouter } from './network.routes';
import cctvRoutes from './cctv.routes';
import { followupRouter, expenseRouter, rentalRouter } from './operations.routes';
import {
  searchRouter, notifRouter, usersRouter, auditRouter,
  deptRouter, locRouter, kpiRouter, calendarRouter,
} from './misc.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/activities', activitiesRoutes);
router.use('/tasks', tasksRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/assets', assetsRoutes);
router.use('/vendors', vendorsRoutes);
router.use('/invoices', invoiceRouter);
router.use('/payments', paymentRouter);
router.use('/rentals', rentalRouter);
router.use('/amc', amcRouter);
router.use('/maintenance', pmRouter);
router.use('/isp', ispRouter);
router.use('/network', networkRouter);
router.use('/cctv', cctvRoutes);
router.use('/followups', followupRouter);
router.use('/expenses', expenseRouter);
router.use('/search', searchRouter);
router.use('/notifications', notifRouter);
router.use('/users', usersRouter);
router.use('/audit', auditRouter);
router.use('/departments', deptRouter);
router.use('/locations', locRouter);
router.use('/kpi', kpiRouter);
router.use('/calendar', calendarRouter);

export default router;
