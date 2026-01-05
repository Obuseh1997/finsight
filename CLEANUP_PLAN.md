# Cleanup Plan for Deployment

## Files to DELETE (Unused/Development Only)

### 1. Duplicate/Old Documentation
- `PROJECT-STRUCTURE.md` (duplicate of PROJECT_STRUCTURE.md)
- `README-MERCHANT-SYSTEM.md` (content merged into main README)
- `README-PIPELINE.md` (content merged into main README)
- `DEPLOYMENT_READY_SUMMARY.md` (outdated)
- `PIPELINE-TEST-RESULTS.md` (test results, not needed)
- `BROWSER_TEST_GUIDE.md` (internal testing doc)
- `MERCHANT_IMPROVEMENTS.md` (internal notes)
- `MERCHANT_LEARNING_FLOW.md` (internal notes)
- `Insights - Banking.md` (internal notes)

### 2. Unused Python Scripts
- `categorize_with_claude.py` (not in pipeline)
- `categorize_with_openai.py` (not in pipeline)
- `analyze_merchants.py` (development/debug only)
- `check_dictionary.py` (utility, not production)
- `clean_dictionary.py` (utility, not production)
- `prepare_for_categorization.py` (unused)
- `build_merchant_dict.py` (duplicate of build_dictionary.py)
- `test_e2e_learning.py` (test file)
- `test_merchant_learning.py` (test file)
- `validate_scrubbing.py` (test file)

### 3. Test Scripts
- `test_api.sh` (development only)
- `test_api2.sh` (development only)
- `test_api3.sh` (development only)
- `process_statement.sh` (replaced by validate_local.sh)

### 4. Temporary/Generated Files
- `matched-results.json` (test output)
- `merchant-dictionary.json` (user-specific, in .gitignore)
- `merchant_dictionary.json` (user-specific, in .gitignore)
- `test_merchant_dictionary.json` (test file)
- `temp/` directory (all contents)

### 5. Archive (Keep but Document)
- `archive/` - Keep for reference but document as "not production code"

## Files to KEEP (Production)

### Core Python Scripts
- `extract-pdfplumber.py` - PDF extraction
- `merge_statements.py` - Statement merging
- `build_dictionary.py` - Dictionary building
- `match_merchants.py` - Merchant matching
- `calculate_confidence.py` - Confidence scoring
- `generate_insights.py` - Insights generation
- `merchant_dictionary.py` - Dictionary class
- `normalize_merchant.py` - Merchant normalization
- `scrub_pii.py` - PII scrubbing
- `dictionary_guardrails.py` - Dictionary protection

### Supporting Files
- `seed_merchant_dictionary.json` - Seed data
- `validate_local.sh` - Validation script
- `cleanup.sh` - Cleanup script

### Directories
- `pdf-insights-app/` - Next.js app (entire directory)
- `parsers/` - Bank parsers
- `scrubbers/` - Bank scrubbers
- `utils/` - Utilities
- `docs/` - Keep implementation docs
- `design/` - Keep design system docs

### Documentation to Keep/Update
- `README.md` - Main README (UPDATE)
- `ARCHITECTURE.md` - System architecture (UPDATE)
- `PROJECT_STRUCTURE.md` - Project structure

## Actions

1. Delete files listed in "Files to DELETE"
2. Update .gitignore to ensure generated files are excluded
3. Create comprehensive README.md
4. Create DEPLOYMENT.md for deployment instructions
5. Update ARCHITECTURE.md with current state
