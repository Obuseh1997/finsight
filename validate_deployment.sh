#!/bin/bash

# Deployment Validation Script
# Run this before pushing to catch deployment issues early

set -e  # Exit on any error

echo "🔍 Validating deployment readiness..."
echo ""

# Check Node.js version
echo "1️⃣ Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "   Local Node.js: $NODE_VERSION"
NETLIFY_NODE=$(grep "NODE_VERSION" netlify.toml | cut -d'"' -f2)
echo "   Netlify Node.js: $NETLIFY_NODE"

if [[ "$NODE_VERSION" < "v20.9.0" ]]; then
  echo "   ⚠️  Warning: Local Node.js is older than Netlify requirement (20.9.0)"
fi
echo "   ✅ Node.js version check passed"
echo ""

# Check Python dependencies
echo "2️⃣ Checking Python dependencies..."
if command -v python3 &> /dev/null; then
  PYTHON_VERSION=$(python3 --version)
  echo "   $PYTHON_VERSION installed"

  # Check if required packages are installed
  if python3 -c "import pdfplumber" 2>/dev/null; then
    echo "   ✅ pdfplumber installed"
  else
    echo "   ⚠️  pdfplumber not installed (required for production)"
  fi

  if python3 -c "import dateutil" 2>/dev/null; then
    echo "   ✅ python-dateutil installed"
  else
    echo "   ⚠️  python-dateutil not installed (required for production)"
  fi
else
  echo "   ❌ Python3 not found"
  exit 1
fi
echo ""

# Run Next.js build
echo "3️⃣ Running Next.js production build..."
cd pdf-insights-app
npm run build
cd ..
echo "   ✅ Next.js build successful"
echo ""

# Check for TypeScript errors
echo "4️⃣ Running TypeScript type check..."
cd pdf-insights-app
npx tsc --noEmit
cd ..
echo "   ✅ TypeScript check passed"
echo ""

# Verify critical files exist
echo "5️⃣ Verifying critical files..."
REQUIRED_FILES=(
  "netlify.toml"
  "requirements.txt"
  "pdf-insights-app/package.json"
  "pdf-insights-app/next.config.ts"
  "extract-pdfplumber.py"
  "build_dictionary.py"
  "match_merchants.py"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ Missing: $file"
    exit 1
  fi
done
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All validation checks passed!"
echo ""
echo "Safe to deploy:"
echo "  git push origin main"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
