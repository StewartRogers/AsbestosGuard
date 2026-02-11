# Quick Start Guide

Get AsbestosGuard up and running in minutes.

## Prerequisites

- Node.js 18 or later
- npm
- A Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd AsbestosGuard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

4. **Start the application**:
   ```bash
   npm run start:dev
   ```

5. **Open your browser**:
   Navigate to http://localhost:5173

That's it! The application should now be running.

## What's Running

When you run `npm run start:dev`, two processes start:
- **Frontend (Vite)**: Development server on port 5173
- **Backend (Express)**: API server on port 5000

## Directory Structure

After starting the application, you'll see these directories:
```
AsbestosGuard/
├── data/                  # Local storage (created automatically)
│   ├── applications/      # Application data
│   ├── fact-sheets/       # Fact sheet data
│   └── analysis/          # AI analysis results
├── dist/                  # Frontend build output
└── dist-server/           # Backend build output
```

## Testing the Application

1. Navigate to the application in your browser
2. Create a new employer application
3. Fill in the required information
4. Click "Analyze Application" to test AI analysis

## Common Commands

```bash
# Development mode (hot reload)
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run frontend only
npm run dev

# Run backend only
npm run server
```

## Troubleshooting

### Port Already in Use

If port 5000 or 5173 is already in use, you can change them:

In `.env.local`:
```env
PORT=8080
```

For Vite port, edit `vite.config.ts`:
```typescript
server: {
  port: 3000
}
```

### Gemini API Errors

If you see API errors, verify:
1. Your `GEMINI_API_KEY` is correct in `.env.local`
2. You have an active internet connection
3. Your API key hasn't been revoked

See [GEMINI_SETUP.md](./GEMINI_SETUP.md) for detailed troubleshooting.

### Build Errors

If the build fails:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Production Deployment

For production deployment:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set production environment variables**:
   Create `.env.production`:
   ```env
   NODE_ENV=production
   GEMINI_API_KEY=your-production-api-key
   PORT=8080
   ```

3. **Start the server**:
   ```bash
   npm run start:prod
   ```

The application will serve from `dist/` and run on the configured port.

## Using Docker (Optional)

To run with Docker:

1. **Build the image**:
   ```bash
   docker build -t asbestosguard .
   ```

2. **Run the container**:
   ```bash
   docker run -p 8080:8080 \
     -e GEMINI_API_KEY=your-api-key \
     -v $(pwd)/data:/app/data \
     asbestosguard
   ```

3. **Access the application**:
   Navigate to http://localhost:8080

## Next Steps

- Read the [README](../README.md) for more information
- Check out [GEMINI_SETUP.md](./GEMINI_SETUP.md) for detailed AI configuration
- Explore the application features

## Getting Help

If you encounter issues:
1. Check the console for error messages
2. Review the [Gemini Setup Guide](./GEMINI_SETUP.md)
3. Check server logs for API errors
4. Ensure all environment variables are set correctly
