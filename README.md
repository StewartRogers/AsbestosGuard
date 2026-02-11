# AsbestosGuard

AsbestosGuard is a licensing and compliance portal for asbestos-related services, built with React, TypeScript, and Gemini AI.

## Quick Start

### Prerequisites
- Node.js 18+
- Gemini API key (get from https://makersuite.google.com/app/apikey)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create `.env.local` with Gemini API settings:
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   GEMINI_MODEL=gemini-pro
   ```

3. **Run the application:**
   ```bash
   npm run start:dev
   ```

For detailed setup instructions, see [Quick Start Guide](docs/QUICK_START.md).

## Project Structure

```
├── components/          # React components
├── pages/              # Page-level components
├── services/           # Business logic and AI services
├── data/               # Local file-based storage
│   ├── applications/   # Application data
│   ├── fact-sheets/    # Fact sheet data
│   └── analysis/       # Analysis results
└── docs/               # Documentation
```

## Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run start:dev` - Run full stack in development mode
- `npm run server` - Run server only
- `npm run start:prod` - Run production build

For all available scripts, see `package.json`.

## Configuration

All configuration is managed through environment variables in `.env.local`:

- `GEMINI_API_KEY` - Required: Your Gemini API key
- `GEMINI_MODEL` - Optional: Model to use (default: gemini-pro)
- `PORT` - Optional: Server port (default: 5000)
- `NODE_ENV` - Optional: Environment mode (development/production)

## Storage

All data is stored locally in JSON files in the `./data` directory:
- Applications: `./data/applications/`
- Fact Sheets: `./data/fact-sheets/`
- Analysis Results: `./data/analysis/`

## AI Analysis

The application uses Google Gemini AI for three types of analysis:
1. **Fact Sheet Analyzer** - Compares employer fact sheets to applications
2. **Risk and Policy Analyst** - Performs risk and policy assessment
3. **Business Profile Analyst** - Analyzes business profiles and risk factors

## Documentation

- [Quick Start Guide](docs/QUICK_START.md) - Get started in minutes
- [Gemini API Setup](docs/GEMINI_SETUP.md) - Detailed AI configuration guide

## License

Copyright © 2024 AsbestosGuard. All rights reserved.


