/**
 * @openapi
 * /applications:
 *   get:
 *     tags: [Applications]
 *     summary: List all applications
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of applications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   filename: { type: string }
 *                   data: { $ref: '#/components/schemas/Application' }
 *       401:
 *         description: Unauthorized
 *   post:
 *     tags: [Applications]
 *     summary: Create a new application
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [filename, data]
 *             properties:
 *               filename: { type: string }
 *               data: { $ref: '#/components/schemas/Application' }
 *     responses:
 *       201:
 *         description: Application created
 *       401:
 *         description: Unauthorized
 *
 * /applications/{filename}:
 *   put:
 *     tags: [Applications]
 *     summary: Update an application
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [data]
 *             properties:
 *               data: { $ref: '#/components/schemas/Application' }
 *     responses:
 *       200:
 *         description: Application updated
 *       404:
 *         description: Application not found
 *   delete:
 *     tags: [Applications]
 *     summary: Delete an application
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Application deleted
 *       404:
 *         description: Application not found
 */
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
