import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sanitizeFilename } from '../utils/validators.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

const ANALYSIS_DIR = path.join('./data', 'analysis');

const getAnalysisPath = (filename: string) => {
  const clean = sanitizeFilename(filename);
  return path.join(ANALYSIS_DIR, `${clean}.json`);
};

// Save analysis (admin only)
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
    const analysisWithTimestamp = {
      ...data,
      savedAt: new Date().toISOString(),
    };

    const filePath = getAnalysisPath(filename);
    fs.writeFileSync(filePath, JSON.stringify(analysisWithTimestamp, null, 2));
    res.status(201).json({ message: 'Analysis saved successfully', filename });
  })
);

// Get specific analysis (admin only)
router.get('/:filename',
  requireAuth,
  requireAdmin,
  [param('filename').isString().trim().notEmpty()],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { filename } = req.params;
    const filePath = getAnalysisPath(filename);

    let data = null;
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(content);
    }

    res.json(data);
  })
);

// List all analyses (admin only)
router.get('/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const files = fs.readdirSync(ANALYSIS_DIR).filter(file => file.endsWith('.json'));
    const analyses = files.map(file => {
      const content = fs.readFileSync(path.join(ANALYSIS_DIR, file), 'utf-8');
      return { filename: file.replace('.json', ''), data: JSON.parse(content) };
    });
    res.json(analyses);
  })
);

// Delete analysis (admin only)
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
    const filePath = getAnalysisPath(filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'Analysis deleted successfully' });
  })
);

export default router;
