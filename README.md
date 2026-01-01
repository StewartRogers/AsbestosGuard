# AsbestosGuard

AsbestosGuard is a licensing and compliance portal for asbestos-related services, built with React, TypeScript, and Azure AI Foundry.

## Quick Start

### Prerequisites
- Node.js 18+
- Azure AI Foundry project (optional, for AI analysis features)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment (optional):**
   Create `.env.local` with Azure AI Foundry settings:
   ```
   AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com/api/projects/your-project
   FOUNDRY_AGENT_1_ID=asst_your_agent_1_id
   FOUNDRY_AGENT_2_ID=asst_your_agent_2_id
   FOUNDRY_AGENT_3_ID=asst_your_agent_3_id
   ```

3. **Run the application:**
   ```bash
   npm run start:dev
   ```

### Azure Deployment

Deploy to Azure App Service:
```bash
./deploy.sh <resource-group> <webapp-name>
```

For detailed deployment instructions, see [docs/DEPLOY.md](docs/DEPLOY.md).

## Project Structure

```
├── components/          # React components
├── pages/              # Page-level components
├── services/           # Business logic and API clients
├── tests/              # Test scripts
├── scripts/            # Utility scripts
│   └── diagnostics/   # Diagnostic tools
├── tools/              # Development tools
└── docs/               # Documentation
    └── archive/       # Historical documentation
```

## Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run start:dev` - Run full stack in development mode
- `npm run test:foundry` - Test Azure AI Foundry integration
- `npm run validate:setup` - Validate configuration

For all available scripts, see `package.json`.

## Documentation

- [Deployment Guide](docs/DEPLOY.md)
- [Azure AI Foundry Setup](docs/FOUNDRY_SETUP.md)
- [Archived Documentation](docs/archive/) - Implementation notes and historical docs

## License

Copyright © 2024 AsbestosGuard. All rights reserved.

