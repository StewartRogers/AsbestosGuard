#!/bin/bash

echo "============================================================"
echo "Azure AI Foundry Native Agent Setup"
echo "============================================================"
echo ""

echo "[1/4] Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python not found. Please install Python 3.11 or later."
    echo "Download from: https://www.python.org/downloads/"
    exit 1
fi
python3 --version

echo ""
echo "[2/4] Installing Python dependencies..."
echo "Running: pip install -r requirements.txt"
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Python dependencies"
    exit 1
fi

echo ""
echo "[3/4] Building TypeScript..."
echo "Running: npm run build"
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: TypeScript build failed"
    exit 1
fi

echo ""
echo "[4/4] Setup complete!"
echo ""
echo "============================================================"
echo "NEXT STEPS:"
echo "============================================================"
echo ""
echo "1. Start the Agent Bridge Service:"
echo "   npm run agent-bridge"
echo ""
echo "2. In a new terminal, test it works:"
echo "   npm run test:foundry-analysis"
echo ""
echo "3. OR start everything together:"
echo "   npm run start:with-bridge"
echo ""
echo "============================================================"
echo ""
echo "For detailed instructions, see: NATIVE_AGENT_SETUP.md"
echo ""
