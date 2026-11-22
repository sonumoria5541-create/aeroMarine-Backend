import express from 'express';
import { createOrder, getMyPositions, getPositionById } from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { orderSchema } from '../validators/schemas.js';

const router = express.Router();

router.use(authenticate);

router.post('/', validateRequest(orderSchema), createOrder);
router.get('/', getMyPositions);
router.get('/:id', getPositionById);

export default router;
