import { Router } from 'express';
import { subscribe, unsubscribe } from '../controllers/newsletterController.js';
const r = Router();
r.post('/subscribe', subscribe);
r.post('/unsubscribe', unsubscribe);
export default r;
