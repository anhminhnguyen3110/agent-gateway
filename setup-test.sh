#!/bin/bash

# External Authorization Testing Script
# This script helps you run all components for testing

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Agent Gateway - External Authorization Test Setup   ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if running in the correct directory
if [ ! -f "agentgateway.exe" ]; then
    echo "❌ Error: agentgateway.exe not found in current directory"
    echo "   Please run this script from the agentgateway root directory"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
echo ""

if ! command_exists node; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
else
    echo "✓ Node.js is installed: $(node --version)"
fi

if ! command_exists npm; then
    echo "❌ npm is not installed"
    exit 1
else
    echo "✓ npm is installed: $(npm --version)"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install server dependencies
if [ ! -d "server/node_modules" ]; then
    echo "Installing authorization server dependencies..."
    cd server && npm install && cd ..
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install server dependencies"
        exit 1
    fi
    echo "✓ Server dependencies installed"
else
    echo "✓ Server dependencies already installed"
fi

# Install MCP client dependencies
if [ ! -d "mcp/node_modules" ]; then
    echo "Installing MCP client dependencies..."
    cd mcp && npm install && cd ..
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install MCP client dependencies"
        exit 1
    fi
    echo "✓ MCP client dependencies installed"
else
    echo "✓ MCP client dependencies already installed"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Start the Authorization Server (Terminal 1):"
echo "    cd server && npm start"
echo ""
echo "2️⃣  Start the Agent Gateway (Terminal 2):"
echo "    ./agentgateway.exe"
echo ""
echo "3️⃣  Run the Tests (Terminal 3):"
echo "    cd mcp && npm test"
echo ""
echo "📖 For detailed instructions, see TESTING_GUIDE.md"
echo "⚡ For quick reference, see QUICKSTART.md"
echo ""
