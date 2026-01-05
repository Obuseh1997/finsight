# FinSight - Bank Statement Insights Tool

**Understand your spending with intelligent transaction analysis. 100% private, processed locally.**

![FinSight](https://img.shields.io/badge/Status-Production%20Ready-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🚀 Features

- **📄 PDF Bank Statement Extraction** - Upload up to 6 bank statements (CIBC, RBC, TD supported)
- **🔍 Smart Merchant Recognition** - Pattern-based merchant normalization and categorization
- **📊 Spending Insights** - Visual breakdowns by category and merchant
- **🔄 Recurring Charge Detection** - Automatically identifies subscriptions
- **🎓 Learning System** - Learns from your corrections to improve accuracy
- **🔒 100% Private** - All processing happens locally, no data sent to servers
- **📥 CSV Export** - Download your insights for Excel/Google Sheets
- **🌓 Dark Mode** - Beautiful UI in light and dark themes

## 📋 Quick Start

### Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **npm or yarn**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/finsight.git
cd finsight

# 2. Install Python dependencies
pip3 install pdfplumber python-dateutil

# 3. Install Next.js app dependencies
cd pdf-insights-app
npm install
cd ..
```

### Running Locally

```bash
# Start the Next.js development server
cd pdf-insights-app
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Architecture

```
FinSight/
├── pdf-insights-app/          # Next.js web application
│   ├── app/                   # App router pages
│   │   ├── page.tsx          # Landing/upload page
│   │   ├── review/page.tsx   # Low-confidence review
│   │   └── insights/page.tsx # Final insights
│   ├── components/           # React components
│   ├── lib/                  # API client & utilities
│   └── public/              # Static assets
│
├── Python Backend Scripts
│   ├── extract-pdfplumber.py       # PDF text extraction
│   ├── merge_statements.py         # Multi-statement merging
│   ├── build_dictionary.py         # Merchant dictionary
│   ├── match_merchants.py          # Merchant matching
│   ├── calculate_confidence.py    # Confidence scoring
│   ├── generate_insights.py       # Insights generation
│   ├── merchant_dictionary.py     # Dictionary class
│   ├── normalize_merchant.py      # Name normalization
│   └── scrub_pii.py              # PII protection
│
├── Configuration
│   ├── seed_merchant_dictionary.json  # Pre-populated merchants
│   ├── parsers/                       # Bank-specific parsers
│   └── scrubbers/                     # Bank-specific scrubbers
│
└── Documentation
    ├── README.md                # This file
    ├── ARCHITECTURE.md          # System design
    ├── DEPLOYMENT.md            # Deployment guide
    └── docs/                    # Implementation docs
```

## 🔄 Processing Pipeline

1. **Upload** → User uploads PDF bank statements via browser
2. **Extract** → Python (pdfplumber) extracts transactions using bank-specific parsers
3. **Merge** → Combines multiple statements, removes duplicates
4. **Match** → Matches merchants to dictionary using string normalization
5. **Categorize** → Assigns categories based on pattern matching rules
6. **Score** → Calculates confidence scores (dictionary match + pattern match)
7. **Review** → User corrects low-confidence transactions
8. **Learn** → System adds corrections to merchant dictionary
9. **Insights** → Generates spending analysis and visualizations

## 🧠 How Merchant Recognition Works

**No AI APIs used** - All processing is local and rule-based:

1. **Normalization**: Cleans merchant names (removes numbers, special chars, standardizes case)
2. **Dictionary Lookup**: Checks against known merchants (seed + learned)
3. **Pattern Matching**: Uses keyword patterns for categories (e.g., "grocery" words → Groceries)
4. **Confidence Scoring**: 
   - High (90-100%): Exact dictionary match
   - Medium (60-89%): Pattern match or partial match
   - Low (<60%): Unknown merchant → sent for user review

## 🎯 Supported Banks

Currently tested and working with:
- **CIBC** (Canadian Imperial Bank of Commerce)
- **RBC** (Royal Bank of Canada)
- **TD** (Toronto-Dominion Bank)

*Other Canadian banks may work but are untested. International banks require adding custom parsers.*

## 🔒 Privacy & Security

- **100% Local Processing** - All PDF parsing runs in your browser via Python child processes
- **No Cloud Storage** - Data never leaves your computer
- **PII Scrubbing** - Sensitive info (account numbers, addresses) automatically removed
- **Client-Side Storage** - Uses browser localStorage (cleared when you start over)
- **No Signup Required** - No account creation, no tracking
- **No External APIs** - No calls to OpenAI, Claude, or other services

## 📊 Learning System

The system improves over time through user feedback:

1. **Merchant Normalization** - Learns variations of merchant names (e.g., "MCDONALD'S #123" → "McDonald's")
2. **Category Assignment** - Remembers your category choices
3. **Dictionary Growth** - Expands merchant database with each correction
4. **Confidence Improvement** - Gets more accurate as dictionary grows

**Example**:
- First time seeing "SKIP THE DISHES #456" → Low confidence, asks user
- User confirms: "SkipTheDishes" → "Food Delivery"
- Next time "SKIP*DISHES" appears → High confidence, auto-categorized

## 🛠️ Development

### Local Validation

Test the Python pipeline without the web interface:

```bash
# Validate with a sample PDF
./validate_local.sh path/to/statement.pdf
```

This runs the full pipeline and shows output at each step.

### Adding New Banks

1. Create parser in `parsers/[bank-name].js` (JavaScript regex patterns)
2. Create scrubber in `scrubbers/[bank-name].js` (PII removal rules)
3. Update `extract-pdfplumber.py` to detect and use parser
4. Test with sample statements using `validate_local.sh`

### Project Structure

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed file organization.

## 📦 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions for:
- **Netlify** (recommended for Next.js + Python Functions)
- **Vercel** (serverless functions)
- **Self-hosted** (Docker or VPS)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/), [Python](https://www.python.org/), and [pdfplumber](https://github.com/jsvine/pdfplumber)
- Inspired by the need for private, local financial analysis tools

---

**Made with ❤️ for privacy-conscious Canadians**
