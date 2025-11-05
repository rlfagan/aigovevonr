#!/bin/bash

# AI Governance Shield - VS Code Extension
# Development Installation Script

set -e

echo "🛡️  AI Governance Shield - VS Code Extension Installer"
echo "======================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the vscode-extension directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Compiling TypeScript..."
npm run compile

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo ""
echo "✅ Extension compiled successfully!"
echo ""
echo "🚀 Choose installation method:"
echo ""
echo "Option 1: Development Mode (Recommended for testing)"
echo "  - Press F5 in VS Code to launch Extension Development Host"
echo "  - Or run: code ."
echo ""
echo "Option 2: Package and Install"
read -p "Would you like to package and install now? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Packaging extension..."

    # Install vsce if not already installed
    if ! command -v vsce &> /dev/null; then
        echo "Installing @vscode/vsce..."
        npm install -g @vscode/vsce
    fi

    npm run package

    if [ -f "ai-governance-shield-0.1.0.vsix" ]; then
        echo ""
        echo "✅ Package created: ai-governance-shield-0.1.0.vsix"
        echo ""
        read -p "Install extension now? (y/N): " -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            code --install-extension ai-governance-shield-0.1.0.vsix
            echo ""
            echo "✅ Extension installed!"
            echo ""
            echo "📝 Next steps:"
            echo "1. Restart VS Code"
            echo "2. Configure settings (Ctrl+Shift+P → 'Preferences: Open Settings')"
            echo "3. Set aiGovernance.userEmail and aiGovernance.apiUrl"
            echo "4. Look for shield icon 🛡️ in status bar"
        fi
    else
        echo "❌ Package creation failed"
        exit 1
    fi
else
    echo ""
    echo "📝 Manual installation steps:"
    echo ""
    echo "Development Mode:"
    echo "  1. Open this folder in VS Code: code ."
    echo "  2. Press F5 to launch Extension Development Host"
    echo ""
    echo "Or package manually:"
    echo "  npm run package"
    echo "  code --install-extension ai-governance-shield-0.1.0.vsix"
fi

echo ""
echo "🎉 Setup complete!"
