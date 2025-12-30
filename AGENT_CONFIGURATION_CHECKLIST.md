# Agent Configuration Checklist

## Pre-Configuration

- [ ] Access Foundry Portal (https://ai.azure.com)
- [ ] Sign in with Azure credentials
- [ ] Select project: **rsrogers-8077**
- [ ] Navigate to: Agents → Your Agents
- [ ] Locate Agent1 (EFSAGENT)
- [ ] Open agent settings/configuration page

---

## System Prompt Configuration

- [ ] Copy System Prompt from AGENT_QUICK_REFERENCE.txt (Section 2)
- [ ] Paste into agent's "Instructions" or "System Prompt" field
- [ ] Verify text starts with "You are a regulatory compliance analyst..."
- [ ] Verify text includes JSON example structure
- [ ] Verify text includes "ONLY JSON" instruction
- [ ] **Click SAVE** (important!)

---

## Model Settings

- [ ] Set **Model** to: `gpt-4` or `gpt-4-turbo`
  - [ ] NOT gpt-3.5-turbo
  - [ ] NOT gpt-3.5
- [ ] Set **Temperature** to: `0.1`
  - [ ] Must be LOW (< 0.2) for consistent JSON
  - [ ] NOT 0.7 or default
- [ ] Set **Max Tokens** to: `2000`
- [ ] Set **Top P** to: `0.95`
- [ ] **Click SAVE**

---

## Test in Foundry Portal

- [ ] Click "Test" or "Try it out" button
- [ ] Paste test input:
  ```
  Analyze this asbestos work license application:
  
  Company: Test Company Inc
  Account Number: TEST-001
  Workers: 5
  Years in Business: 3
  Has Internal Record: No
  Overdue Balance: $0
  
  Certifications:
  - Level 1-4 Certified: 3
  - Level 3 Certified: 1
  
  History Flags:
  - Refused in Last 7 Years: No
  - Enforcement Action: No
  - Non-Compliance: No
  - Suspended: No
  
  Compliance Acknowledgements:
  - Outstanding Amounts: Acknowledged
  - Compliance: Acknowledged
  - Enforcement: Acknowledged
  
  Respond ONLY with valid JSON (no other text):
  ```
- [ ] Check output is **ONLY** JSON (no text before/after)
- [ ] Verify JSON starts with `{` and ends with `}`
- [ ] Validate JSON at https://jsonlint.com/
- [ ] All fields present as per template
- [ ] No syntax errors in JSON

### If test fails:
- [ ] Re-read System Prompt - ensure "JSON only" at top
- [ ] Lower temperature to 0.05
- [ ] Wait 10-15 seconds
- [ ] Test again

---

## Validate Response Format

- [ ] Response contains `riskScore` field
- [ ] Response contains `isTestAccount` field
- [ ] Response contains `summary` field
- [ ] Response contains `internalRecordValidation` object
- [ ] Response contains `geographicValidation` object
- [ ] Response contains `webPresenceValidation` object
- [ ] Response contains `certificationAnalysis` object
- [ ] Response contains `concerns` array
- [ ] Response contains `policyViolations` array
- [ ] Response contains `recommendation` field
- [ ] Response contains `requiredActions` array
- [ ] Response contains `sources` array

---

## Validate Field Types

- [ ] `riskScore` is string ("LOW", "MEDIUM", or "HIGH")
- [ ] `isTestAccount` is boolean (true or false)
- [ ] `summary` is string
- [ ] `accountNumber` is string or null
- [ ] `overdueBalance` is number or null
- [ ] `statusMatch` is boolean or null
- [ ] `addressExistsInBC` is boolean
- [ ] `companyFound` is boolean
- [ ] `relevantIndustry` is boolean
- [ ] `totalWorkers` is number
- [ ] `certifiedWorkers` is number
- [ ] `complianceRatio` is number (0.0 to 1.0)
- [ ] `meetsRequirement` is boolean
- [ ] `concerns` is array
- [ ] `policyViolations` is array
- [ ] `recommendation` is string
- [ ] `requiredActions` is array
- [ ] `sources` is array of objects

---

## Test with App

- [ ] Terminal: `npm run test:foundry-analysis`
- [ ] Expected: "✓ Agent connectivity verified"
- [ ] Expected: "✓ Analysis completed successfully"
- [ ] Expected: Risk score displayed
- [ ] Expected: Recommendation displayed

### If app test fails:
- [ ] Check error message in terminal
- [ ] Review raw agent response in logs
- [ ] Verify System Prompt was saved in Foundry portal
- [ ] Test agent again in Foundry portal
- [ ] Check if JSON is valid (use jsonlint.com)

---

## Manual UI Test

- [ ] Terminal: `npm run dev`
- [ ] Open: http://localhost:5173
- [ ] Navigate to: Admin Dashboard
- [ ] Click: Applications
- [ ] Select any application
- [ ] Click: "Run Analysis" button
- [ ] Wait: 10-30 seconds
- [ ] Expected: Analysis results display
- [ ] Check: Risk score visible
- [ ] Check: Concerns section (if any)
- [ ] Check: Recommendation displayed
- [ ] Check: Required actions list (if any)

---

## Deployment Readiness

- [ ] Foundry portal test passes
- [ ] App test passes: `npm run test:foundry-analysis`
- [ ] UI manual test passes
- [ ] Response time acceptable (< 30 seconds)
- [ ] JSON validates without errors
- [ ] All required fields present
- [ ] Field types correct
- [ ] System Prompt saved in Foundry
- [ ] Temperature set to 0.1
- [ ] Model is gpt-4

---

## Production Deployment

- [ ] Set environment variables in Azure App Service:
  - [ ] `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT`
  - [ ] `FOUNDRY_AGENT_1_ID`
- [ ] Verify Azure login: `az login`
- [ ] Deploy code
- [ ] Test in production environment
- [ ] Monitor logs for errors

---

## Troubleshooting Guide

### Agent returns text + JSON

**Symptom:**
```
The application looks good because...
{"riskScore": "LOW", ...}
```

**Fix:**
- [ ] Edit System Prompt in Foundry portal
- [ ] Move "ONLY JSON" instruction to top
- [ ] Lower temperature to 0.05
- [ ] Re-save and test

---

### Agent returns only text

**Symptom:**
```
This is a low-risk application...
(no JSON)
```

**Fix:**
- [ ] Replace entire System Prompt with exact text
- [ ] Use gpt-4 model (not 3.5)
- [ ] Set temperature to 0.1
- [ ] Add complete JSON example to prompt
- [ ] Save and test again

---

### JSON has syntax errors

**Symptom:**
```
Parse error: Unexpected token at line 3
```

**Fix:**
- [ ] Validate JSON at: https://jsonlint.com/
- [ ] Check for missing quotes on strings
- [ ] Check for missing commas between fields
- [ ] Check for single quotes vs double quotes
- [ ] Update System Prompt example if needed

---

### Agent not responding

**Symptom:**
```
Timeout waiting for agent response
```

**Fix:**
- [ ] Check agent is enabled in Foundry portal
- [ ] Increase timeout in foundryAgentClient.ts
- [ ] Check Azure login: `az login`
- [ ] Verify FOUNDRY_AGENT_1_ID is correct
- [ ] Check Foundry portal for agent errors

---

### Temperature not saving

**Symptom:**
```
Temperature reverts to 0.7 after save
```

**Fix:**
- [ ] Click SAVE explicitly
- [ ] Wait 10-15 seconds
- [ ] Refresh page and verify saved
- [ ] Check if there's a "Revert" button
- [ ] Try setting to 0.05 instead

---

## Sign-Off

- [ ] All checks above completed
- [ ] Agent tested and working
- [ ] Documentation updated
- [ ] Team notified
- [ ] Ready for production deployment

**Date Completed:** _______________
**Configured By:** _______________
**Testing Verified By:** _______________

---

## Notes

Use this section for any special configurations or issues:

```
________________________________________________________________________

________________________________________________________________________

________________________________________________________________________
```

---

## Reference Documents

- **AGENT_QUICK_REFERENCE.txt** - Quick setup guide
- **AGENT_SETUP_INSTRUCTIONS.md** - Detailed instructions
- **AGENT_RESPONSE_TEMPLATE.json** - Response format
- **AGENT_CONFIGURATION_GUIDE.sh** - Bash guide

---

**Need help?** Refer to the documentation files above or check Foundry portal logs.
