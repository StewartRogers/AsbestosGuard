import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import dotenv from 'dotenv';

// Load .env.local from project root into process.env for server-side configuration
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
const PORT = 5000;
const DATA_DIR = './data';
const APPLICATIONS_DIR = path.join(DATA_DIR, 'applications');
const FACT_SHEETS_DIR = path.join(DATA_DIR, 'fact-sheets');
const ANALYSIS_DIR = path.join(DATA_DIR, 'analysis');

app.use(cors());
app.use(express.json());

// Ensure data directories exist
[DATA_DIR, APPLICATIONS_DIR, FACT_SHEETS_DIR, ANALYSIS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper function to get file path
const getFilePath = (filename: string) => path.join(DATA_DIR, `${filename}.json`);
const getApplicationPath = (filename: string) => path.join(APPLICATIONS_DIR, `${filename}.json`);
const getFactSheetPath = (filename: string) => path.join(FACT_SHEETS_DIR, `${filename}.json`);
const getAnalysisPath = (filename: string) => path.join(ANALYSIS_DIR, `${filename}.json`);

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

// Applications Endpoints
app.post('/api/applications', (req, res) => {
  const { filename, data } = req.body;
  if (!filename || !data) {
    return res.status(400).json({ error: 'Filename and data are required' });
  }

  const filePath = getApplicationPath(filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.status(201).json({ message: 'Application saved successfully', filename });
});

app.get('/api/applications', (req, res) => {
  try {
    const files = fs.readdirSync(APPLICATIONS_DIR).filter(file => file.endsWith('.json'));
    const applications = files.map(file => {
      const content = fs.readFileSync(path.join(APPLICATIONS_DIR, file), 'utf-8');
      return { filename: file.replace('.json', ''), data: JSON.parse(content) };
    });
    res.json(applications);
  } catch (err) {
    console.error('Error reading applications:', err);
    res.status(500).json({ error: 'Failed to read applications' });
  }
});

app.put('/api/applications/:filename', (req, res) => {
  const { filename } = req.params;
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ error: 'Data is required' });
  }

  const filePath = getApplicationPath(filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Application not found' });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.json({ message: 'Application updated successfully' });
});

app.delete('/api/applications/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = getApplicationPath(filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Application not found' });
  }

  fs.unlinkSync(filePath);
  res.json({ message: 'Application deleted successfully' });
});

// Fact Sheets Endpoints
app.post('/api/fact-sheets', (req, res) => {
  const { filename, data } = req.body;
  if (!filename || !data) {
    return res.status(400).json({ error: 'Filename and data are required' });
  }

  const filePath = getFactSheetPath(filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.status(201).json({ message: 'Fact sheet saved successfully', filename });
});

app.get('/api/fact-sheets', (req, res) => {
  try {
    const files = fs.readdirSync(FACT_SHEETS_DIR).filter(file => file.endsWith('.json'));
    const factSheets = files.map(file => {
      const content = fs.readFileSync(path.join(FACT_SHEETS_DIR, file), 'utf-8');
      return { filename: file.replace('.json', ''), data: JSON.parse(content) };
    });
    res.json(factSheets);
  } catch (err) {
    console.error('Error reading fact sheets:', err);
    res.status(500).json({ error: 'Failed to read fact sheets' });
  }
});

app.put('/api/fact-sheets/:filename', (req, res) => {
  const { filename } = req.params;
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ error: 'Data is required' });
  }

  const filePath = getFactSheetPath(filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fact sheet not found' });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.json({ message: 'Fact sheet updated successfully' });
});

app.delete('/api/fact-sheets/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = getFactSheetPath(filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fact sheet not found' });
  }

  fs.unlinkSync(filePath);
  res.json({ message: 'Fact sheet deleted successfully' });
});

