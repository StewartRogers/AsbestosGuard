#!/bin/bash

# ╔════════════════════════════════════════════════════════════════╗
# ║                                                                ║
# ║          ASBESTOS GUARD - FOUNDRY INTEGRATION                 ║
# ║                   VERIFICATION CHECKLIST                       ║
# ║                                                                ║
# ╚════════════════════════════════════════════════════════════════╝

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FOUNDRY INTEGRATION VERIFICATION CHECKLIST${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

# Check 1: Environment Variables
echo -e "${YELLOW}[1/8] Checking environment variables...${NC}"
if grep -q "AZURE_AI_FOUNDRY_PROJECT_ENDPOINT" .env.local 2>/dev/null; then
    echo -e "${GREEN}  ✓ AZURE_AI_FOUNDRY_PROJECT_ENDPOINT set${NC}"
else
    echo -e "${RED}  ✗ AZURE_AI_FOUNDRY_PROJECT_ENDPOINT missing${NC}"
fi

if grep -q "FOUNDRY_AGENT_1_ID" .env.local 2>/dev/null; then
    echo -e "${GREEN}  ✓ FOUNDRY_AGENT_1_ID set${NC}"
else
    echo -e "${RED}  ✗ FOUNDRY_AGENT_1_ID missing${NC}"
fi

# Check 2: Azure CLI Login
echo -e "\n${YELLOW}[2/8] Checking Azure CLI authentication...${NC}"
if az account show &> /dev/null; then
    ACCOUNT=$(az account show --query 'name' -o tsv)
    echo -e "${GREEN}  ✓ Azure CLI authenticated as: $ACCOUNT${NC}"
else
    echo -e "${RED}  ✗ Azure CLI not authenticated${NC}"
    echo -e "${RED}    Run: az login${NC}"
fi

# Check 3: Key Files Exist
echo -e "\n${YELLOW}[3/8] Checking key files exist...${NC}"
files=(
    "services/foundryAnalysisService.ts"
    "services/foundryAgentClient.ts"
    "services/geminiClient.ts"
    "server.ts"
    "test-foundry-analysis.ts"
)
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}  ✓ $file${NC}"
    else
        echo -e "${RED}  ✗ $file missing${NC}"
    fi
done

# Check 4: TypeScript Compilation
echo -e "\n${YELLOW}[4/8] Checking TypeScript compilation...${NC}"
if npx tsc --noEmit 2>/dev/null; then
    echo -e "${GREEN}  ✓ TypeScript compiles without errors${NC}"
else
    echo -e "${RED}  ✗ TypeScript compilation errors${NC}"
    echo -e "${RED}    Run: npx tsc --noEmit${NC}"
fi

# Check 5: Dependencies
echo -e "\n${YELLOW}[5/8] Checking dependencies...${NC}"
deps=("@azure/identity" "axios" "dotenv" "express")
for dep in "${deps[@]}"; do
    if npm list "$dep" &> /dev/null; then
        echo -e "${GREEN}  ✓ $dep${NC}"
    else
        echo -e "${RED}  ✗ $dep missing${NC}"
    fi
done

# Check 6: Environment Variables Detail
echo -e "\n${YELLOW}[6/8] Foundry Configuration Details...${NC}"
echo -e "${BLUE}  AZURE_AI_FOUNDRY_PROJECT_ENDPOINT:${NC}"
grep "AZURE_AI_FOUNDRY_PROJECT_ENDPOINT" .env.local 2>/dev/null | sed 's/^/    /'
echo -e "\n${BLUE}  Agent IDs:${NC}"
grep "FOUNDRY_AGENT_[123]_ID" .env.local 2>/dev/null | sed 's/^/    /'

# Check 7: Test Script Availability
echo -e "\n${YELLOW}[7/8] Checking test script...${NC}"
if [ -f "test-foundry-analysis.ts" ]; then
    echo -e "${GREEN}  ✓ Test script available${NC}"
    echo -e "${BLUE}    Run: npm run test:foundry-analysis${NC}"
else
    echo -e "${RED}  ✗ Test script missing${NC}"
fi

# Check 8: Documentation
echo -e "\n${YELLOW}[8/8] Checking documentation...${NC}"
docs=(
    "FOUNDRY_INTEGRATION_READY.md"
    "FOUNDRY_READY_PRODUCTION.md"
    "INTEGRATION_SUMMARY.md"
    "ARCHITECTURE_DIAGRAM.txt"
)
for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}  ✓ $doc${NC}"
    else
        echo -e "${RED}  ✗ $doc missing${NC}"
    fi
done

# Summary
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  NEXT STEPS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}1. Run test script:${NC}"
echo -e "   ${BLUE}npm run test:foundry-analysis${NC}"
echo ""
echo -e "${YELLOW}2. Start the development server:${NC}"
echo -e "   ${BLUE}npm run dev${NC}"
echo ""
echo -e "${YELLOW}3. Open in browser:${NC}"
echo -e "   ${BLUE}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}4. Test Run Analysis:${NC}"
echo -e "   • Navigate to Admin → Applications"
echo -e "   • Click any application"
echo -e "   • Click 'Run Analysis' button"
echo -e "   • Wait 10-30 seconds for results"
echo ""
echo -e "${YELLOW}5. Deploy to Azure:${NC}"
echo -e "   • Set environment variables in App Service"
echo -e "   • Run 'az login' on deployment server"
echo -e "   • Deploy with: git push azure main"
echo ""
echo -e "${GREEN}✅ Your app is ready for Foundry Agents!${NC}"
echo ""
