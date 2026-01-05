#!/bin/bash
# Local Validation Script
# Tests the complete pipeline with a real PDF

echo "🧪 PDF Insights - Local Validation"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test PDF
TEST_PDF="/Users/emekeobuseh/Downloads/CIBC Statement - Oct 25.pdf"

if [ ! -f "$TEST_PDF" ]; then
    echo -e "${RED}❌ Test PDF not found: $TEST_PDF${NC}"
    exit 1
fi

echo "📄 Test PDF: CIBC Statement - Oct 25.pdf"
echo ""

# Step 1: Extract
echo "Step 1/5: Extracting transactions from PDF..."
python3 extract-pdfplumber.py "$TEST_PDF" output/extracted/validation-test.json --scrub
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Extraction successful${NC}"
    TRANSACTION_COUNT=$(python3 -c "import json; data=json.load(open('output/extracted/validation-test.json')); print(len(data['transactions']))")
    echo "   Found $TRANSACTION_COUNT transactions"
else
    echo -e "${RED}❌ Extraction failed${NC}"
    exit 1
fi
echo ""

# Step 2: Merge (skip for single file, just copy)
echo "Step 2/6: Preparing merged file..."
cp output/extracted/validation-test.json output/merged/validation-merged.json
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ File prepared${NC}"
    echo "   (Single file - merge not needed)"
else
    echo -e "${RED}❌ File copy failed${NC}"
    exit 1
fi
echo ""

# Step 3: Build merchant dictionary
echo "Step 3/6: Building merchant dictionary..."
python3 build_dictionary.py output/merged/validation-merged.json merchant_dictionary.json
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dictionary built${NC}"
    DICT_SIZE=$(python3 -c "from merchant_dictionary import MerchantDictionary; d=MerchantDictionary('merchant_dictionary.json'); stats=d.get_stats(); print(stats['unique_merchants'])")
    echo "   Dictionary has $DICT_SIZE merchants"
else
    echo -e "${RED}❌ Dictionary building failed${NC}"
    exit 1
fi
echo ""

# Step 4: Match merchants to dictionary (assign categories)
echo "Step 4/6: Matching merchants and assigning categories..."
python3 match_merchants.py output/merged/validation-merged.json output/merged/validation-matched.json merchant_dictionary.json
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Categories assigned${NC}"
    # Use matched file for next step
    cp output/merged/validation-matched.json output/merged/validation-merged.json
else
    echo -e "${RED}❌ Merchant matching failed${NC}"
    exit 1
fi
echo ""

# Step 5: Calculate confidence
echo "Step 5/6: Calculating confidence scores..."
python3 calculate_confidence.py output/merged/validation-merged.json output/merged/validation-merged-scored.json
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Confidence scoring successful${NC}"
    # Move to scored directory
    mv output/merged/validation-merged-scored.json output/scored/validation-scored.json 2>/dev/null || true
    LOW_CONF=$(python3 -c "import json; data=json.load(open('output/scored/validation-scored.json')); print(len([t for t in data.get('low_confidence_transactions', [])]))")
    echo "   Low confidence transactions: $LOW_CONF"
else
    echo -e "${RED}❌ Confidence scoring failed${NC}"
    exit 1
fi
echo ""

# Step 6: Generate insights
echo "Step 6/6: Generating insights..."
python3 generate_insights.py output/scored/validation-scored.json --output output/insights/validation-insights.json
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Insights generation successful${NC}"
    TOTAL_SPENT=$(python3 -c "import json; data=json.load(open('output/insights/validation-insights.json')); print(f\"\${data['summary']['total_spent']:.2f}\")")
    TOP_MERCHANT=$(python3 -c "import json; data=json.load(open('output/insights/validation-insights.json')); merchants=data.get('top_merchants',[]); print(merchants[0]['merchant_display'] if merchants else 'None')")
    echo "   Total spent: \$$TOTAL_SPENT"
    echo "   Top merchant: $TOP_MERCHANT"
else
    echo -e "${RED}❌ Insights generation failed${NC}"
    exit 1
fi
echo ""

# Summary: Check final dictionary
echo ""
echo "📊 Final Dictionary Status:"
DICT_SIZE=$(python3 -c "from merchant_dictionary import MerchantDictionary; d=MerchantDictionary('merchant_dictionary.json'); stats=d.get_stats(); print(stats['unique_merchants'])")
echo "   Dictionary has $DICT_SIZE merchants"
echo ""

# Summary
echo "=================================="
echo -e "${GREEN}✅ All validation tests passed!${NC}"
echo ""
echo "📊 Summary:"
echo "   Transactions extracted: $TRANSACTION_COUNT"
echo "   Low confidence: $LOW_CONF"
echo "   Total spent: \$$TOTAL_SPENT"
echo "   Top merchant: $TOP_MERCHANT"
echo "   Dictionary size: $DICT_SIZE merchants"
echo ""
echo "🌐 Next.js app running at: http://localhost:3000"
echo ""
echo "📁 Output files:"
echo "   output/extracted/validation-test.json"
echo "   output/merged/validation-merged.json"
echo "   output/scored/validation-scored.json"
echo "   output/insights/validation-insights.json"
echo ""
echo "🎯 Ready to test in browser!"
