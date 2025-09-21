import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import multer from 'multer';
import { Book } from '../../models/Book.js';
import slugify from 'slugify';

export const upload = multer({ dest: 'tmp_uploads' });

export async function importBooksCSV(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Missing file' });
  const filePath = req.file.path;
  const results = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  // Minimal columns: title, price
  let created = 0;
  for (const r of results) {
    if (!r.title) continue;
    await Book.create({
      title: r.title,
      slug: slugify(r.title, { lower: true }),
      price: Number(r.price || 0),
      description: r.description || ''
    });
    created++;
  }
  fs.unlink(filePath, () => {});
  res.json({ created });
}
