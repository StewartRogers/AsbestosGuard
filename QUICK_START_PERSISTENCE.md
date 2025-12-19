# Quick Start Guide - File-Based Data Persistence

## Overview
All data in AsbestosGuard is now persisted to the server's file system in JSON format. There is NO browser storage.

## Starting the Application

```bash
npm start
```

This starts:
- Vite dev server (React frontend) on `http://localhost:5173`
- Express API server on `http://localhost:5000`

## Key Directories

```
data/
├── applications/      # User license applications
│   └── {appId}.json
├── fact-sheets/       # Employer fact sheets
│   └── {factSheetId}.json
└── analysis/          # AI analysis results
    └── analysis_{appId}.json
```

## API Endpoints Quick Reference

### Applications
```
POST   /api/applications              Create app
GET    /api/applications              List all apps
PUT    /api/applications/:id          Update app
DELETE /api/applications/:id          Delete app
```

### Fact Sheets
```
POST   /api/fact-sheets               Create fact sheet
GET    /api/fact-sheets               List all fact sheets
PUT    /api/fact-sheets/:id           Update fact sheet
DELETE /api/fact-sheets/:id           Delete fact sheet
```

### Analysis Results
```
POST   /api/analysis                  Save analysis
GET    /api/analysis/:id              Get analysis
GET    /api/analysis                  List all analyses
DELETE /api/analysis/:id              Delete analysis
```

## Common Tasks

### Create New Application
1. User fills form in NewApplicationForm
2. Form submits to App.tsx via `onSubmit()`
3. App calls `createApplication(appId, appData)`
4. API service POSTs to `/api/applications`
5. Server saves to `data/applications/{appId}.json`

### Update Application Status
1. Admin clicks "Approve/Reject" in ApplicationReview
2. Calls `updateStatus(newStatus)`
3. App calls `updateApplication(appId, updatedData)`
4. API service PUTs to `/api/applications/{appId}`
5. Server updates `data/applications/{appId}.json`

### Save AI Analysis
1. Admin runs "Run Analysis" in ApplicationReview
2. analyzeApplication() returns result
3. setAnalysisResult() triggers useEffect
4. Calls `savePersistentAnalysis(result)`
5. API service POSTs to `/api/analysis`
6. Server saves to `data/analysis/analysis_{appId}.json`

### Load Analysis on Mount
1. ApplicationReview component mounts
2. useEffect calls `getAnalysis(analysisKey)`
3. API service GETs from `/api/analysis/{analysisKey}`
4. Server reads from `data/analysis/analysis_{appId}.json`
5. Result loaded into component state

## File Format Example

### Application File: `data/applications/APP-2023-001.json`
```json
{
  "id": "APP-2023-001",
  "companyName": "Acme Asbestos Removal Ltd",
  "applicantName": "John Doe",
  "email": "john@acme.com",
  "status": "Submitted",
  "submissionDate": "2023-10-15",
  "lastUpdated": "2023-10-15",
  "adminNotes": "Pending review",
  "wizardData": {
    "contactFirstName": "John",
    "contactLastName": "Doe",
    ...
  }
}
```

### Analysis File: `data/analysis/analysis_APP-2023-001.json`
```json
{
  "riskScore": "MEDIUM",
  "summary": "Application analysis complete",
  "internalRecordValidation": {
    "recordFound": true
  },
  "geographicValidation": {...},
  "webPresenceValidation": {...},
  "certificationAnalysis": {...},
  "concerns": [...],
  "policyViolations": [...],
  "recommendation": "MANUAL_REVIEW_REQUIRED",
  "requiredActions": [...],
  "savedAt": "2023-10-20T15:30:45.123Z",
  "debug": {...}
}
```

## Debugging Tips

### Check Server Logs
```bash
# Server logs show all file operations
# Look for:
# - "Application saved successfully"
# - "Analysis saved successfully"
# - Error messages with file paths
```

### Verify File Creation
```bash
# List applications
ls -la data/applications/

# View specific application
cat data/applications/APP-2023-001.json | jq .

# List analyses
ls -la data/analysis/

# View specific analysis
cat data/analysis/analysis_APP-2023-001.json | jq .
```

### Monitor Network Requests
```javascript
// All data operations go through apiService
// Browser DevTools → Network tab shows:
// - POST /api/applications
// - PUT /api/applications/:id
// - POST /api/analysis
// - GET /api/analysis/:id
```

## Testing

### Test Application Persistence
```bash
# 1. Create app in UI
# 2. Verify file exists
ls data/applications/APP-* | head -1

# 3. View the JSON
cat data/applications/APP-*/json | jq .

# 4. Reload browser
# 5. Verify app still appears (loaded from server)
```

### Test Analysis Persistence
```bash
# 1. Run analysis in UI
# 2. Verify file exists
ls data/analysis/analysis_APP-* | head -1

# 3. View the JSON
cat data/analysis/analysis_APP-*.json | jq .

# 4. Reset analysis in UI
# 5. Verify file deleted
test ! -f data/analysis/analysis_APP-2023-001.json && echo "Deleted successfully"
```

### Test Import/Export
```bash
# 1. Export from Admin Dashboard → asbestos_db_backup_*.json
# 2. Backup existing data
mv data data-backup

# 3. Import backup
# 4. Verify files recreated
ls -la data/applications/
```

## Performance Considerations

- **File I/O:** Each operation reads/writes JSON files (no database)
- **Scalability:** File-based is suitable for small to medium data volumes
- **Future:** Can migrate to SQLite/PostgreSQL without changing API

## Common Issues

### Error: "Failed to save data"
- Check server is running on port 5000
- Verify `data/` directory has write permissions
- Check server console for error messages

### Analysis not loading
- Verify analysis file exists: `data/analysis/analysis_{appId}.json`
- Check filename format matches key: `analysis_{applicationId}`
- Ensure JSON is valid: `jq . data/analysis/*.json`

### Data not persisting
- Confirm app is using API calls (check Network tab)
- Verify server endpoints are being hit (check server logs)
- Check file system permissions

## Next Steps

1. Review `PERSISTENCE_CHANGES.md` for detailed architecture
2. Review `EVALUATION_SUMMARY.md` for complete changes list
3. Check `apiService.ts` for all available API functions
4. Review `server.ts` for endpoint implementations

---

For production deployment considerations, see the main README.md
