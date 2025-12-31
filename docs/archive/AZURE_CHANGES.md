# Azure Deployment Changes Summary

This document summarizes the changes made to enable Azure deployment.

## Files Added

### Azure Configuration Files
- **`.env.azure.template`** - Template for Azure environment variables
- **`AZURE_DEPLOYMENT.md`** - Comprehensive deployment guide
- **`web.config`** - IIS/iisnode configuration for Azure App Service
- **`.deployment`** - Azure deployment configuration
- **`deploy.cmd`** - Custom deployment script for Azure
- **`build.sh`** - Build script for Linux-based deployments

### Services
- **`services/azureBlobStorageService.ts`** - Azure Blob Storage integration
  - Handles all storage operations (applications, fact-sheets, analysis, data)
  - Supports connection string, account key, and Managed Identity authentication
  - Auto-creates containers as needed

## Files Modified

### Backend (server.ts)
- Added Azure Blob Storage support via conditional logic
- Automatically detects Azure environment and switches storage backend
- Serves static files in production mode
- Updated port handling for Azure (uses `process.env.PORT`)
- Added catch-all route for React Router in production

### Frontend Services
- **`services/apiService.ts`** - Dynamic API base URL (localhost in dev, relative in production)
- **`services/storageService.ts`** - Dynamic API base URL handling
- **`services/geminiService.ts`** - Updated proxy endpoints for Azure

### Configuration Files
- **`package.json`** - Added `start:prod` script for production
- **`.gitignore`** - Added Azure deployment files and environment files

## Key Features

### Dual Storage Mode
The application automatically switches between:
- **Local File System** (development) - Uses `./data` directory
- **Azure Blob Storage** (production) - Uses Azure Storage Account

Detection is based on environment variables:
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_ACCOUNT_NAME`
- `USE_AZURE_STORAGE=true`

### Environment Variables

#### Required for Azure
```
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account
GEMINI_API_KEY=your_api_key
NODE_ENV=production
```

#### Optional
```
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_ACCOUNT_KEY=your_account_key
PORT=8080
```

### Security Features
- **Managed Identity Support** - Recommended for production (no credentials in code)
- **Connection String Support** - Alternative authentication method
- **Account Key Support** - Another alternative method
- **CORS Configuration** - Properly configured in web.config

## Local Development

No changes needed for local development:
```bash
npm run start
```

To test with Azure Storage locally:
```bash
# Copy and configure .env.local
cp .env.azure.template .env.local

# Edit .env.local with your Azure credentials
# Then run:
npm run server
```

## Deployment Process

### Quick Deploy
1. Configure Azure resources (Web App + Storage)
2. Set environment variables in Azure Portal
3. Build and deploy:
   ```bash
   npm run build
   # Then deploy via VS Code, Azure CLI, or GitHub Actions
   ```

### Detailed Steps
See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) for complete instructions.

## Architecture

```
┌─────────────────────────────────────────────┐
│         Azure App Service (Web App)          │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  Express Server (server.ts)            │ │
│  │  - API endpoints (/api/*)              │ │
│  │  - AI proxy (/__api/*)                 │ │
│  │  - Static file serving (production)    │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  React Frontend (dist/)                │ │
│  │  - SPA with React Router               │ │
│  │  - Dynamic API base URL                │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                    │
                    │ Managed Identity / Connection String
                    ▼
┌─────────────────────────────────────────────┐
│      Azure Blob Storage Account             │
│                                              │
│  Containers:                                 │
│  - applications/                             │
│  - fact-sheets/                              │
│  - analysis/                                 │
│  - policies/                                 │
│  - data/                                     │
└─────────────────────────────────────────────┘
```

## Testing Checklist

- [ ] Local development works (npm run start)
- [ ] Build succeeds (npm run build)
- [ ] Production server works locally (npm run start:prod)
- [ ] Azure deployment succeeds
- [ ] Can create/read/update/delete applications
- [ ] Can create/read/update/delete fact sheets
- [ ] AI analysis works
- [ ] Static files served correctly
- [ ] React Router navigation works

## Troubleshooting

### Build Fails
- Check Node.js version: Should be 18+
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors: `npm run build`

### Deployment Fails
- Verify environment variables are set in Azure Portal
- Check deployment logs in Azure Portal → Deployment Center
- Ensure `SCM_DO_BUILD_DURING_DEPLOYMENT=true` is set

### Storage Errors
- Verify Azure Storage credentials are correct
- Check Managed Identity has "Storage Blob Data Contributor" role
- Verify containers exist or app has permission to create them

### 404 Errors in Production
- Verify `dist/` folder is deployed
- Check static file serving is enabled
- Verify catch-all route for React Router is working

## Monitoring

After deployment, monitor:
- Application Insights (if enabled)
- Log Stream in Azure Portal
- Storage Account metrics
- Web App metrics (CPU, memory, response time)

## Cost Estimate

- **App Service Basic B1**: ~$13/month
- **Storage Account**: ~$0.02/GB/month + minimal transaction costs
- **Application Insights**: Free tier available

## Next Steps

1. Review [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)
2. Set up your Azure resources
3. Configure environment variables
4. Deploy the application
5. Set up monitoring and alerts
6. Consider adding custom domain and SSL

## Support

For issues or questions:
1. Check [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)
2. Review Azure documentation
3. Check application logs in Azure Portal
4. Verify environment variables are correctly set
