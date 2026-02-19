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
import swaggerUi from 'swagger-ui-express';

// Import middleware and utilities
import { errorHandler } from './middleware/errorHandler.js';
import { auditLog } from './middleware/auditLog.js';
import { swaggerSpec } from './utils/openapi.js';
import logger from './utils/logger.js';

// Import routes
import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import factSheetRoutes from './routes/factSheets.js';
import analysisRoutes from './routes/analysis.js';
import dataRoutes from './routes/data.js';
import aiRoutes from './routes/ai.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root into process.env for server-side configuration
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

logger.info('Server initializing', { environment: IS_PRODUCTION ? 'production' : 'development', storage: 'Local File System' });

// ============================================================================
// DATA DIRECTORIES
// ============================================================================

const DATA_DIR = './data';
const APPLICATIONS_DIR = path.join(DATA_DIR, 'applications');
const FACT_SHEETS_DIR = path.join(DATA_DIR, 'fact-sheets');
const ANALYSIS_DIR = path.join(DATA_DIR, 'analysis');

[DATA_DIR, APPLICATIONS_DIR, FACT_SHEETS_DIR, ANALYSIS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

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

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
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
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true,
});

// Strict limiter for expensive AI analysis calls
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'AI analysis rate limit exceeded, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/__api/gemini', aiLimiter);
app.use('/__api/foundry', aiLimiter);

// Body parser and cookie parser
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(auditLog);

// Serve static files in production
if (IS_PRODUCTION) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  logger.info('Serving static files', { path: distPath });
}

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: IS_PRODUCTION ? 'production' : 'development',
    storageMode: 'local',
    aiProvider: 'gemini',
    uptime: process.uptime(),
  });
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
        policies.push({ filename: file, text: result.value || '' });
      } catch (err) {
        logger.error('Failed to extract policy file', { file, error: err instanceof Error ? err.message : String(err) });
      }
    }

    const combinedText = policies.map(p => `--- ${p.filename} ---\n${p.text}`).join('\n\n');
    res.json({ policies, combinedText });
  } catch (err) {
    logger.error('Failed to load policies', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Failed to load policies' });
  }
});

// API documentation (not exposed in production)
if (!IS_PRODUCTION) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
  logger.info('API docs available at /api-docs');
}

// Mount route groups
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/fact-sheets', factSheetRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/data', dataRoutes);
app.use('/__api/gemini', aiRoutes);

// Legacy endpoint for backward compatibility
app.post('/__api/foundry/analyze', (req, res, next) => {
  req.url = '/analyze';
  aiRoutes(req, res, next);
});

// ============================================================================
// SPA FALLBACK & ERROR HANDLER
// ============================================================================

if (IS_PRODUCTION) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/__api/')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    storage: 'Local File System',
    aiProvider: 'Gemini',
  });
});
