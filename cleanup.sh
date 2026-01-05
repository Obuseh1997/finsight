#!/bin/bash
# Cleanup and reorganize project structure

echo "🧹 Cleaning up pdf-test project..."

# Create archive directory for old experiments
mkdir -p archive/nodejs-experiments
mkdir -p archive/test-outputs
mkdir -p archive/debug-scripts

# Move old Node.js experiments
echo "📦 Archiving old Node.js scripts..."
mv extract-coordinates.js archive/nodejs-experiments/ 2>/dev/null
mv extract-table-v2.js archive/nodejs-experiments/ 2>/dev/null
mv extract-table.js archive/nodejs-experiments/ 2>/dev/null
mv extract.js archive/nodejs-experiments/ 2>/dev/null
mv parseTransactions-v2.js archive/nodejs-experiments/ 2>/dev/null
mv parseTransactions-v3.js archive/nodejs-experiments/ 2>/dev/null
mv parseTransactions.js archive/nodejs-experiments/ 2>/dev/null
mv scrubPII-v2.js archive/nodejs-experiments/ 2>/dev/null
mv scrubPII.js archive/nodejs-experiments/ 2>/dev/null
mv package.json archive/nodejs-experiments/ 2>/dev/null
mv package-lock.json archive/nodejs-experiments/ 2>/dev/null

# Move test outputs
echo "📦 Archiving test outputs..."
mv phase1-raw-extraction.json archive/test-outputs/ 2>/dev/null
mv phase2-fixed-extraction.json archive/test-outputs/ 2>/dev/null
mv phase3-page-fixed.json archive/test-outputs/ 2>/dev/null
mv cibc-retest.json archive/test-outputs/ 2>/dev/null
mv categorization-input-CIBC-Statement---Nov-25.json archive/test-outputs/ 2>/dev/null
mv categorization-input.json archive/test-outputs/ 2>/dev/null
mv coordinates.json archive/test-outputs/ 2>/dev/null
mv scrubbed-CIBC-Statement---Nov-25.json archive/test-outputs/ 2>/dev/null
mv test-extracted.json archive/test-outputs/ 2>/dev/null
mv transactions-cibc-v3.json archive/test-outputs/ 2>/dev/null
mv transactions-cibc.json archive/test-outputs/ 2>/dev/null
mv transactions-pdfplumber-scrubbed.json archive/test-outputs/ 2>/dev/null
mv transactions-pdfplumber.json archive/test-outputs/ 2>/dev/null
mv transactions-table.json archive/test-outputs/ 2>/dev/null
mv transactions.json archive/test-outputs/ 2>/dev/null
mv output-scrubbed-v2.txt archive/test-outputs/ 2>/dev/null
mv output-scrubbed.txt archive/test-outputs/ 2>/dev/null
mv output.txt archive/test-outputs/ 2>/dev/null

# Move debug scripts
echo "📦 Archiving debug scripts..."
mv debug_extraction.py archive/debug-scripts/ 2>/dev/null
mv debug_parser.py archive/debug-scripts/ 2>/dev/null
mv extract-pdfplumber-debug.py archive/debug-scripts/ 2>/dev/null

# Keep these test files as examples
echo "✅ Keeping example outputs..."
# final-test.json - good CIBC example
# rbc-test.json - good RBC example
# matched-results.json - merchant dictionary example

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📁 Project structure:"
echo "  Core scripts: 11 Python files + 1 shell script"
echo "  Documentation: 5 markdown files"
echo "  Example outputs: final-test.json, rbc-test.json, matched-results.json"
echo "  Merchant data: merchant_dictionary.json, example_merchant_dictionary.json"
echo ""
echo "📦 Archived:"
echo "  - archive/nodejs-experiments/ (11 files)"
echo "  - archive/test-outputs/ (18 files)"
echo "  - archive/debug-scripts/ (3 files)"
