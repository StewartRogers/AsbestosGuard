# Azure Foundry Agents Integration - Complete Setup

## ✅ Integration Status: COMPLETE

All three Azure Foundry AI agents have been successfully created, configured, and integrated with the AsbestosGuard application.

---

## Created Agents

### 1. EFSAGENT (Employee/Facility Safety)
- **Assistant ID:** `asst_WfzpVc2VFNSOimWtPFeH2M8A`
- **Purpose:** Compare Application to EFS (Employment Facility Safety)
- **Model:** gpt-4.1
- **Instructions:** "Compare Application to EFS"
- **Environment Variable:** `FOUNDRY_AGENT_1_ID`

### 2. EMPWEBPROFILEAGENT (Employee Web Profile)
- **Assistant ID:** `asst_oKyLyTufq0RUcImmv4Wordy7`
- **Purpose:** Develop business profiles through web search
- **Model:** gpt-4.1
- **Instructions:** "Do a web search to develop a business profile."
- **Environment Variable:** `FOUNDRY_AGENT_2_ID`

### 3. APPRISKANALYSIS (Application Risk Analysis)
- **Assistant ID:** `asst_dgZab8X0Y28EMqKpT9DbwBmb`
- **Purpose:** Analyze application and facility risks
- **Model:** gpt-4.1
- **Instructions:** "Do a risk analysis of the application."
- **Environment Variable:** `FOUNDRY_AGENT_3_ID`

---

## Configuration

### Environment Variables (.env.local)
```dotenv
AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://rsrogers-8077-resource.services.ai.azure.com/api/projects/rsrogers-8077
FOUNDRY_AGENT_1_ID=asst_WfzpVc2VFNSOimWtPFeH2M8A
FOUNDRY_AGENT_2_ID=asst_oKyLyTufq0RUcImmv4Wordy7
FOUNDRY_AGENT_3_ID=asst_dgZab8X0Y28EMqKpT9DbwBmb
```

### API Versions Used
- **Agent Operations (GET, LIST):** `2025-05-15-preview`
- **Thread Operations (CREATE, RUN, MESSAGES):** `2025-05-01`
- **Assistant Creation (POST):** `2025-05-01`

---

## Key Implementation Files

### 1. **services/foundryAgentClient.ts**
REST client for Azure Foundry Agent Service with:
- Thread creation and management
- Message addition and retrieval
- Agent run orchestration with automatic polling
- API version fallback for compatibility
- DefaultAzureCredential authentication

**Key Functions:**
- `createThread()` - Creates new conversation thread
- `addMessage(threadId, message)` - Adds user/assistant messages
- `runThread(threadId, assistantId)` - Executes agent with assistant ID
- `getRun()` - Polls for execution status
- `getMessages()` - Retrieves conversation messages
- `askAgent(assistantId, prompt)` - High-level orchestration function

### 2. **services/foundryService.ts**
High-level service mapping agent keys to assistant IDs:
- Maps `agent1|agent2|agent3` to `FOUNDRY_AGENT_*_ID` environment variables
- Provides `chatWithAgent(agentKey, prompt)` function
- Handles both agent ID and name formats

### 3. **tools/get-agent-id.ts**
Discovery tool for retrieving agent IDs via REST API:
- Queries `/agents/{name}` endpoint with version fallback
- Used during setup to get correct assistant IDs
- Usage: `npm run get:agent-id -- AGENTNAME`

### 4. **tools/test-foundry-agent.ts**
Test harness for validating agent integration:
- Loads .env.local for authentication
- Tests agent chat with custom prompts
- Usage: `npm run test:foundry -- agent1 "your prompt"`

### 5. **server.ts - API Endpoint**
Express route for HTTP requests:
- Route: `POST /__api/foundry/:agentKey/chat`
- Request body: `{ "prompt": "user message" }`
- Response: `{ "text": "agent reply" }` or error

---

## Testing

### Test Individual Agents

```bash
# Test EFSAGENT
npm run test:foundry -- agent1 "What is 2+2?"

# Test EMPWEBPROFILEAGENT
npm run test:foundry -- agent2 "What should we look for in a business profile?"

# Test APPRISKANALYSIS
npm run test:foundry -- agent3 "Analyze the risk of asbestos exposure in a manufacturing facility"
```

### Test API Endpoint

```bash
# Start dev server
npm run dev

# Call API
curl -X POST http://localhost:5173/__api/foundry/agent1/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello"}'
```

---

## Authentication

The integration uses **DefaultAzureCredential** from `@azure/identity`:

```powershell
# Login with Azure CLI (required)
az login

# The app will automatically use your Azure credentials
```

Alternatively, set `AGENT_TOKEN` environment variable with a Bearer token.

---

## Important Notes

### Agents Created via API, Not Portal
- Initial agents in the Foundry portal had incorrect ID formats
- Agents had simple string IDs (`EFSAGENT`, `EMPWEBPROFILEAGENT`, `APPRISKANALYSIS`) instead of proper assistant IDs starting with `asst_`
- **Solution:** Created new assistants via the `/assistants` REST API endpoint with correct format
- This ensures compatibility with the `/threads/{id}/runs` endpoint that expects proper `asst_*` IDs

### Message Format Handling
- The Foundry API returns messages in a list wrapper: `{ object: "list", data: [...] }`
- Text content is nested: `content[0].text.value` (not `content[0].text`)
- The client properly extracts and parses this structure

### Error Handling
- API version fallback: If one version fails, the client tries the next version in the list
- Thread polling: Automatically waits for agent execution to complete (default 60 second timeout)
- Comprehensive debug logging for troubleshooting

---

## Troubleshooting

### "Invalid 'assistant_id': Expected an ID that begins with 'asst_'"
- **Cause:** Using agent name instead of assistant ID
- **Solution:** Use the assistant IDs from this document or re-run `npm run get:agent-id`

### "Failed to run thread with any supported API version"
- **Cause:** Incorrect API endpoint or authentication
- **Solution:** Verify `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT` and run `az login`

### 401 Unauthorized
- **Cause:** Authentication failed
- **Solution:** Run `az login` or set `AGENT_TOKEN` environment variable

### "Agent run timed out"
- **Cause:** Agent took longer than 60 seconds to respond
- **Solution:** Increase timeout in `askAgent` options (3rd parameter)

---

## Summary

✅ Three Azure Foundry agents successfully integrated  
✅ REST API client fully functional  
✅ Thread creation and message handling working  
✅ Agent execution with automatic polling implemented  
✅ Test tools and endpoint routes configured  
✅ All three agents tested and responding correctly  

The application is ready to use Azure Foundry agents for:
- Facility safety comparisons (EFSAGENT)
- Business profile generation (EMPWEBPROFILEAGENT)  
- Risk analysis (APPRISKANALYSIS)
