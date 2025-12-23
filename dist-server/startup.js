const express = require('express');
const path = require('path');
// Import the main server module
const serverPath = path.join(__dirname, 'server.js');
require(serverPath);
// Serve static files from the dist directory
const app = express();
const distPath = path.join(__dirname, 'dist');
// Serve the built React app
app.use(express.static(distPath));
// Handle React Router - return index.html for all non-API routes
app.get('*', (req, res, next) => {
    // Skip if it's an API route (these are handled by server.ts)
    if (req.path.startsWith('/api') || req.path.startsWith('/__api')) {
        return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
});
export {};
