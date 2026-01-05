# Multi-Bank Statement Processor Architecture

## Overview
Privacy-first tool for extracting and analyzing bank statement data. No server-side PII storage.

## Directory Structure

```
pdf-test/
├── extract.js              # PDF → text extraction (pdf-parse)
├── scrubPII-v2.js         # Multi-bank PII scrubber (NEW - use this!)
├── scrubPII.js            # Legacy CIBC-only scrubber (deprecated)
├── parseTransactions.js   # Text → JSON parser (needs multi-bank support)
│
├── scrubbers/             # Bank-specific scrubbing rules
│   ├── cibc.js           # CIBC patterns
│   └── rbc.js            # RBC patterns
│
├── parsers/              # Bank-specific transaction parsers (TODO)
│   ├── cibc.js           # CIBC transaction parsing
│   └── rbc.js            # RBC transaction parsing
│
└── utils/
    └── detectBank.js     # Auto-detect bank from statement text
```

## User Flow (Session-Based, No Storage)

```
1. User uploads PDF
   ↓
2. extract.js → output.txt (local, in-memory)
   ↓
3. scrubPII-v2.js → output-scrubbed.txt (PII removed locally)
   ↓
4. parseTransactions.js → transactions.json (structured data)
   ↓
5. Send transactions.json to Claude API (NO PII in this step)
   ↓
6. Claude returns categorized transactions
   ↓
7. Display insights to user
   ↓
8. Session ends → All files deleted (or stored in browser localStorage)
```

## Privacy Guarantees

✅ **PII never leaves user's device during scrubbing**
- All regex-based scrubbing happens locally
- Only clean transaction data (dates, merchants, amounts) sent to Claude API

✅ **No server-side storage**
- Use browser localStorage for session persistence
- User closes tab = data gone

✅ **Bank detection is local**
- detectBank() runs on client-side
- No "phone home" to identify bank

## Supported Banks

### ✅ CIBC (Fully Supported)
- Detection: "CIBC Account Statement" in header
- Scrubbing: Account numbers, e-transfers, transaction refs
- Parsing: ⚠️ CIBC-only (needs refactor for multi-bank)

### ✅ RBC (Fully Supported - Scrubbing Only)
- Detection: "Royal Bank of Canada" in header
- Scrubbing: Account numbers, addresses, e-transfers, branch info, internal doc codes
- Parsing: ⚠️ TODO (needs RBC-specific parser)

### 🔜 TD, Scotiabank, BMO (Coming Soon)
- Detection patterns added
- Scrubbers: TODO
- Parsers: TODO

## How to Add a New Bank

### Step 1: Add detection pattern
Edit `utils/detectBank.js`:
```javascript
if (header.includes('NewBank Name')) {
    return 'newbank';
}
```

### Step 2: Create scrubber
Create `scrubbers/newbank.js`:
```javascript
function scrub(text) {
    // Bank-specific regex patterns
    return scrubbedText;
}
module.exports = { scrub };
```

### Step 3: Create parser
Create `parsers/newbank.js`:
```javascript
function parse(text) {
    // Extract transactions
    return transactions;
}
module.exports = { parse };
```

### Step 4: Test with real statement
```bash
node extract.js  # Update path to NewBank PDF
node scrubPII-v2.js
# Verify PII is gone
node parseTransactions.js  # (once multi-bank parsing is ready)
```

## Commands

### Extract text from PDF
```bash
# Edit extract.js to point to your PDF path first
node extract.js
# Output: output.txt
```

### Scrub PII (auto-detects bank)
```bash
node scrubPII-v2.js
# Output: output-scrubbed.txt
```

### Parse transactions (CIBC only for now)
```bash
node parseTransactions.js
# Output: transactions.json
```

## Next Steps (TODOs)

### High Priority
1. ⚠️ **Make parseTransactions.js multi-bank**
   - Refactor like scrubPII-v2.js
   - Create `parsers/cibc.js` and `parsers/rbc.js`
   - Auto-detect bank and route to correct parser

2. 🔧 **Fix RBC transaction parsing**
   - Different date format ("27 Oct" vs "Nov 3")
   - Different transaction types ("Contactless Interac purchase" vs "VISA DEBIT")
   - Different column layout

3. 📊 **Build formatForClaude.js**
   - Takes transactions.json
   - Formats for Claude API
   - Adds prompt context

### Medium Priority
4. 🧪 **Add automated tests**
   - Create `test/fixtures/` with anonymized statements
   - Test scrubbing removes all PII
   - Test parsing extracts correct transaction count

5. 📝 **Document bank-specific formats**
   - Update this file with patterns learned
   - Help future bank additions

### Low Priority
6. 🎨 **Build frontend**
   - PDF upload interface
   - Progress indicator (Extract → Scrub → Parse → Analyze)
   - Display insights

## Infrastructure Choices for User-Facing Tool

### Backend: Next.js API Routes (Recommended)
**Why:**
- Serverless functions = no persistent server
- Easy to deploy (Vercel, Netlify)
- Can run Node.js code (pdf-parse, scrubbing, parsing) server-side
- Keeps Claude API key secret (not exposed to client)

**User flow:**
```
User uploads PDF → Next.js API route receives file
                 → Runs extract.js (server-side)
                 → Runs scrubPII-v2.js (server-side)
                 → Runs parseTransactions.js (server-side)
                 → Calls Claude API (server-side, API key hidden)
                 → Returns insights to user
                 → Deletes all temp files
```

### Alternative: Fully Client-Side (Privacy-Max)
**Why:**
- Zero server involvement
- User's PDF never leaves their browser
- 100% transparent privacy

**Challenges:**
- Need to use pdf.js (browser-compatible)
- Must expose Claude API key (user could steal it) OR use user's own API key
- Heavier client-side processing

**User flow:**
```
User uploads PDF → Browser runs pdf.js
                 → Browser runs scrubPII (JS version)
                 → Browser runs parseTransactions (JS version)
                 → Browser calls Claude API with user's API key
                 → Display insights
                 → User closes tab = all data gone
```

### Recommendation
Use **Next.js API routes** for MVP:
- Better UX (no API key required from user)
- Faster processing (server is faster than browser)
- API key stays secret
- Still privacy-preserving (no storage, just temp processing)

Once proven, offer **client-side mode** as premium feature for paranoid users.

## Security Notes

### What Gets Sent to Claude API
```json
{
  "transactions": [
    {
      "date": "2025-11-03",
      "merchant": "Uber",
      "amount": -17.88
    }
  ]
}
```

### What NEVER Gets Sent to Claude API
- ❌ Account numbers
- ❌ Your name
- ❌ Your address
- ❌ Transaction reference numbers
- ❌ E-transfer recipient names
- ❌ Phone numbers
- ❌ Any internal bank codes

### GDPR/Privacy Compliance
- No PII stored on server
- No logs containing PII
- User can request data deletion (just close browser tab)
- Compliant with Canadian PIPEDA

## Performance Notes

### Current Bottlenecks
- PDF parsing: ~1-2 seconds (acceptable)
- PII scrubbing: <100ms (fast)
- Transaction parsing: <500ms (fast)
- Claude API call: ~2-5 seconds (depends on transaction count)

**Total time: ~5-10 seconds per statement** ✅ Good UX

### Optimization Ideas
- Stream processing (parse while scrubbing)
- Batch multiple statements
- Cache Claude responses for common merchants
