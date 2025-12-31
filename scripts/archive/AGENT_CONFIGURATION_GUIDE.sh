#!/bin/bash

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                                                                            ║
# ║         FOUNDRY AGENT CONFIGURATION GUIDE                                 ║
# ║         How to Configure Agent1 for AsbestosGuard                         ║
# ║                                                                            ║
# ╚════════════════════════════════════════════════════════════════════════════╝

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  FOUNDRY AGENT CONFIGURATION - STEP BY STEP"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# STEP 1: Access Azure Foundry Portal
echo "STEP 1: ACCESS AZURE FOUNDRY PORTAL"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""
echo "1. Go to: https://ai.azure.com"
echo "2. Sign in with your Azure account"
echo "3. Select your Foundry project: rsrogers-8077"
echo "4. Navigate to: Agents → Management → Your Agents"
echo ""
echo "Expected: You should see Agent1 (EFSAGENT)"
echo "         Agent ID: asst_WfzpVc2VFNSOimWtPFeH2M8A"
echo ""

# STEP 2: Open Agent1
echo "STEP 2: OPEN AGENT1 CONFIGURATION"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""
echo "1. Click on Agent1 (EFSAGENT)"
echo "2. Look for: Settings, Configuration, or Properties tab"
echo "3. You should see these fields:"
echo "   - Name: EFSAGENT (or your agent name)"
echo "   - Description: Compare Application to EFS"
echo "   - Model: gpt-4 or similar"
echo "   - Instructions/System Prompt: [See STEP 3]"
echo ""

# STEP 3: System Prompt
echo "STEP 3: CONFIGURE SYSTEM PROMPT (CRITICAL)"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""
echo "Replace or set the agent's System Prompt with this exact text:"
echo ""
cat << 'EOF'
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
EOF
echo ""
echo "⚠️  CRITICAL: This prompt MUST be set exactly as shown above"
echo ""

# STEP 4: Model Settings
echo "STEP 4: MODEL CONFIGURATION"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""
echo "Recommended Settings:"
echo "  • Model: gpt-4 or gpt-4-turbo (NOT gpt-3.5)"
echo "  • Temperature: 0.1 (for consistent JSON output)"
echo "  • Max Tokens: 2000"
echo "  • Top P: 0.95"
echo ""

# STEP 5: Input/Output Format
echo "STEP 5: INPUT/OUTPUT FORMAT"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""
echo "What the app sends to Agent1:"
echo ""
cat << 'EOF'
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
{ ... JSON structure ... }
EOF
echo ""
echo "What Agent1 should return:"
echo ""
echo "  {\"riskScore\":\"LOW\",\"isTestAccount\":false,...}"
echo ""
echo "⚠️  MUST be valid JSON with NO extra text"
echo ""

# STEP 6: Testing Agent
echo "STEP 6: TEST THE AGENT"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""
echo "In Foundry Portal:"
echo ""
echo "1. Click 'Test' or 'Try it out' button"
echo "2. Paste this test input:"
echo ""
cat << 'EOF'
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
{"riskScore":"LOW","isTestAccount":false,"summary":"Test","internalRecordValidation":{"recordFound":false,"accountNumber":null,"overdueBalance":null,"statusMatch":false,"concerns":[]},"geographicValidation":{"addressExistsInBC":false,"addressConflicts":[],"verifiedLocation":null},"webPresenceValidation":{"companyFound":false,"relevantIndustry":false,"searchSummary":""},"certificationAnalysis":{"totalWorkers":5,"certifiedWorkers":3,"complianceRatio":0.6,"meetsRequirement":false},"concerns":[],"policyViolations":[],"recommendation":"REQUEST_INFO","requiredActions":[],"sources":[{"title":"Foundry Agent Analysis","uri":""}]}
EOF
echo ""
echo "3. Expected Output: Valid JSON (same structure as System Prompt)"
echo "4. If you get text with explanations: Agent is NOT configured correctly"
echo ""

# STEP 7: Troubleshooting
echo "STEP 7: TROUBLESHOOTING"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""
echo "Problem: Agent returns text instead of JSON"
echo "Solution:"
echo "  ✓ Edit System Prompt - add 'Respond ONLY with JSON'"
echo "  ✓ Lower temperature to 0.1"
echo "  ✓ Test again in Foundry portal"
echo ""
echo "Problem: JSON has syntax errors"
echo "Solution:"
echo "  ✓ Check quotes are properly closed"
echo "  ✓ Check commas between fields"
echo "  ✓ Validate JSON at: https://jsonlint.com/"
echo ""
echo "Problem: Agent ignores System Prompt"
echo "Solution:"
echo "  ✓ Save changes explicitly"
echo "  ✓ Wait 10-15 seconds"
echo "  ✓ Test again"
echo ""

# STEP 8: Validation
echo "STEP 8: VALIDATE IN APP"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""
echo "Once Agent is configured correctly:"
echo ""
echo "1. Run: npm run test:foundry-analysis"
echo ""
echo "2. Expected output:"
echo "   ✓ Environment check passed"
echo "   ✓ Agent connectivity verified"
echo "   ✓ Analysis completed"
echo "   ✓ Results displayed"
echo ""
echo "3. If test passes: Agent is properly configured!"
echo ""

# STEP 9: Advanced Configuration (Optional)
echo "STEP 9: ADVANCED SETTINGS (OPTIONAL)"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""
echo "If you want more control, consider:"
echo ""
echo "• Knowledge Base/Files"
echo "  - Upload policy documents"
echo "  - Agent can reference them"
echo ""
echo "• Function Calling"
echo "  - Not needed for JSON output"
echo "  - Skip this for simple JSON responses"
echo ""
echo "• Retrieval Augmented Generation (RAG)"
echo "  - Connect to fact sheet database"
echo "  - Agent can look up records automatically"
echo ""

# STEP 10: Deployment
echo "STEP 10: VERIFY DEPLOYMENT"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""
echo "Before deploying to Azure:"
echo ""
echo "✓ Agent responds with JSON only (no text)"
echo "✓ JSON is valid (use jsonlint.com to verify)"
echo "✓ All required fields present"
echo "✓ Test script passes: npm run test:foundry-analysis"
echo "✓ UI test: Click 'Run Analysis' in Admin"
echo ""

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  KEY POINTS"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "1. SYSTEM PROMPT is critical - must include JSON-only instruction"
echo "2. Temperature should be 0.1 (deterministic output)"
echo "3. Model should be gpt-4 or gpt-4-turbo"
echo "4. Test in Foundry portal BEFORE testing with app"
echo "5. Response must be ONLY valid JSON, nothing else"
echo "6. App expects specific JSON structure with all required fields"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
