# Foundry Agent Configuration Guide

## Overview

This guide explains how to configure **Agent1 (EFSAGENT)** in Azure Foundry to properly accept input from AsbestosGuard and return JSON responses in the expected format.

---

## Quick Summary

| Aspect | Requirement |
|--------|-------------|
| **Agent Name** | EFSAGENT |
| **Agent ID** | asst_WfzpVc2VFNSOimWtPFeH2M8A |
| **Model** | gpt-4 or gpt-4-turbo |
| **Temperature** | 0.1 (for consistent JSON) |
| **System Prompt** | JSON-only instruction (see below) |
| **Response Format** | ONLY valid JSON, no other text |

---

## Step-by-Step Configuration

### Step 1: Access Foundry Portal

1. Navigate to: **https://ai.azure.com**
2. Sign in with your Azure credentials
3. Select project: **rsrogers-8077**
4. Go to: **Agents → Management → Your Agents**
5. Find and click: **Agent1 (EFSAGENT)**

---

### Step 2: Locate Agent Settings

In the Agent1 page, look for:

- **General Settings** or **Configuration** tab
- You should see these fields:
  - Name
  - Description  
  - Model Selection
  - Instructions/System Prompt
  - Model Parameters

---

### Step 3: Set System Prompt (CRITICAL)

This is the most important step. The System Prompt tells the agent how to behave.

**Copy this exact System Prompt and paste it into the agent's instruction field:**

```
You are a regulatory compliance analyst for asbestos work licensing.

Your task: Analyze license applications and return ONLY valid JSON with NO additional text.

IMPORTANT RULES:
1. ALWAYS respond with ONLY a JSON object
2. NO explanations, NO markdown, NO code blocks
3. Start with { and end with }
4. Double-check all quotes are properly escaped
5. All string values must be in quotes
6. All boolean values must be true/false (lowercase)
7. All numbers must NOT be quoted

When analyzing an application, you will receive application details.

Return this JSON structure EXACTLY (valid JSON only):
{
  "riskScore": "LOW",
  "isTestAccount": false,
  "summary": "Analysis summary here",
  "internalRecordValidation": {
    "recordFound": true,
    "accountNumber": "FS-12345",
    "overdueBalance": 0,
    "statusMatch": true,
    "concerns": []
  },
  "geographicValidation": {
    "addressExistsInBC": true,
    "addressConflicts": [],
    "verifiedLocation": "BC"
  },
  "webPresenceValidation": {
    "companyFound": true,
    "relevantIndustry": true,
    "searchSummary": "Company operates in asbestos abatement"
  },
  "certificationAnalysis": {
    "totalWorkers": 10,
    "certifiedWorkers": 8,
    "complianceRatio": 0.8,
    "meetsRequirement": true
  },
  "concerns": [],
  "policyViolations": [],
  "recommendation": "APPROVE",
  "requiredActions": [],
  "sources": [{"title": "Foundry Agent Analysis", "uri": ""}]
}
```

---

### Step 4: Configure Model Parameters

Set these values in the agent settings:

| Parameter | Value | Reason |
|-----------|-------|--------|
| **Model** | gpt-4 or gpt-4-turbo | Better at JSON output than 3.5 |
| **Temperature** | 0.1 | Low temperature = consistent JSON |
| **Max Tokens** | 2000 | Enough for detailed JSON response |
| **Top P** | 0.95 | Good for deterministic output |

---

## Input Format

### What the App Sends

AsbestosGuard sends this format to your agent:

