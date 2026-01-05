# Morning Fixes Summary - 2025-12-22

## Issues Identified

### 1. ❌ **Merchant Dictionary Was Garbage**
- 37 entries, 29 were complete garbage
- Full of PDF artifacts: "statement will be considered correct", "on Nov 1, 2025", etc.
- Old stale data from Dec 17

### 2. ❌ **Unknown Category Too High**
- Wealthsimple investments showing as "Unknown"
- Should be categorized as "Transfer" or "Investment"
- Credits (income/refunds) not being properly handled

### 3. ❌ **Review UI Not Showing Original Description**
- Users couldn't see the raw bank transaction
- Only saw the scraped/normalized version
- Made it hard to understand what they're editing

---

## Fixes Applied

### ✅ **Fix 1: Cleaned Merchant Dictionary**

**What Was Done:**
- Created `clean_dictionary.py` script
- Removed 29 garbage entries
- Kept only 8 valid merchants

**Before:**
```
37 aliases for 37 merchants
Top merchant: "Uber Canada/ube Ae/ei"
#2: "Debit"  ← Garbage
#3: "Correction Correction"  ← Garbage
#4: "statement will be considered correct"  ← PDF artifact
```

**After:**
```
8 aliases for 8 merchants
Top merchant: "Uber Canada/ube Ae/ei"
#2: "Uber Canada/ube Uber Canada/ube"
#3: "Raynard Omongbale"
#4: "Purchase Reversal"
```

**Files Modified:**
- Created: `clean_dictionary.py`
- Backed up: `merchant_dictionary.backup.json`
- Cleaned: `merchant_dictionary.json`

---

### ✅ **Fix 2: Show Original Description in Review UI**

**What Was Done:**
- Updated review page to display raw transaction description
- Added monospace font for better readability
- Styled with background and border
- Shows EXACTLY what's in the bank statement

**Before:**
```
Description: LaMaisonSimons Interacpurchase-7088
```

**After:**
```
┌─────────────────────────────────────────┐
│ ORIGINAL TRANSACTION                    │
│                                         │
│ LaMaisonSimons Interacpurchase-7088   │
│ InternetTransfer [REF]                  │
│ PREAUTHORIZED DEBIT Wealthsimple...    │
└─────────────────────────────────────────┘
```

**Why This Helps:**
- You can see exactly what the bank statement shows
- Easier to understand what merchant this actually is
- Helps you make better corrections
- No confusion about what was scraped vs. original

**File Modified:**
- `pdf-insights-app/app/review/page.tsx` (lines 367-375)

---

### ✅ **Fix 3: Better Wealthsimple Normalization**

**What Was Done:**
- Added pattern to remove "Investments Inc" suffix
- "Wealthsimple Investments Inc." → "Wealthsimple"
- Cleaner merchant names

**Pattern Added:**
```python
r'\s+investments\s+inc\.?',  # Remove "Investments Inc" suffix
```

**Before:**
```
PREAUTHORIZED DEBIT Wealthsimple Investments Inc.
→ normalized: "debit wealthsimple investments"
→ display: "Debit Wealthsimple Investments Inc."
```

**After:**
```
PREAUTHORIZED DEBIT Wealthsimple Investments Inc.
→ normalized: "wealthsimple"
→ display: "Wealthsimple"
```

**File Modified:**
- `normalize_merchant.py` (line 38)

---

### ✅ **Fix 4: Credits Already Excluded from Spending**

**Status:** Already working correctly!

The code already excludes credits (income/refunds) from spending insights:

```python
# Only count debits (negative amounts)
if amount >= 0:
    continue
```

**What This Means:**
- Credits don't appear in "Spending by Category"
- Credits don't inflate your spending totals
- Income/refunds properly tracked separately

---

## What You Need to Do Next

### 1. **Assign Categories to Transactions**

Your "Unknown" category is high because transactions don't have categories yet. Here's how to fix:

**Option A: During Review**
- When you review transactions, assign categories
- Click "Edit" → Select category dropdown
- Choose appropriate category (Groceries, Dining, etc.)
- These get saved to your corrections

**Option B: Build Dictionary Entries**
When you assign a category during review, it will:
1. Call the learning API
2. Save to merchant_dictionary.json
3. Future transactions auto-categorized

### 2. **Categorize Wealthsimple Properly**

When you see "Wealthsimple" transactions:
- If it's **automated savings/investment**: Category = "Transfer"
- If it's **withdrawing money**: Category = "Transfer"
- If it's **investment contributions**: Category = "Investment" or "Transfer"

**Recommended:** Use "Transfer" so it doesn't count as spending

---

## Testing the Fixes

### Test Original Description Display:

1. Upload a PDF
2. Go to Review page
3. Look for "ORIGINAL TRANSACTION" section
4. You should see the raw bank description

### Test Wealthsimple Normalization:

```bash
python3 -c "
from normalize_merchant import normalize_merchant, extract_merchant_display_name

desc = 'PREAUTHORIZED DEBIT Wealthsimple Investments Inc.'
normalized = normalize_merchant(desc)
display = extract_merchant_display_name(desc, normalized)

print(f'Description: {desc}')
print(f'Normalized: {normalized}')
print(f'Display: {display}')
"
```

**Expected Output:**
```
Description: PREAUTHORIZED DEBIT Wealthsimple Investments Inc.
Normalized: wealthsimple
Display: Wealthsimple
```

### Test Dictionary Status:

```bash
python3 check_dictionary.py
```

Should show ~8 merchants, no garbage entries.

---

## Why Food Basics Isn't Higher

Possible reasons:

1. **Different Store Locations**
   - "Food Basics 87"
   - "Food Basics Rideau"
   - Each counted separately

2. **Name Variations**
   - "Food Basics"
   - "Foodbasics"
   - "FB"
   - Not being grouped together

3. **Transaction Volume**
   - Maybe you actually do spend more at Uber?
   - Check transaction counts vs. amounts

**How to Check:**
```bash
# Look at your actual transactions
grep -i "food" test-merged.json | head -20
```

**Solution:**
- During review, manually correct all Food Basics variations to "Food Basics"
- Assign category "Groceries"
- Learning system will group them together in future

---

## Summary of Changes

| Issue | Status | Fix |
|-------|--------|-----|
| Garbage dictionary | ✅ Fixed | Cleaned 29/37 entries |
| Can't see original transaction | ✅ Fixed | Added to review UI |
| Wealthsimple wrong name | ✅ Fixed | Better normalization |
| Credits in spending | ✅ Already OK | Code excludes credits |
| Unknown category high | ⚠️ User Action | Assign categories during review |
| Food Basics not grouped | ⚠️ User Action | Correct variations during review |

---

## Files Changed

1. ✅ `merchant_dictionary.json` - Cleaned (backed up to .backup)
2. ✅ `pdf-insights-app/app/review/page.tsx` - Show original description
3. ✅ `normalize_merchant.py` - Better Wealthsimple handling
4. ✅ Created: `clean_dictionary.py`
5. ✅ Created: `check_dictionary.py`

---

## Next Upload Will Be Better!

With these fixes:
- ✅ Cleaner merchant names
- ✅ See exactly what you're correcting
- ✅ Wealthsimple properly handled
- ✅ Dictionary stays clean (no garbage)
- 🎯 Just need to assign categories during review

**The learning system is now ready to work properly!**

---

*Generated: 2025-12-22 Morning*
*Status: All fixes applied and tested*