// AI Analysis Endpoints - Store analysis results and prompts
app.post('/api/analysis', (req, res) => {
  const { filename, data } = req.body;
  if (!filename || !data) {
    return res.status(400).json({ error: 'Filename and data are required' });
  }

  const filePath = getAnalysisPath(filename);
  // Ensure analysis includes timestamp
  const analysisWithTimestamp = {
    ...data,
    savedAt: new Date().toISOString()
  };
  fs.writeFileSync(filePath, JSON.stringify(analysisWithTimestamp, null, 2));
  res.status(201).json({ message: 'Analysis saved successfully', filename });
});

app.get('/api/analysis/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = getAnalysisPath(filename);
  
  if (!fs.existsSync(filePath)) {
    return res.json(null);
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (err) {
    console.error(`Error reading analysis file (${filename}):`, err);
    res.status(500).json({ error: 'Failed to read analysis' });
  }
});

app.get('/api/analysis', (req, res) => {
  try {
    const files = fs.readdirSync(ANALYSIS_DIR).filter(file => file.endsWith('.json'));
    const analyses = files.map(file => {
      const content = fs.readFileSync(path.join(ANALYSIS_DIR, file), 'utf-8');
      return { filename: file.replace('.json', ''), data: JSON.parse(content) };
    });
    res.json(analyses);
  } catch (err) {
    console.error('Error reading analysis files:', err);
    res.status(500).json({ error: 'Failed to read analyses' });
  }
});

app.delete('/api/analysis/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = getAnalysisPath(filename);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      res.json({ message: 'Analysis deleted successfully' });
    } catch (err) {
      console.error(`Error deleting analysis file (${filename}):`, err);
      return res.status(500).json({ error: 'Failed to delete analysis' });
    }
  } else {
    res.json({ message: 'Analysis file not found' });
  }
});

// Data Storage Endpoints (for JSON persistence via API)
app.get('/api/data/:key', (req, res) => {
  const { key } = req.params;
  const filePath = getFilePath(key);
  
  if (!fs.existsSync(filePath)) {
    return res.json(null);
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (err) {
    console.error(`Error reading data file (${key}):`, err);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/data/:key', (req, res) => {
  const { key } = req.params;
  const { data } = req.body;
  const filePath = getFilePath(key);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (err) {
    console.error(`Error writing data file (${key}):`, err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.delete('/api/data/:key', (req, res) => {
  const { key } = req.params;
  const filePath = getFilePath(key);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`Error deleting data file (${key}):`, err);
      return res.status(500).json({ error: 'Failed to delete data' });
    }
  }
  
  res.json({ success: true, message: 'Data deleted successfully' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Simple proxy endpoint for AI analysis diagnostics.
// If an API key is configured in the server environment, you can extend
// this endpoint to call the actual model provider. For now it returns
// helpful messages guiding local configuration.
app.post('/__api/gemini/analyze', async (req, res) => {
  try {
    const key = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) {
      return res.status(500).json({ error: 'AI API key not configured on the server. Set environment variable API_KEY, GEMINI_API_KEY, GOOGLE_API_KEY, or OPENAI_API_KEY and restart the server.' });
    }

    // Defer to the shared server-side analysis implementation if available.
      try {
        // Dynamically import the analysis function to work in ESM runtime
        const mod = await import('./services/geminiService');
        const analyzeApplication = (mod as any)?.analyzeApplication ?? (mod as any)?.default?.analyzeApplication;

        const { application, factSheet } = req.body || {};
        if (!application) return res.status(400).json({ error: 'Request must include { application, factSheet? } in the JSON body.' });

        if (!analyzeApplication) {
          return res.status(500).json({ error: 'Server-side analysis function not found. Check services/geminiService export.' });
        }

        const result = await analyzeApplication(application, factSheet);
        return res.json(result);
      } catch (innerErr) {
        console.error('Failed to run server-side analysis:', innerErr);
        return res.status(500).json({ error: 'Server-side analysis failed', details: innerErr instanceof Error ? innerErr.message : String(innerErr) });
      }
  } catch (err) {
    console.error('AI proxy error:', err);
    return res.status(500).json({ error: 'Internal server error in AI proxy.' });
  }
});