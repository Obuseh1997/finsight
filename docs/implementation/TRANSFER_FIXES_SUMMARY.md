# Transfer & Merge Fixes - 2025-12-22

## Issues Fixed

### 1. ✅ **Transfer Type Distinction**

**Problem**: Couldn't distinguish between internal transfers and Interac e-Transfers

**Solution**: Added special handling before normalization

**Results**:
```
INTERNET TRANSFER [REF]           → Internal Transfer
FULFILL REQUEST [REF]             → Internal Transfer
E-TRANSFER sent to John Doe       → Interac e-Transfer
```

**Why This Matters**:
- **Internal Transfer** = Moving money within your own accounts (savings ↔ chequing)
- **Interac e-Transfer** = Sending money to other people/institutions
- Now you can see which type of transfer it is!

---

### 2. ✅ **PREAUTHORIZED DEBIT Extraction**

**Problem**:
```
PREAUTHORIZED DEBIT 1005802179 CIBC Securities Inc.
→ Was showing: "Unknown" or garbage
```

**Solution**: Extract merchant name after reference number

**Results**:
```
PREAUTHORIZED DEBIT 1005802179 CIBC Securities Inc. → CIBC Securities Inc.
PREAUTHORIZED DEBIT Wealthsimple Investments Inc.   → Wealthsimple
```

---

### 3. ✅ **Single File Merge Error**

**Problem**:
```bash
# Error when running with one file:
python3 merge_statements.py file.json
# → Hangs waiting for user input
```

**Solution**: Skip duplicate check for single files, remove interactive prompt

**Now**:
```bash
# Works smoothly:
python3 merge_statements.py file.json
✓ Single file - no deduplication needed
```

---

## Code Changes

### File: `normalize_merchant.py`

**Added transfer detection** (lines 151-160):
```python
# Internal transfers (within same bank)
if 'internet transfer' in desc_lower or 'fulfill request' in desc_lower:
    return 'Internal Transfer'

# Interac e-Transfers (to other people)
if 'e-transfer' in desc_lower or 'interac e-transfer' in desc_lower:
    return 'Interac e-Transfer'
```

**Added PREAUTHORIZED extraction** (lines 162-171):
```python
# Preauthorized debits - extract the actual merchant
if 'preauthorized debit' in desc_lower or 'preauthorized payment' in desc_lower:
    # Pattern: PREAUTHORIZED DEBIT 1234567890 Merchant Name
    # OR: PREAUTHORIZED DEBIT Merchant Name (no number)
    match = re.search(r'preauthorized (?:debit|payment)\s+(?:\d+\s+)?(.+)', description, re.IGNORECASE)
    if match:
        merchant_part = match.group(1).strip()
        if merchant_part:
            description = merchant_part
```

**Removed aggressive CIBC pattern** (line 35):
```python
# BEFORE: r'cibc\s+',  # Removed "CIBC" from everything
# AFTER: Removed this pattern entirely
# REASON: Was removing "CIBC" from "CIBC Securities Inc."
```

---

### File: `merge_statements.py`

**Made duplicate check conditional** (lines 187-201):
```python
# Check for duplicate files (only if multiple files)
if len(statements) > 1:
    print("\n🔍 Checking for duplicate files...")
    duplicates = check_duplicate_files(statements)
    if duplicates:
        print(f"⚠️  WARNING: Duplicate files detected:")
        for dup in duplicates:
            print(f"  - {dup}")
        print("\n⚠️  Please upload different statements to avoid duplicate data.")
        # Non-interactive mode: just warn but continue
        print("  ⚠️  Continuing with merge...")
    else:
        print("  ✓ No duplicate files detected")
else:
    print("\n✓ Single file - no deduplication needed")
```

**What Changed**:
- Only check duplicates if `len(statements) > 1`
- Removed `input("Continue anyway? (y/n)")` interactive prompt
- Now warns but continues automatically

---

## Testing

### Test Transfer Detection:

```bash
python3 -c "
from normalize_merchant import extract_merchant_display_name

cases = [
    'INTERNET TRANSFER [REF]',
    'FULFILL REQUEST [REF]',
    'E-TRANSFER sent to John',
    'PREAUTHORIZED DEBIT 1234567890 CIBC Securities Inc.',
]

for desc in cases:
    print(f'{desc:55} → {extract_merchant_display_name(desc)}')
"
```

**Expected Output**:
```
INTERNET TRANSFER [REF]                                 → Internal Transfer
FULFILL REQUEST [REF]                                   → Internal Transfer
E-TRANSFER sent to John                                 → Interac e-Transfer
PREAUTHORIZED DEBIT 1234567890 CIBC Securities Inc.     → CIBC Securities Inc.
```

### Test Single File Upload:

```bash
# Should work without hanging:
python3 merge_statements.py test.json --output merged.json
```

---

## What You'll See in the UI

### Review Page:

When you see these transactions, they'll now show properly:

| Original Transaction | Extracted Merchant | Type |
|---------------------|-------------------|------|
| INTERNET TRANSFER [REF] | Internal Transfer | Transfer (within bank) |
| E-TRANSFER sent to John Doe | Interac e-Transfer | Transfer (to person) |
| PREAUTHORIZED DEBIT 1234567 CIBC Securities Inc. | CIBC Securities Inc. | Merchant |
| FULFILL REQUEST [REF] | Internal Transfer | Transfer (within bank) |

### Insights Page:

- **Internal Transfers** won't pollute merchant spending
- **Interac e-Transfers** clearly labeled as person-to-person
- **CIBC Securities** will appear as a proper merchant, not "Unknown"

---

## Categorization Recommendations

When reviewing these transactions:

1. **Internal Transfer**
   - Category: **"Transfer"** or **"Excluded"**
   - Not really spending, just moving your own money

2. **Interac e-Transfer**
   - Category: **"Transfer"** or **"Personal"**
   - Money sent to friends/family

3. **CIBC Securities Inc.**
   - Category: **"Investment"** or **"Transfer"**
   - Automated investment contributions

4. **Wealthsimple**
   - Category: **"Investment"** or **"Transfer"**
   - Automated savings/investment

---

## Known Limitations

### 1. FULFILL REQUEST

- This is a generic CIBC transaction type
- Could be anything: bill payment, transfer, etc.
- No way to extract actual destination
- Defaulting to "Internal Transfer" as best guess

### 2. E-TRANSFER Recipients

- We can detect it's an e-Transfer
- But can't extract recipient name reliably
- Shows as "Interac e-Transfer" generic label

**Why**: Bank statements scrub recipient names for privacy/security

---

## Next Steps

When you upload statements:

1. **Internal Transfers** → Will show as "Internal Transfer"
2. **Interac e-Transfers** → Will show as "Interac e-Transfer"
3. **Review Page** → Assign category "Transfer" to exclude from spending
4. **Dictionary Learns** → Future transfers auto-categorized

---

## Files Modified

1. ✅ `normalize_merchant.py` - Better transfer detection and PREAUTHORIZED extraction
2. ✅ `merge_statements.py` - Fixed single file handling

---

**Status**: All fixes applied and tested ✅
**Ready for**: Next PDF upload
**Server**: Restarted with changes
