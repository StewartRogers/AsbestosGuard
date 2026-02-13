import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sanitizeFilename } from '../utils/validators.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const router = Router();

const FACT_SHEETS_DIR = path.join('./data', 'fact-sheets');

const getFactSheetPath = (filename: string) => {
  const clean = sanitizeFilename(filename);
  return path.join(FACT_SHEETS_DIR, `${clean}.json`);
};

// Create fact sheet (admin only)
router.post('/',
  requireAuth,
  requireAdmin,
  [
    body('filename').isString().trim().notEmpty(),
    body('data').isObject(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { filename, data } = req.body;
    const filePath = getFactSheetPath(filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.status(201).json({ message: 'Fact sheet saved successfully', filename });
  })
);

// List all fact sheets
router.get('/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const files = fs.readdirSync(FACT_SHEETS_DIR).filter(file => file.endsWith('.json'));
    const factSheets = files.map(file => {
      const content = fs.readFileSync(path.join(FACT_SHEETS_DIR, file), 'utf-8');
      return { filename: file.replace('.json', ''), data: JSON.parse(content) };
    });
    res.json(factSheets);
  })
);

// Update fact sheet (admin only)
router.put('/:filename',
  requireAuth,
  requireAdmin,
  [
    param('filename').isString().trim().notEmpty(),
    body('data').isObject(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { filename } = req.params;
    const { data } = req.body;
    const filePath = getFactSheetPath(filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Fact sheet');
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ message: 'Fact sheet updated successfully' });
  })
);

// Delete fact sheet (admin only)
router.delete('/:filename',
  requireAuth,
  requireAdmin,
  [param('filename').isString().trim().notEmpty()],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { filename } = req.params;
    const filePath = getFactSheetPath(filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Fact sheet');
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'Fact sheet deleted successfully' });
  })
);

export default router;
