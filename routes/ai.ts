import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = Router();

const handleGeminiAnalysis = async (req: Request, res: Response) => {
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
          example: 'your-gemini-api-key-here',
        },
      });
    }

    logger.info('Gemini API configured, starting analysis');

    try {
      const mod = await import('../services/geminiAnalysisService.js');
      const analyzeApplication = (mod as any)?.analyzeApplication ?? (mod as any)?.default?.analyzeApplication;

      if (!analyzeApplication) {
        logger.error('Gemini analysis service not found');
        return res.status(500).json({ error: 'Gemini analysis service not found' });
      }

      logger.debug('Invoking Gemini analysis');
      const result = await analyzeApplication(application, factSheet);

      logger.info('Gemini analysis completed successfully');
      return res.json(result);
    } catch (innerErr) {
      const errMsg = innerErr instanceof Error ? innerErr.message : String(innerErr);
      logger.error('Gemini analysis failed', { error: errMsg });

      return res.status(500).json({
        error: 'Gemini analysis failed',
      });
    }
  } catch (err) {
    logger.error('AI analysis error', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Internal server error in AI analysis.' });
  }
};

// Primary endpoint - Gemini AI
router.post('/analyze', requireAuth, requireAdmin, handleGeminiAnalysis);

export default router;
