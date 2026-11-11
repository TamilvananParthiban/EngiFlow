import { Router } from 'express';
import { login, refresh, logout, getProfile } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import 'express-async-errors';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/profile', authenticate, getProfile);

export default router;
