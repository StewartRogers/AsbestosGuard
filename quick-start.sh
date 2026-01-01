#!/bin/bash
# Quick start script for Azure AI Foundry setup
# Usage: ./quick-start.sh

set -e

echo "🚀 AsbestosGuard - Azure AI Foundry Quick Start"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    echo ""
    echo "Creating .env.local with template..."
    echo ""
    echo "Enter your Azure AI Foundry Project Endpoint:"
    echo "(Example: https://your-project.services.ai.azure.com/api/projects/your-project)"
    read -p "Endpoint: " ENDPOINT
    
    echo ""
    echo "Enter your first Agent ID or Name:"
    echo "(Example: EFSAGENT)"
    read -p "Agent 1 ID: " AGENT_1
    
    cat > .env.local << EOF
# Azure AI Foundry Configuration
AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=${ENDPOINT}
FOUNDRY_AGENT_1_ID=${AGENT_1}

# Optional: Additional agents
# FOUNDRY_AGENT_2_ID=APPRISKANALYSIS
# FOUNDRY_AGENT_3_ID=EMPWEBPROFILEAGENT
EOF

    echo -e "${GREEN}✅ Created .env.local${NC}"
else
    echo -e "${GREEN}✅ .env.local already exists${NC}"
fi

echo ""
echo -e "${BLUE}📋 Validation Check...${NC}"

# Run validation
npx tsx validate-foundry-setup.ts

echo ""
echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
pip install fastapi uvicorn azure-identity azure-ai-projects python-dotenv

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}📚 Next Steps:${NC}"
echo ""
echo "1. Start the bridge service in Terminal 1:"
echo -e "   ${YELLOW}npm run agent-bridge${NC}"
echo ""
echo "2. Start the app in Terminal 2:"
echo -e "   ${YELLOW}npm run start:dev${NC}"
echo ""
echo "Or start both at once:"
echo -e "   ${YELLOW}npm run start:with-bridge${NC}"
echo ""
echo "3. Test the connection:"
echo -e "   ${YELLOW}npm run test:foundry${NC}"
echo ""
echo -e "${BLUE}💡 Useful commands:${NC}"
echo "   npm run discover:agents      - List all available agents"
echo "   npm run validate:setup       - Check configuration"
echo "   npm run test:foundry-analysis - Test analysis endpoint"
echo ""
