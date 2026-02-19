import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeFilename } from '../utils/validators.js';
import logger from '../utils/logger.js';

const router = Router();

const DATA_DIR = './data';

const getFilePath = (filename: string) => {
  const clean = sanitizeFilename(filename);
  return path.join(DATA_DIR, `${clean}.json`);
};

// Read data by key
router.get('/:key', requireAuth, async (req: Request, res: Response) => {
  const { key } = req.params;

  try {
    let data = null;
    const filePath = getFilePath(key);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(content);
    }
    res.json(data);
  } catch (err) {
    logger.error('Error reading data file', { key, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Write data by key
router.post('/:key', requireAuth, async (req: Request, res: Response) => {
  const { key } = req.params;
  const { data } = req.body;

  try {
    const filePath = getFilePath(key);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (err) {
    logger.error('Error writing data file', { key, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Delete data by key
router.delete('/:key', requireAuth, async (req: Request, res: Response) => {
  const { key } = req.params;

  try {
    const filePath = getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ success: true, message: 'Data deleted successfully' });
  } catch (err) {
    logger.error('Error deleting data file', { key, error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

export default router;
