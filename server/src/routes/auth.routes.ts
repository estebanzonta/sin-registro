import { Router } from 'express';
import { register, login, me } from '../controllers/auth.controller.js';
import { verifyAuth } from '../middleware/auth.js';

export const authRoutes = Router();

// Public routes
authRoutes.post('/register', register);
authRoutes.post('/login', login);

// Protected routes
authRoutes.get('/me', verifyAuth, me);
