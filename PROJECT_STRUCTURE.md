# PDF Insights - Project Structure

## Overview
Clean, organized folder structure for deployment and development.

---

## Root Directory Structure

```
pdf-test/
├── design/                    # Design system and mockups
│   ├── design_system.md
│   └── *.png
│
├── pdf-insights-app/         # Next.js frontend application
│   ├── app/                  # App router pages
│   ├── lib/                  # Shared utilities
│   └── public/              # Static assets
│
├── output/                   # Generated files (gitignored)
│   ├── extracted/           # Raw PDF extractions
│   ├── merged/              # Merged statements
│   ├── scored/              # Confidence-scored data
│   ├── insights/            # Generated insights
│   ├── dictionaries/        # Merchant dictionaries
│   └── analysis/            # Analysis reports
│
├── docs/                     # Documentation
│   └── implementation/      # Implementation docs
│
├── temp/                     # Temporary files (gitignored)
│
├── *.py                     # Python processing scripts
├── merchant_dictionary.json # Active merchant dictionary
└── README.md               # Main documentation
```

---

## Key Directories

### `/design` - Design System
Contains all design-related files:
- `design_system.md` - Component specifications
- Mockups and screenshots

### `/pdf-insights-app` - Frontend Application
Next.js 16 application with TypeScript:
```
app/
  ├── page.tsx              # Home/upload page
  ├── review/page.tsx       # Transaction review
  ├── insights/page.tsx     # Spending insights
  └── api/
      ├── extract/          # PDF extraction endpoint
      ├── merge/            # Statement merging
      ├── confidence/       # Confidence scoring
      ├── insights/         # Insights generation
      └── learn-merchant/   # Merchant learning
```

### `/output` - Generated Files
**GITIGNORED** - Contains all output from processing:

- **`extracted/`** - Raw JSON from PDF extraction
  - `cibc-oct-2025.json`
  - `chequing-aug-2025.json`

- **`merged/`** - Deduplicated merged statements
  - `merged-2025-10-15.json`

- **`scored/`** - Confidence-scored transactions
  - `scored-2025-10-15.json`

- **`insights/`** - Generated insights
  - `insights-2025-10-15.json`

- **`dictionaries/`** - Merchant dictionaries
  - `merchant_dictionary_backup.json`
  - `example_merchant_dictionary.json`

- **`analysis/`** - Analysis reports
  - `merchant-analysis.json`

### `/docs` - Documentation
All documentation organized by type:

- **`implementation/`** - Implementation guides
  - `MERCHANT_LEARNING_IMPLEMENTATION.md`
  - `CATEGORY_VISUALS_IMPLEMENTATION.md`
  - `VALIDATION_GUIDE.md`

### `/temp` - Temporary Files
**GITIGNORED** - Scratch space for temporary files

---

## Python Scripts (Root Level)

### Processing Pipeline
- `extract-pdfplumber.py` - PDF extraction (Layer 0)
- `normalize_merchant.py` - Merchant normalization (Layer 1)
- `merchant_dictionary.py` - Dictionary lookup (Layer 2)
- `calculate_confidence.py` - Confidence scoring (Layer 3)
- `merge_statements.py` - Statement deduplication
- `generate_insights.py` - Insights generation

### Dictionary & Learning
- `dictionary_guardrails.py` - Quality validation
- `build_merchant_dict.py` - Dictionary builder
- `clean_dictionary.py` - Dictionary cleanup
- `check_dictionary.py` - Dictionary inspection

### Testing
- `test_merchant_learning.py` - Learning system tests
- `test_e2e_learning.py` - End-to-end tests
- `test_api.sh` - API integration tests

---

## Configuration Files

### Root
- `.gitignore` - Git ignore rules
- `README.md` - Project overview
- `merchant_dictionary.json` - Active merchant dictionary (gitignored)

### Frontend
- `pdf-insights-app/package.json` - NPM dependencies
- `pdf-insights-app/tsconfig.json` - TypeScript config
- `pdf-insights-app/tailwind.config.ts` - Tailwind CSS config
- `pdf-insights-app/next.config.ts` - Next.js config

---

## Output File Naming Convention

### Extracted Files
Format: `{bank}-{month}-{year}.json`
- `cibc-oct-2025.json`
- `chequing-aug-2025.json`

### Merged Files
Format: `merged-{date}.json`
- `merged-2025-10-15.json`

### Scored Files
Format: `scored-{date}.json`
- `scored-2025-10-15.json`

### Insights Files
Format: `insights-{date}.json`
- `insights-2025-10-15.json`

---

## Deployment Checklist

### Before Deployment

1. **Clean output directory**
   ```bash
   rm -rf output/*
   mkdir -p output/{extracted,merged,scored,insights,dictionaries,analysis}
   ```

2. **Backup merchant dictionary**
   ```bash
   cp merchant_dictionary.json output/dictionaries/merchant_dictionary_backup.json
   ```

3. **Check gitignore**
   - Verify `output/` is ignored
   - Verify `temp/` is ignored
   - Verify `merchant_dictionary.json` is ignored

4. **Build frontend**
   ```bash
   cd pdf-insights-app
   npm run build
   ```

5. **Test production build**
   ```bash
   npm run start
   ```

### Deployment Structure

```
production/
├── pdf-insights-app/       # Next.js app
├── *.py                   # Python scripts
├── merchant_dictionary.json
└── output/                # Empty folders
    ├── extracted/
    ├── merged/
    ├── scored/
    ├── insights/
    ├── dictionaries/
    └── analysis/
```

---

## Environment Variables

Create `.env.local` in `pdf-insights-app/`:

```env
# No secrets needed - everything is local!
# All processing happens client-side or via local Python
```

---

## File Size Guidelines

- **Keep under 100MB**: Individual JSON files
- **Monitor**: `output/` directory size
- **Archive**: Old statements after 6 months
- **Clean**: Temp files regularly

---

## Maintenance

### Weekly
- Clean `temp/` directory
- Archive old `output/` files

### Monthly
- Backup `merchant_dictionary.json`
- Review `output/analysis/` for quality

### As Needed
- Update `.gitignore` for new file types
- Document new output formats

---

*Last Updated: 2025-12-29*
*Structure Version: 2.0*
