import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

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