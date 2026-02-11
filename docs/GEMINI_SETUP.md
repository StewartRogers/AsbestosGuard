# Gemini AI Setup Guide

This guide will help you set up Google Gemini AI for AsbestosGuard's AI analysis features.

## Prerequisites

- Node.js 18 or later
- A Google account
- npm installed

## Step 1: Get Your Gemini API Key

1. Visit the [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Select a Google Cloud project (or create a new one)
5. Copy your API key - you'll need it in the next step

## Step 2: Configure Environment Variables

1. Create a `.env.local` file in the root directory of the project:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

3. (Optional) Configure additional settings:
   ```env
   # Model to use (default: gemini-pro)
   GEMINI_MODEL=gemini-pro
   
   # Server port (default: 5000)
   PORT=5000
   
   # Environment mode
   NODE_ENV=development
   ```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Start the Application

For development:
```bash
npm run start:dev
```

This will start both the Vite development server and the backend server.

For production:
```bash
npm run build
npm run start:prod
```

## Testing the AI Analysis

1. Navigate to the application in your browser (default: http://localhost:5173)
2. Create or open a license application
3. Click "Analyze Application" to test the Gemini AI integration

The analysis will use three AI perspectives:
- **Fact Sheet Analyzer** - Compares employer fact sheets to applications
- **Risk and Policy Analyst** - Performs risk and policy assessment
- **Business Profile Analyst** - Analyzes business profiles and risk factors

## Troubleshooting

### "Gemini API not configured" Error

**Problem:** The application returns an error about Gemini API not being configured.

**Solution:** Ensure your `.env.local` file exists and contains a valid `GEMINI_API_KEY`.

### API Rate Limits

**Problem:** Requests fail due to rate limiting.

**Solution:** Gemini API has rate limits. If you hit them:
- Wait a few minutes before trying again
- Consider upgrading your API quota in Google Cloud Console

### Invalid API Key

**Problem:** Requests fail with "Invalid API key" error.

**Solution:** 
1. Verify your API key is correct in `.env.local`
2. Check that your API key hasn't been revoked
3. Ensure your Google Cloud project has the Generative Language API enabled

## API Models

AsbestosGuard supports the following Gemini models:

- `gemini-pro` (default) - Best for text-only prompts
- `gemini-pro-vision` - For prompts with images

Set the model in `.env.local`:
```env
GEMINI_MODEL=gemini-pro
```

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GEMINI_API_KEY` | Your Gemini API key | - | Yes |
| `GEMINI_MODEL` | Model to use | gemini-pro | No |
| `GEMINI_API_BASE_URL` | API base URL | https://generativelanguage.googleapis.com/v1beta | No |
| `PORT` | Server port | 5000 | No |
| `NODE_ENV` | Environment mode | development | No |

## Data Storage

All data is stored locally in the `./data` directory:
- Applications: `./data/applications/`
- Fact Sheets: `./data/fact-sheets/`
- Analysis Results: `./data/analysis/`

These directories are created automatically when you start the application.

## Security Best Practices

1. **Never commit your `.env.local` file** - It contains sensitive API keys
2. **Keep your API key secret** - Don't share it or expose it in client-side code
3. **Use environment-specific API keys** - Use different keys for development and production
4. **Monitor your API usage** - Check your Google Cloud Console regularly
5. **Set up billing alerts** - To avoid unexpected charges

## Getting Help

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Google AI Studio](https://makersuite.google.com/)
- [AsbestosGuard README](../README.md)
