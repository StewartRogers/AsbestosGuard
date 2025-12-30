# Complete Guide: Configure Your Foundry Agent for AsbestosGuard

## Quick Navigation

This guide provides comprehensive instructions for configuring Azure Foundry Agent1 to work properly with AsbestosGuard.

**Choose your starting point:**

| Document | Use When | Time |
|----------|----------|------|
| **AGENT_QUICK_REFERENCE.txt** | You want a quick visual reference | 5 min |
| **AGENT_SETUP_INSTRUCTIONS.md** | You need detailed step-by-step instructions | 15 min |
| **AGENT_CONFIGURATION_CHECKLIST.md** | You want to verify everything is configured | 20 min |
| **AGENT_RESPONSE_TEMPLATE.json** | You need to see the exact JSON format | 2 min |

---

## The Problem We're Solving

Your AsbestosGuard app needs to:
1. Send application data to Foundry Agent1
2. Get back a JSON response with analysis results
3. Display those results in the UI

The agent needs to be configured to:
1. Accept unstructured application data
2. Analyze it according to compliance rules
3. Return **ONLY** valid JSON (no explanations or text)

---

## The Solution: Agent Configuration

### What You Configure

| Setting | Value | Why |
|---------|-------|-----|
| **System Prompt** | JSON-only instruction + example | Tells agent to return ONLY JSON |
| **Model** | gpt-4 or gpt-4-turbo | Better at structured output |
| **Temperature** | 0.1 | Consistent, deterministic responses |
| **Max Tokens** | 2000 | Enough for complete JSON response |
| **Top P** | 0.95 | Good for predictable output |

### What the Agent Does

**Input:** Application data (text format)
```
Company: SafeRemoval Construction Ltd.
Account Number: FS-12345
Workers: 12
Years in Business: 6
...
```

**Processing:** Agent analyzes using System Prompt instructions

**Output:** JSON response (ONLY)
```json
{
  "riskScore": "LOW",
  "isTestAccount": false,
  "summary": "...",
  "internalRecordValidation": { ... },
  ...
}
```

---

## Step-by-Step Configuration

### 1. Access Foundry Portal
- Go to: https://ai.azure.com
- Sign in with Azure credentials
- Select project: **rsrogers-8077**
- Find: Agent1 (EFSAGENT)

### 2. Copy System Prompt
- Open: **AGENT_QUICK_REFERENCE.txt**
- Find: **Section 2: CRITICAL: SYSTEM PROMPT**
- Copy: Entire text block (starting with "You are a regulatory...")

### 3. Paste System Prompt
- In Foundry portal, find agent's "Instructions" or "System Prompt" field
- Paste the text
- Click SAVE

### 4. Configure Model Settings
- Set Model: `gpt-4` or `gpt-4-turbo`
- Set Temperature: `0.1`
- Set Max Tokens: `2000`
- Set Top P: `0.95`
- Click SAVE

### 5. Test in Portal
- Click "Test" or "Try it out"
- Paste test input (see AGENT_QUICK_REFERENCE.txt, Section 3)
- Verify output is ONLY JSON
- Check JSON is valid (no syntax errors)

### 6. Test with App
```bash
npm run test:foundry-analysis
```
- Should see: "✓ Analysis completed successfully"
- Should show results

### 7. Manual UI Test
```bash
npm run dev
```
- Go to: Admin → Applications
- Click any application
- Click "Run Analysis"
- Verify results display

---

## Understanding the Flow

### What Happens When User Clicks "Run Analysis"

```
1. User clicks "Run Analysis" in UI
   ↓
2. App sends application data to server
   ↓
3. Server calls foundryAnalysisService
   ↓
4. Service formats data into prompt
   ↓
5. Service sends prompt to Agent1
   ↓
6. Agent1 processes using System Prompt instructions
   ↓
7. Agent1 returns JSON response
   ↓
8. Service parses JSON into AIAnalysisResult
   ↓
9. Result sent back to UI
   ↓
10. UI displays analysis (risk score, concerns, recommendation)
```

### The Critical Part: System Prompt

The **System Prompt** is what tells Agent1 how to behave. It must:

✅ Tell agent to respond with ONLY JSON
✅ Include example JSON structure
✅ Be explicit about no explanations/text
✅ Be saved correctly in Foundry

If this isn't right, agent will return text instead of JSON, and the app will fail.

---

## Common Configuration Mistakes

### ❌ Mistake 1: Default System Prompt

**Problem:** Using agent's default system prompt
**Symptom:** Agent returns: "The application looks good because... {"json": ...}"
**Fix:** Replace with exact System Prompt from AGENT_QUICK_REFERENCE.txt

### ❌ Mistake 2: Wrong Model

**Problem:** Using gpt-3.5-turbo instead of gpt-4
**Symptom:** Inconsistent JSON output, sometimes text instead of JSON
**Fix:** Change model to `gpt-4` or `gpt-4-turbo`

### ❌ Mistake 3: High Temperature

**Problem:** Temperature set to 0.7 or default
**Symptom:** Agent sometimes returns JSON, sometimes text
**Fix:** Lower temperature to `0.1`

### ❌ Mistake 4: Not Saving Changes

**Problem:** Change settings but don't click SAVE
**Symptom:** Settings revert, agent behaves inconsistently
**Fix:** Always click SAVE explicitly, wait 10-15 seconds

### ❌ Mistake 5: Partial System Prompt

