import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { body, param, validationResult } from 'express-validator';

// Import authentication and error handling middleware
import { requireAuth, requireAdmin } from './middleware/auth.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';
import { sanitizeFilename } from './utils/validators.js';
import { ValidationError, NotFoundError } from './utils/errors.js';

// Import routes
import authRoutes from './routes/auth.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root into process.env for server-side configuration
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

console.log(`Environment: ${IS_PRODUCTION ? 'production' : 'development'}`);
console.log(`Storage mode: Local File System`);

// Local storage setup (for development)
const DATA_DIR = './data';
const APPLICATIONS_DIR = path.join(DATA_DIR, 'applications');
const FACT_SHEETS_DIR = path.join(DATA_DIR, 'fact-sheets');
const ANALYSIS_DIR = path.join(DATA_DIR, 'analysis');

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true,
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

// Body parser and cookie parser
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Serve static files in production
if (IS_PRODUCTION) {
  // When compiled to dist-server/server.js, __dirname is dist-server
  // So go up one level to find dist/
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  console.log(`Serving static files from: ${distPath}`);
}

// Ensure data directories exist
[DATA_DIR, APPLICATIONS_DIR, FACT_SHEETS_DIR, ANALYSIS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper functions to get file paths with sanitization
const getFilePath = (filename: string) => {
  const clean = sanitizeFilename(filename);
  return path.join(DATA_DIR, `${clean}.json`);
};

const getApplicationPath = (filename: string) => {
  const clean = sanitizeFilename(filename);
  return path.join(APPLICATIONS_DIR, `${clean}.json`);
};

const getFactSheetPath = (filename: string) => {
  const clean = sanitizeFilename(filename);
  return path.join(FACT_SHEETS_DIR, `${clean}.json`);
};

const getAnalysisPath = (filename: string) => {
  const clean = sanitizeFilename(filename);
  return path.join(ANALYSIS_DIR, `${clean}.json`);
};

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: IS_PRODUCTION ? 'production' : 'development',
    storageMode: 'local',
    aiProvider: 'gemini',
    uptime: process.uptime()
  };
  res.status(200).json(health);
});

// Policies endpoint: read .docx files from ./docs and extract text
app.get('/api/policies', async (req, res) => {
  try {
    const docsDir = path.join(process.cwd(), 'docs');
    if (!fs.existsSync(docsDir)) return res.json({ policies: [], combinedText: '' });

    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.docx'));
    const policies: { filename: string; text: string }[] = [];

    for (const file of files) {
      const filePath = path.join(docsDir, file);
      try {
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value || '';
        policies.push({ filename: file, text });
      } catch (err) {
        console.error('Failed to extract policy file', file, err);
      }
    }

    const combinedText = policies.map(p => `--- ${p.filename} ---\n${p.text}`).join('\n\n');
    res.json({ policies, combinedText });
  } catch (err) {
    console.error('Failed to load policies:', err);
    res.status(500).json({ error: 'Failed to load policies' });
  }
});

// ============================================================================
// APPLICATIONS ENDPOINTS (Protected - Requires Authentication)
// ============================================================================

app.post('/api/applications',
  requireAuth,
  [
    body('filename').isString().trim().notEmpty().withMessage('Filename is required'),
    body('data').isObject().withMessage('Data must be an object'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { filename, data } = req.body;
    const filePath = getApplicationPath(filename); // sanitization happens inside
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.status(201).json({ message: 'Application saved successfully', filename });
  })
);

app.get('/api/applications',
  requireAuth,
  asyncHandler(async (req, res) => {
    const files = fs.readdirSync(APPLICATIONS_DIR).filter(file => file.endsWith('.json'));
    const applications = files.map(file => {
      const content = fs.readFileSync(path.join(APPLICATIONS_DIR, file), 'utf-8');
      return { filename: file.replace('.json', ''), data: JSON.parse(content) };
    });
    res.json(applications);
  })
);

