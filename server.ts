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

app.use(cors());
app.use(express.json());

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Helper function to get file path
const getFilePath = (filename: string) => path.join(DATA_DIR, `${filename}.json`);

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

  const filePath = getFilePath(filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.status(201).json({ message: 'Application saved successfully' });
});

app.get('/api/applications', (req, res) => {
  const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
  const applications = files.map(file => {
    const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
    return { filename: file.replace('.json', ''), data: JSON.parse(content) };
  });
  res.json(applications);
});

app.put('/api/applications/:filename', (req, res) => {
  const { filename } = req.params;
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ error: 'Data is required' });
  }

  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Application not found' });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.json({ message: 'Application updated successfully' });
});

app.delete('/api/applications/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = getFilePath(filename);
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

  const filePath = getFilePath(filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.status(201).json({ message: 'Fact sheet saved successfully' });
});

app.get('/api/fact-sheets', (req, res) => {
  const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
  const factSheets = files.map(file => {
    const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
    return { filename: file.replace('.json', ''), data: JSON.parse(content) };
  });
  res.json(factSheets);
});

app.put('/api/fact-sheets/:filename', (req, res) => {
  const { filename } = req.params;
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ error: 'Data is required' });
  }

  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fact sheet not found' });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.json({ message: 'Fact sheet updated successfully' });
});

app.delete('/api/fact-sheets/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fact sheet not found' });
  }

  fs.unlinkSync(filePath);
  res.json({ message: 'Fact sheet deleted successfully' });
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