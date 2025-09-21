import { Contact } from '../models/Contact.js';
export async function createContact(req, res) {
  const { name, email, subject, message } = req.body;
  const c = await Contact.create({ name, email, subject, message, status: 'new' });
  res.status(201).json(c);
}
