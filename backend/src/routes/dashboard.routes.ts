import { Router } from 'express';
import { summary, charts } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/authenticate';
import 'express-async-errors';

const router = Router();

router.use(authenticate);
router.get('/summary', summary);
router.get('/charts', charts);

export default router;
