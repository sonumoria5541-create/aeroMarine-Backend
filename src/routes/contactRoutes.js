import express from 'express';
import { submitContactMessage } from '../controllers/contactController.js';
import { publicLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validation.js';
import { contactSchema } from '../validators/schemas.js';

const router = express.Router();

router.post('/', publicLimiter, validateRequest(contactSchema), submitContactMessage);

export default router;
