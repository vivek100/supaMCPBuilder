#!/bin/bash

# SupaMCPBuilder Publishing Script
echo "🚀 SupaMCPBuilder Publishing Script"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git repository not initialized."
    exit 1
fi

# Build the project
echo "📦 Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes:"
    git status --short
    read -p "Do you want to commit these changes? (y/N): " commit
    if [ "$commit" = "y" ] || [ "$commit" = "Y" ]; then
        read -p "Enter commit message: " message
        git add .
        git commit -m "$message"
    else
        echo "❌ Please commit your changes before publishing."
        exit 1
    fi
fi

# Check if GitHub repository exists
echo "🔍 Checking GitHub repository..."
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "❌ No GitHub remote found. Please create the repository first:"
    echo "   1. Go to https://github.com/new"
    echo "   2. Create repository 'supaMCPBuilder'"
    echo "   3. Run: git remote add origin https://github.com/vivek100/supaMCPBuilder.git"
    exit 1
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main
if [ $? -ne 0 ]; then
    echo "❌ Failed to push to GitHub!"
    exit 1
fi

# Test package locally
echo "🧪 Testing package locally..."
npm pack
if [ $? -ne 0 ]; then
    echo "❌ npm pack failed!"
    exit 1
fi

# Check if logged into npm
echo "🔐 Checking npm login..."
npmUser=$(npm whoami 2>/dev/null)
if [ -z "$npmUser" ]; then
    echo "❌ Not logged into npm. Please run 'npm login' first."
    exit 1
fi
echo "✅ Logged in as: $npmUser"

# Final confirmation
echo ""
echo "📋 Pre-publish checklist:"
echo "   ✅ Project built successfully"
echo "   ✅ All changes committed"
echo "   ✅ Pushed to GitHub"
echo "   ✅ Package tested locally"
echo "   ✅ Logged into npm as $npmUser"
echo ""

read -p "Ready to publish to npm? This action cannot be undone! (y/N): " publish
if [ "$publish" = "y" ] || [ "$publish" = "Y" ]; then
    echo "🚀 Publishing to npm..."
    npm publish
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Successfully published supamcpbuilder to npm!"
        echo ""
        echo "📝 Next steps:"
        echo "   • Test installation: npm install -g supamcpbuilder"
        echo "   • Test with npx: npx supamcpbuilder --help"
        echo "   • Update your MCP config to use: npx supamcpbuilder"
        echo ""
        echo "🔗 Package URL: https://www.npmjs.com/package/supamcpbuilder"
    else
        echo "❌ Publishing failed!"
        exit 1
    fi
else
    echo "📦 Publish cancelled. The package is ready when you are!"
    echo "   Run 'npm publish' manually when ready."
fi

# Clean up
rm -f *.tgz
echo "✨ Done!" 