app.put('/api/applications/:filename',
  requireAuth,
  [
    param('filename').isString().trim().notEmpty(),
    body('data').isObject().withMessage('Data must be an object'),
  ],
  asyncHandler(async (req, res) => {
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

app.delete('/api/applications/:filename',
  requireAuth,
  [param('filename').isString().trim().notEmpty()],
  asyncHandler(async (req, res) => {
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

// ============================================================================
// FACT SHEETS ENDPOINTS (Admin Only)
// ============================================================================

app.post('/api/fact-sheets',
  requireAuth,
  requireAdmin,
  [
    body('filename').isString().trim().notEmpty(),
    body('data').isObject(),
  ],
  asyncHandler(async (req, res) => {
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

app.get('/api/fact-sheets',
  requireAuth,
  asyncHandler(async (req, res) => {
    const files = fs.readdirSync(FACT_SHEETS_DIR).filter(file => file.endsWith('.json'));
    const factSheets = files.map(file => {
      const content = fs.readFileSync(path.join(FACT_SHEETS_DIR, file), 'utf-8');
      return { filename: file.replace('.json', ''), data: JSON.parse(content) };
    });
    res.json(factSheets);
  })
);

app.put('/api/fact-sheets/:filename',
  requireAuth,
  requireAdmin,
  [
    param('filename').isString().trim().notEmpty(),
    body('data').isObject(),
  ],
  asyncHandler(async (req, res) => {
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

app.delete('/api/fact-sheets/:filename',
  requireAuth,
  requireAdmin,
  [param('filename').isString().trim().notEmpty()],
  asyncHandler(async (req, res) => {
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

// ============================================================================
// AI ANALYSIS ENDPOINTS (Admin Only)
// ============================================================================

app.post('/api/analysis',
  requireAuth,
  requireAdmin,
  [
    body('filename').isString().trim().notEmpty(),
    body('data').isObject(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { filename, data } = req.body;
    const analysisWithTimestamp = {
      ...data,
      savedAt: new Date().toISOString()
    };

    const filePath = getAnalysisPath(filename);
    fs.writeFileSync(filePath, JSON.stringify(analysisWithTimestamp, null, 2));
    res.status(201).json({ message: 'Analysis saved successfully', filename });
  })
);

app.get('/api/analysis/:filename',
  requireAuth,
  requireAdmin,
  [param('filename').isString().trim().notEmpty()],
  asyncHandler(async (req, res) => {
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

app.get('/api/analysis',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const files = fs.readdirSync(ANALYSIS_DIR).filter(file => file.endsWith('.json'));
    const analyses = files.map(file => {
      const content = fs.readFileSync(path.join(ANALYSIS_DIR, file), 'utf-8');
      return { filename: file.replace('.json', ''), data: JSON.parse(content) };
    });
    res.json(analyses);
  })
);

app.delete('/api/analysis/:filename',
  requireAuth,
  requireAdmin,
  [param('filename').isString().trim().notEmpty()],
  asyncHandler(async (req, res) => {
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

// Data Storage Endpoints (for JSON persistence via API)
app.get('/api/data/:key', async (req, res) => {
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
    console.error(`Error reading data file (${key}):`, err);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/data/:key', async (req, res) => {
  const { key } = req.params;
  const { data } = req.body;
  
  try {
    const filePath = getFilePath(key);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (err) {
    console.error(`Error writing data file (${key}):`, err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.delete('/api/data/:key', async (req, res) => {
  const { key } = req.params;
  
  try {
    const filePath = getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ success: true, message: 'Data deleted successfully' });
  } catch (err) {
    console.error(`Error deleting data file (${key}):`, err);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// Serve React app for all other routes (must be before app.listen)
// Only serve index.html for non-API routes
if (IS_PRODUCTION) {
  app.use((req, res, next) => {
    // Skip API routes - don't serve index.html, let Express return 404 if route not found
    if (req.path.startsWith('/api/') || req.path.startsWith('/__api/')) {
      return next();
    }
    // When compiled to dist-server/server.js, __dirname is dist-server
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Storage: Local File System`);
  console.log(`AI Provider: Gemini`);
});

// AI Analysis endpoint - uses Gemini API
const handleGeminiAnalysis = async (req: any, res: any) => {
  try {
    const { application, factSheet } = req.body || {};
    if (!application) {
      return res.status(400).json({ error: 'Request must include { application, factSheet? } in the JSON body.' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ 
        error: 'Gemini API not configured',
        hint: 'Set GEMINI_API_KEY in .env.local',
        details: {
          missingVar: 'GEMINI_API_KEY',
          example: 'your-gemini-api-key-here'
        }
      });
    }

    console.log('[server] ✅ Gemini API configured');
    console.log('[server] 📤 Starting analysis with Gemini AI');
    
    try {
      const mod = await import('./services/geminiAnalysisService.js');
      const analyzeApplication = (mod as any)?.analyzeApplication ?? (mod as any)?.default?.analyzeApplication;
      
      if (!analyzeApplication) {
        console.error('[server] ❌ Gemini analysis service not found');
        return res.status(500).json({ error: 'Gemini analysis service not found' });
      }
      
      console.log('[server] 🔍 Invoking analysis...');
      const result = await analyzeApplication(application, factSheet);
      
      console.log('[server] ✅ Analysis completed successfully');
      return res.json(result);
    } catch (innerErr) {
      const errMsg = innerErr instanceof Error ? innerErr.message : String(innerErr);
      console.error('[server] ❌ Gemini analysis failed:', errMsg);
      
      return res.status(500).json({ 
        error: 'Gemini analysis failed',
        details: errMsg 
      });
    }
  } catch (err) {
    console.error('[server] ❌ AI analysis error:', err);
    return res.status(500).json({ error: 'Internal server error in AI analysis.' });
  }
};

// ============================================================================
// GEMINI AI ANALYSIS ENDPOINT (Admin Only)
// ============================================================================

// Primary endpoint - Gemini AI
app.post('/__api/gemini/analyze', requireAuth, requireAdmin, handleGeminiAnalysis);

// Legacy endpoint for backward compatibility (redirects to Gemini)
app.post('/__api/foundry/analyze', requireAuth, requireAdmin, handleGeminiAnalysis);

// ============================================================================
// ERROR HANDLER (Must be last middleware)
// ============================================================================

app.use(errorHandler);