import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as azureStorage from './services/azureBlobStorageService.js';
import * as foundryService from './services/foundryService.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root into process.env for server-side configuration
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Check if running in Azure (use Azure Storage) or locally (use file system)
const USE_AZURE_STORAGE = process.env.AZURE_STORAGE_CONNECTION_STRING || 
                          process.env.AZURE_STORAGE_ACCOUNT_NAME || 
                          process.env.USE_AZURE_STORAGE === 'true';

console.log(`Environment: ${IS_PRODUCTION ? 'production' : 'development'}`);
console.log(`Storage mode: ${USE_AZURE_STORAGE ? 'Azure Blob Storage' : 'Local File System'}`);

// Local storage setup (for development)
const DATA_DIR = './data';
const APPLICATIONS_DIR = path.join(DATA_DIR, 'applications');
const FACT_SHEETS_DIR = path.join(DATA_DIR, 'fact-sheets');
const ANALYSIS_DIR = path.join(DATA_DIR, 'analysis');

app.use(cors());
app.use(express.json());

// Serve static files in production
if (IS_PRODUCTION) {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  console.log(`Serving static files from: ${distPath}`);
}

// Ensure data directories exist (only for local development)
if (!USE_AZURE_STORAGE) {
  [DATA_DIR, APPLICATIONS_DIR, FACT_SHEETS_DIR, ANALYSIS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Helper function to get file path
const getFilePath = (filename: string) => path.join(DATA_DIR, `${filename}.json`);
const getApplicationPath = (filename: string) => path.join(APPLICATIONS_DIR, `${filename}.json`);
const getFactSheetPath = (filename: string) => path.join(FACT_SHEETS_DIR, `${filename}.json`);
const getAnalysisPath = (filename: string) => path.join(ANALYSIS_DIR, `${filename}.json`);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: IS_PRODUCTION ? 'production' : 'development',
    storageMode: USE_AZURE_STORAGE ? 'azure' : 'local',
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

// Applications Endpoints
app.post('/api/applications', async (req, res) => {
  const { filename, data } = req.body;
  if (!filename || !data) {
    return res.status(400).json({ error: 'Filename and data are required' });
  }

  try {
    if (USE_AZURE_STORAGE) {
      await azureStorage.saveApplication(filename, data);
    } else {
      const filePath = getApplicationPath(filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    res.status(201).json({ message: 'Application saved successfully', filename });
  } catch (err) {
    console.error('Error saving application:', err);
    res.status(500).json({ error: 'Failed to save application' });
  }
});

app.get('/api/applications', async (req, res) => {
  try {
    if (USE_AZURE_STORAGE) {
      const blobNames = await azureStorage.listApplications();
      const applications = await Promise.all(
        blobNames.map(async (blobName) => {
          const filename = blobName.replace('.json', '');
          const data = await azureStorage.loadApplication(filename);
          return { filename, data };
        })
      );
      res.json(applications);
    } else {
      const files = fs.readdirSync(APPLICATIONS_DIR).filter(file => file.endsWith('.json'));
      const applications = files.map(file => {
        const content = fs.readFileSync(path.join(APPLICATIONS_DIR, file), 'utf-8');
        return { filename: file.replace('.json', ''), data: JSON.parse(content) };
      });
      res.json(applications);
    }
  } catch (err) {
    console.error('Error reading applications:', err);
    res.status(500).json({ error: 'Failed to read applications' });
  }
});

app.put('/api/applications/:filename', async (req, res) => {
  const { filename } = req.params;
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ error: 'Data is required' });
  }

  try {
    if (USE_AZURE_STORAGE) {
      const exists = await azureStorage.blobExists('applications', `${filename}.json`);
      if (!exists) {
        return res.status(404).json({ error: 'Application not found' });
      }
      await azureStorage.saveApplication(filename, data);
    } else {
      const filePath = getApplicationPath(filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Application not found' });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    res.json({ message: 'Application updated successfully' });
  } catch (err) {
    console.error('Error updating application:', err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

app.delete('/api/applications/:filename', async (req, res) => {
  const { filename } = req.params;
  
  try {
    if (USE_AZURE_STORAGE) {
      const exists = await azureStorage.blobExists('applications', `${filename}.json`);
      if (!exists) {
        return res.status(404).json({ error: 'Application not found' });
      }
      await azureStorage.deleteApplication(filename);
    } else {
      const filePath = getApplicationPath(filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Application not found' });
      }
      fs.unlinkSync(filePath);
    }
    res.json({ message: 'Application deleted successfully' });
  } catch (err) {
    console.error('Error deleting application:', err);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// Fact Sheets Endpoints
app.post('/api/fact-sheets', async (req, res) => {
  const { filename, data } = req.body;
  if (!filename || !data) {
    return res.status(400).json({ error: 'Filename and data are required' });
  }

  try {
    if (USE_AZURE_STORAGE) {
      await azureStorage.saveFactSheet(filename, data);
    } else {
      const filePath = getFactSheetPath(filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    res.status(201).json({ message: 'Fact sheet saved successfully', filename });
  } catch (err) {
    console.error('Error saving fact sheet:', err);
    res.status(500).json({ error: 'Failed to save fact sheet' });
  }
});

app.get('/api/fact-sheets', async (req, res) => {
  try {
    if (USE_AZURE_STORAGE) {
      const blobNames = await azureStorage.listFactSheets();
      const factSheets = await Promise.all(
        blobNames.map(async (blobName) => {
          const filename = blobName.replace('.json', '');
          const data = await azureStorage.loadFactSheet(filename);
          return { filename, data };
        })
      );
      res.json(factSheets);
    } else {
      const files = fs.readdirSync(FACT_SHEETS_DIR).filter(file => file.endsWith('.json'));
      const factSheets = files.map(file => {
        const content = fs.readFileSync(path.join(FACT_SHEETS_DIR, file), 'utf-8');
        return { filename: file.replace('.json', ''), data: JSON.parse(content) };
      });
      res.json(factSheets);
    }
  } catch (err) {
    console.error('Error reading fact sheets:', err);
    res.status(500).json({ error: 'Failed to read fact sheets' });
  }
});

app.put('/api/fact-sheets/:filename', async (req, res) => {
  const { filename } = req.params;
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ error: 'Data is required' });
  }

  try {
    if (USE_AZURE_STORAGE) {
      const exists = await azureStorage.blobExists('fact-sheets', `${filename}.json`);
      if (!exists) {
        return res.status(404).json({ error: 'Fact sheet not found' });
      }
      await azureStorage.saveFactSheet(filename, data);
    } else {
      const filePath = getFactSheetPath(filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fact sheet not found' });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    res.json({ message: 'Fact sheet updated successfully' });
  } catch (err) {
    console.error('Error updating fact sheet:', err);
    res.status(500).json({ error: 'Failed to update fact sheet' });
  }
});

app.delete('/api/fact-sheets/:filename', async (req, res) => {
  const { filename } = req.params;
  
  try {
    if (USE_AZURE_STORAGE) {
      const exists = await azureStorage.blobExists('fact-sheets', `${filename}.json`);
      if (!exists) {
        return res.status(404).json({ error: 'Fact sheet not found' });
      }
      await azureStorage.deleteFactSheet(filename);
    } else {
      const filePath = getFactSheetPath(filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fact sheet not found' });
      }
      fs.unlinkSync(filePath);
    }
    res.json({ message: 'Fact sheet deleted successfully' });
  } catch (err) {
    console.error('Error deleting fact sheet:', err);
    res.status(500).json({ error: 'Failed to delete fact sheet' });
  }
});

// AI Analysis Endpoints - Store analysis results and prompts
app.post('/api/analysis', async (req, res) => {
  const { filename, data } = req.body;
  if (!filename || !data) {
    return res.status(400).json({ error: 'Filename and data are required' });
  }

  try {
    const analysisWithTimestamp = {
      ...data,
      savedAt: new Date().toISOString()
    };
    
    if (USE_AZURE_STORAGE) {
      await azureStorage.saveAnalysis(filename, analysisWithTimestamp);
    } else {
      const filePath = getAnalysisPath(filename);
      fs.writeFileSync(filePath, JSON.stringify(analysisWithTimestamp, null, 2));
    }
    res.status(201).json({ message: 'Analysis saved successfully', filename });
  } catch (err) {
    console.error('Error saving analysis:', err);
    res.status(500).json({ error: 'Failed to save analysis' });
  }
});

app.get('/api/analysis/:filename', async (req, res) => {
  const { filename } = req.params;
  
  try {
    let data = null;
    if (USE_AZURE_STORAGE) {
      data = await azureStorage.loadAnalysis(filename);
    } else {
      const filePath = getAnalysisPath(filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        data = JSON.parse(content);
      }
    }
    res.json(data);
  } catch (err) {
    console.error(`Error reading analysis file (${filename}):`, err);
    res.status(500).json({ error: 'Failed to read analysis' });
  }
});

app.get('/api/analysis', async (req, res) => {
  try {
    if (USE_AZURE_STORAGE) {
      const blobNames = await azureStorage.listAnalyses();
      const analyses = await Promise.all(
        blobNames.map(async (blobName) => {
          const filename = blobName.replace('.json', '');
          const data = await azureStorage.loadAnalysis(filename);
          return { filename, data };
        })
      );
      res.json(analyses);
    } else {
      const files = fs.readdirSync(ANALYSIS_DIR).filter(file => file.endsWith('.json'));
      const analyses = files.map(file => {
        const content = fs.readFileSync(path.join(ANALYSIS_DIR, file), 'utf-8');
        return { filename: file.replace('.json', ''), data: JSON.parse(content) };
      });
      res.json(analyses);
    }
  } catch (err) {
    console.error('Error reading analysis files:', err);
    res.status(500).json({ error: 'Failed to read analyses' });
  }
});

app.delete('/api/analysis/:filename', async (req, res) => {
  const { filename } = req.params;
  
  try {
    if (USE_AZURE_STORAGE) {
      await azureStorage.deleteAnalysis(filename);
    } else {
      const filePath = getAnalysisPath(filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.json({ message: 'Analysis deleted successfully' });
  } catch (err) {
    console.error(`Error deleting analysis file (${filename}):`, err);
    res.status(500).json({ error: 'Failed to delete analysis' });
  }
});

// Data Storage Endpoints (for JSON persistence via API)
app.get('/api/data/:key', async (req, res) => {
  const { key } = req.params;
  
  try {
    let data = null;
    if (USE_AZURE_STORAGE) {
      data = await azureStorage.loadData(key);
    } else {
      const filePath = getFilePath(key);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        data = JSON.parse(content);
      }
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
    if (USE_AZURE_STORAGE) {
      await azureStorage.saveData(key, data);
    } else {
      const filePath = getFilePath(key);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (err) {
    console.error(`Error writing data file (${key}):`, err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.delete('/api/data/:key', async (req, res) => {
  const { key } = req.params;
  
  try {
    if (USE_AZURE_STORAGE) {
      await azureStorage.deleteData(key);
    } else {
      const filePath = getFilePath(key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.json({ success: true, message: 'Data deleted successfully' });
  } catch (err) {
    console.error(`Error deleting data file (${key}):`, err);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// Serve React app for all other routes (must be before app.listen)
if (IS_PRODUCTION) {
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Storage: ${USE_AZURE_STORAGE ? 'Azure Blob Storage' : 'Local File System'}`);
});

// AI Analysis endpoint - uses Foundry Agents
app.post('/__api/gemini/analyze', async (req, res) => {
  try {
    const { application, factSheet } = req.body || {};
    if (!application) {
      return res.status(400).json({ error: 'Request must include { application, factSheet? } in the JSON body.' });
    }

    const foundryEndpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT;
    if (!foundryEndpoint) {
      return res.status(500).json({ error: 'Foundry not configured. Set AZURE_AI_FOUNDRY_PROJECT_ENDPOINT in .env.local' });
    }

    console.log('[server] Using Foundry Agents for analysis');
    try {
      const mod = await import('./services/foundryAnalysisService.js');
      const analyzeApplication = (mod as any)?.analyzeApplication ?? (mod as any)?.default?.analyzeApplication;
      
      if (!analyzeApplication) {
        return res.status(500).json({ error: 'Foundry analysis service not found' });
      }
      
      const result = await analyzeApplication(application, factSheet);
      return res.json(result);
    } catch (innerErr) {
      console.error('Foundry analysis failed:', innerErr);
      return res.status(500).json({ 
        error: 'Foundry analysis failed', 
        details: innerErr instanceof Error ? innerErr.message : String(innerErr) 
      });
    }
  } catch (err) {
    console.error('AI analysis error:', err);
    return res.status(500).json({ error: 'Internal server error in AI analysis.' });
  }
});

// Foundry Agents chat endpoint: route to one of three agents
app.post('/__api/foundry/:agentKey/chat', async (req, res) => {
  try {
    const { agentKey } = req.params as { agentKey: 'agent1' | 'agent2' | 'agent3' };
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    const result = await foundryService.chatWithAgent(agentKey, prompt);
    return res.json(result);
  } catch (err) {
    console.error('Foundry chat error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});