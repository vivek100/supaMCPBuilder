# SupaMCPBuilder Publishing Script
Write-Host "🚀 SupaMCPBuilder Publishing Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Check if git is initialized
if (!(Test-Path ".git")) {
    Write-Host "❌ Error: Git repository not initialized." -ForegroundColor Red
    exit 1
}

# Build the project
Write-Host "📦 Building project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Check if there are uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    $commit = Read-Host "Do you want to commit these changes? (y/N)"
    if ($commit -eq "y" -or $commit -eq "Y") {
        $message = Read-Host "Enter commit message"
        git add .
        git commit -m $message
    } else {
        Write-Host "❌ Please commit your changes before publishing." -ForegroundColor Red
        exit 1
    }
}

# Check if GitHub repository exists
Write-Host "🔍 Checking GitHub repository..." -ForegroundColor Yellow
$remoteUrl = git remote get-url origin 2>$null
if (!$remoteUrl) {
    Write-Host "❌ No GitHub remote found. Please create the repository first:" -ForegroundColor Red
    Write-Host "   1. Go to https://github.com/new" -ForegroundColor Gray
    Write-Host "   2. Create repository 'supaMCPBuilder'" -ForegroundColor Gray
    Write-Host "   3. Run: git remote add origin https://github.com/vivek100/supaMCPBuilder.git" -ForegroundColor Gray
    exit 1
}

# Push to GitHub
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push to GitHub!" -ForegroundColor Red
    exit 1
}

# Test package locally
Write-Host "🧪 Testing package locally..." -ForegroundColor Yellow
npm pack
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm pack failed!" -ForegroundColor Red
    exit 1
}

# Check if logged into npm
Write-Host "🔐 Checking npm login..." -ForegroundColor Yellow
$npmUser = npm whoami 2>$null
if (!$npmUser) {
    Write-Host "❌ Not logged into npm. Please run 'npm login' first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged in as: $npmUser" -ForegroundColor Green

# Final confirmation
Write-Host ""
Write-Host "📋 Pre-publish checklist:" -ForegroundColor Cyan
Write-Host "   ✅ Project built successfully" -ForegroundColor Green
Write-Host "   ✅ All changes committed" -ForegroundColor Green
Write-Host "   ✅ Pushed to GitHub" -ForegroundColor Green
Write-Host "   ✅ Package tested locally" -ForegroundColor Green
Write-Host "   ✅ Logged into npm as $npmUser" -ForegroundColor Green
Write-Host ""

$publish = Read-Host "Ready to publish to npm? This action cannot be undone! (y/N)"
if ($publish -eq "y" -or $publish -eq "Y") {
    Write-Host "🚀 Publishing to npm..." -ForegroundColor Yellow
    npm publish
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Successfully published supamcpbuilder to npm!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Next steps:" -ForegroundColor Cyan
        Write-Host "   • Test installation: npm install -g supamcpbuilder" -ForegroundColor Gray
        Write-Host "   • Test with npx: npx supamcpbuilder --help" -ForegroundColor Gray
        Write-Host "   • Update your MCP config to use: npx supamcpbuilder" -ForegroundColor Gray
        Write-Host ""
        Write-Host "🔗 Package URL: https://www.npmjs.com/package/supamcpbuilder" -ForegroundColor Blue
    } else {
        Write-Host "❌ Publishing failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "📦 Publish cancelled. The package is ready when you are!" -ForegroundColor Yellow
    Write-Host "   Run 'npm publish' manually when ready." -ForegroundColor Gray
}

# Clean up
Remove-Item *.tgz -ErrorAction SilentlyContinue
Write-Host "✨ Done!" -ForegroundColor Green 