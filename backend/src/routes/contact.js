import { Router } from 'express';
import { createContact } from '../controllers/contactController.js';
const r = Router();
r.post('/', createContact);
export default r;