**Problem:** Copy only part of System Prompt
**Symptom:** Agent ignores JSON instruction
**Fix:** Copy ENTIRE text from AGENT_QUICK_REFERENCE.txt Section 2

---

## Validation & Testing

### In Foundry Portal

1. **Test input format** (copy from AGENT_QUICK_REFERENCE.txt Section 3)
2. **Expected output** (pure JSON, see AGENT_RESPONSE_TEMPLATE.json)
3. **Check:** No text before JSON, no text after JSON
4. **Validate:** Use https://jsonlint.com/ to verify

### With App

1. **Script test:** `npm run test:foundry-analysis`
   - Expected: "✓ Analysis completed successfully"
   
2. **UI test:** `npm run dev` then click "Run Analysis"
   - Expected: Results display in 10-30 seconds

---

## Troubleshooting

### Agent Returns Text Instead of JSON

**Step 1:** Check System Prompt
- Open Foundry portal
- Review agent's System Prompt
- Should start with "You are a regulatory compliance analyst"
- Should include "ONLY JSON" instruction

**Step 2:** Lower Temperature
- Change from 0.7 → 0.1
- Change from 0.3 → 0.1
- Save changes

**Step 3:** Change Model
- Verify using gpt-4, not gpt-3.5
- Save and test again

**Step 4:** Test in Foundry Portal
- Click "Test"
- Paste test input
- Check output is ONLY JSON

### JSON Has Syntax Errors

**Step 1:** Copy agent response
**Step 2:** Paste into https://jsonlint.com/
**Step 3:** Fix issues shown (missing quotes, commas, etc.)
**Step 4:** Review System Prompt example for syntax issues

### Agent Not Responding

**Step 1:** Check agent is enabled
- In Foundry portal, look for enable/disable toggle

**Step 2:** Verify credentials
- Run: `az login` (Azure authentication)

**Step 3:** Check configuration
- Verify FOUNDRY_AGENT_1_ID is correct
- Verify AZURE_AI_FOUNDRY_PROJECT_ENDPOINT is correct

**Step 4:** Check Foundry portal logs
- Look for error messages
- Review agent status

---

## Configuration Verification Checklist

Before declaring "done", verify:

- ✅ System Prompt pasted (exact text from AGENT_QUICK_REFERENCE.txt)
- ✅ Temperature set to 0.1
- ✅ Model is gpt-4 or gpt-4-turbo
- ✅ Settings SAVED in Foundry portal
- ✅ Foundry portal test passes (JSON only output)
- ✅ App test passes: `npm run test:foundry-analysis`
- ✅ UI test passes: Click "Run Analysis"
- ✅ Response time is < 30 seconds
- ✅ JSON has no syntax errors
- ✅ All required fields present in response

---

## Reference Files

Created for you:

| File | Purpose |
|------|---------|
| AGENT_QUICK_REFERENCE.txt | Visual quick-reference (most important!) |
| AGENT_SETUP_INSTRUCTIONS.md | Detailed setup guide with examples |
| AGENT_CONFIGURATION_CHECKLIST.md | Step-by-step checklist to follow |
| AGENT_RESPONSE_TEMPLATE.json | Exact JSON response format |
| AGENT_CONFIGURATION_GUIDE.sh | Bash script format guide |
| AGENT_CONFIGURATION_COMPLETE.md | This file - overview |

---

## Next Steps

1. **Read:** AGENT_QUICK_REFERENCE.txt (5 minutes)
2. **Configure:** Follow steps in Foundry portal (10 minutes)
3. **Test:** Run `npm run test:foundry-analysis` (2 minutes)
4. **Verify:** Manual UI test with "Run Analysis" (5 minutes)
5. **Deploy:** Push to production when verified

---

## Support & Help

### If Agent Configuration Fails

1. Check AGENT_QUICK_REFERENCE.txt, Section 7
2. Review troubleshooting section above
3. Verify System Prompt exact match
4. Test in Foundry portal FIRST (not app)
5. Check temperature is 0.1
6. Check model is gpt-4

### If App Test Fails

1. Verify Azure login: `az login`
2. Check environment variables are set
3. Run `npm run test:foundry-analysis` for detailed logs
4. Check agent is configured correctly in Foundry portal
5. Verify agent responds with JSON in portal test

### If UI Test Fails

1. Start server: `npm run server`
2. Start frontend: `npm run dev` (in another terminal)
3. Check browser console for errors
4. Check server logs for detailed error messages
5. Verify agent is responding correctly to server requests

---

## Key Takeaways

**The agent MUST:**
1. ✅ Receive application data as text
2. ✅ Process it using the System Prompt
3. ✅ Return ONLY valid JSON (no explanations)
4. ✅ Include all required fields
5. ✅ Use correct data types (string, boolean, number)

**You MUST:**
1. ✅ Paste exact System Prompt from AGENT_QUICK_REFERENCE.txt
2. ✅ Set temperature to 0.1
3. ✅ Use gpt-4 model
4. ✅ SAVE all changes
5. ✅ Test in Foundry portal first

**The app will:**
1. ✅ Send formatted prompts to agent
2. ✅ Parse JSON responses
3. ✅ Display results in UI
4. ✅ Handle errors gracefully

---

**Ready to configure?**

→ Open **AGENT_QUICK_REFERENCE.txt** and follow the steps!

---

Generated: December 30, 2025
Version: 1.0
