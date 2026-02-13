import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { body, param, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sanitizeFilename } from '../utils/validators.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const router = Router();

const APPLICATIONS_DIR = path.join('./data', 'applications');

const getApplicationPath = (filename: string) => {
  const clean = sanitizeFilename(filename);
  return path.join(APPLICATIONS_DIR, `${clean}.json`);
};

// Create application
router.post('/',
  requireAuth,
  [
    body('filename').isString().trim().notEmpty().withMessage('Filename is required'),
    body('data').isObject().withMessage('Data must be an object'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { filename, data } = req.body;
    const filePath = getApplicationPath(filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.status(201).json({ message: 'Application saved successfully', filename });
  })
);

// List all applications
router.get('/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const files = fs.readdirSync(APPLICATIONS_DIR).filter(file => file.endsWith('.json'));
    const applications = files.map(file => {
      const content = fs.readFileSync(path.join(APPLICATIONS_DIR, file), 'utf-8');
      return { filename: file.replace('.json', ''), data: JSON.parse(content) };
    });
    res.json(applications);
  })
);

// Update application
router.put('/:filename',
  requireAuth,
  [
    param('filename').isString().trim().notEmpty(),
    body('data').isObject().withMessage('Data must be an object'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { filename } = req.params;
    const { data } = req.body;
    const filePath = getApplicationPath(filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Application');
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ message: 'Application updated successfully' });
  })
);

// Delete application
router.delete('/:filename',
  requireAuth,
  [param('filename').isString().trim().notEmpty()],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { filename } = req.params;
    const filePath = getApplicationPath(filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Application');
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'Application deleted successfully' });
  })
);

export default router;
