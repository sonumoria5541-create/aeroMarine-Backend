import express from 'express';
import { getPublicPlans, getPlanBySlug } from '../controllers/planController.js';

const router = express.Router();

router.get('/', getPublicPlans);
router.get('/:slug', getPlanBySlug);

export default router;