```
Analyze this asbestos work license application:

Company: SafeRemoval Construction Ltd.
Account Number: FS-12345
Workers: 12
Years in Business: 6
Has Internal Record: Yes
Overdue Balance: $0

Certifications:
- Level 1-4 Certified: 10
- Level 3 Certified: 2

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

### What You Need to Return

Agent MUST return **ONLY** this JSON (no explanations, no text):

```json
{
  "riskScore": "LOW",
  "isTestAccount": false,
  "summary": "Company meets all requirements with clean record",
  "internalRecordValidation": {
    "recordFound": true,
    "accountNumber": "FS-12345",
    "overdueBalance": 0,
    "statusMatch": true,
    "concerns": []
  },
  "geographicValidation": {
    "addressExistsInBC": true,
    "addressConflicts": [],
    "verifiedLocation": "Vancouver, BC"
  },
  "webPresenceValidation": {
    "companyFound": true,
    "relevantIndustry": true,
    "searchSummary": "Company operates in asbestos abatement sector"
  },
  "certificationAnalysis": {
    "totalWorkers": 12,
    "certifiedWorkers": 10,
    "complianceRatio": 0.833,
    "meetsRequirement": true
  },
  "concerns": [],
  "policyViolations": [],
  "recommendation": "APPROVE",
  "requiredActions": [],
  "sources": [{"title": "Foundry Agent Analysis", "uri": ""}]
}
```

---

## Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| **riskScore** | string | Risk level assessment | "LOW", "MEDIUM", "HIGH" |
| **isTestAccount** | boolean | Whether this is a test application | false |
| **summary** | string | Brief assessment summary | "Application meets requirements" |
| **internalRecordValidation** | object | Fact sheet validation results | See below |
| **geographicValidation** | object | Address validation | See below |
| **webPresenceValidation** | object | Company web presence check | See below |
| **certificationAnalysis** | object | Staff certification levels | See below |
| **concerns** | array | List of concerns found | ["Insurance expires in 3 months"] |
| **policyViolations** | array | List of violations | [{field, value, policy}] |
| **recommendation** | string | Final recommendation | "APPROVE", "REJECT", "REQUEST_INFO" |
| **requiredActions** | array | Actions needed before approval | ["Renew insurance"] |
| **sources** | array | Data sources used | [{"title": "...", "uri": "..."}] |

---

## Testing the Agent

### In Foundry Portal

1. Click the **"Test"** or **"Try it out"** button
2. Paste this test input:

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

3. **Expected Output:**
   - ✅ Valid JSON object (no text before or after)
   - ✅ All required fields present
   - ✅ Proper formatting (quotes, commas, brackets)

4. **If you get:**
   - ❌ Text explanation first, then JSON → System prompt not followed
   - ❌ JSON with syntax errors → Fix quotes/commas
   - ❌ Markdown code blocks → Add to System prompt: "NO markdown"

### Test with App

```bash
npm run test:foundry-analysis
```

Expected output:
```
✓ Environment check passed
✓ Agent connectivity verified
✓ Analysis completed successfully
✓ Risk Score: LOW
✓ Recommendation: APPROVE
```

---

## Troubleshooting

### Problem: Agent returns explanation + JSON

**Symptom:**
```
The application looks good because...
{"riskScore": "LOW", ...}
```

**Solution:**
1. Edit System Prompt
2. Add at the top: **"Respond with ONLY valid JSON. No explanations."**
3. Lower temperature to 0.05
4. Test again

---

### Problem: Agent returns text instead of JSON

**Symptom:**
```
This is a LOW risk application. The company...
```

**Solution:**
1. Make System Prompt clearer:
   ```
   CRITICAL: Return ONLY valid JSON.
   If user asks to analyze, respond with ONLY:
   { ... valid JSON ... }
   ```
2. Add example JSON at end of System Prompt
3. Use gpt-4 instead of gpt-3.5
4. Set temperature to 0.1

---

### Problem: JSON has syntax errors

**Symptom:**
```
Parse error: Unexpected token at line 5
```

**Solution:**
1. Copy agent response
2. Validate at: https://jsonlint.com/
3. Fix issues shown
4. Check if agent is:
   - Missing quotes around strings
   - Missing commas between fields
   - Using single quotes instead of double quotes
5. Update System Prompt with correct example

---

### Problem: Agent not following instructions

**Symptom:**
Agent ignores System Prompt, returns whatever format

**Solution:**
1. Wait 10-15 seconds after saving
2. Refresh the page
3. Test again in Foundry portal
4. If still not working:
   - Edit agent name (force refresh)
   - Re-paste System Prompt
   - Change temperature
   - Save and test again

---

## Advanced Tips

### 1. Enforce JSON with Few-Shot Examples

Add to System Prompt:

```
Example 1:
Input: Analyze Test Company
Output: {"riskScore":"LOW","isTestAccount":false,...}

Example 2:
Input: Check XYZ Corp
Output: {"riskScore":"MEDIUM","isTestAccount":false,...}
```

### 2. Use Schema Validation

If Foundry supports function calling or structured output:
- Define JSON schema for validation
- Agent will be constrained to schema

### 3. Add Guardrails

System Prompt addition:
```
CONSTRAINT: Never include markdown, code blocks, or explanations.
CONSTRAINT: Response must be valid JSON that passes JSON validation.
CONSTRAINT: All string values must use double quotes only.
```

### 4. Monitor Agent Performance

In Foundry Portal:
- Check agent analytics/logs
- Review failed responses
- Identify patterns in errors
- Adjust System Prompt accordingly

---

## Validation Checklist

Before deploying, verify:

- ✅ Agent responds with JSON only (no text)
- ✅ JSON is valid (test at jsonlint.com)
- ✅ All required fields present
- ✅ Field values are correct types (string, boolean, number)
- ✅ Temperature is 0.1 or lower
- ✅ Model is gpt-4 or gpt-4-turbo
- ✅ System Prompt includes "JSON only" instruction
- ✅ Test script passes: `npm run test:foundry-analysis`
- ✅ UI test passes: Click "Run Analysis" in Admin
- ✅ Response time is acceptable (< 30 seconds)

---

## JSON Validation

To validate JSON responses:

1. **Online Tool:** https://jsonlint.com/
2. **In Terminal:**
   ```bash
   echo '{"test": "value"}' | jq .
   ```
3. **In JavaScript:**
   ```javascript
   JSON.parse(response) // Throws error if invalid
   ```

---

## Next Steps

1. ✅ Configure System Prompt in Foundry portal
2. ✅ Set Temperature to 0.1
3. ✅ Test agent in Foundry portal
4. ✅ Test with app: `npm run test:foundry-analysis`
5. ✅ Deploy to production

---

## Support

If agent configuration issues persist:

1. Check Foundry agent logs
2. Review System Prompt - ensure JSON instruction at top
3. Test with simpler prompt first
4. Verify model is gpt-4
5. Check temperature is < 0.2

For additional help, refer to:
- Foundry documentation
- Agent configuration examples in portal
- App logs: `npm run server` (check console output)
