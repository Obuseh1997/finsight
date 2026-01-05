# Parser Implementation Notes

## RBC Parsing Challenges

### Known Issue: Amount Extraction Ambiguity

RBC statements have inconsistent formatting where numbers are concatenated without spaces:

**Format Variations:**
1. `FOOD BASICS 873.98` - Ambiguous: Is it $873.98 or store 87 + $3.98?
2. `FOOD BASICS 87110.715,803.38` - Store 871 + $10.71 + balance $5,803.38
3. `ZERO LATENCY OT2.26` - $2.26
4. `HAZIELVIEW PROP1,350.004,453.38` - $1,350.00 + balance $4,453.38

**Current Heuristic (v1):**
- If comma exists: Extract last 1-4 digit number before comma
- If no comma: Extract last 1-4 digit number at end of line

**Known Failures:**
- `FOOD BASICS 873.98` - Cannot distinguish between $873.98 vs $3.98
- Amounts >$9,999.99 might not parse correctly

**Recommendation for Production:**
1. Test with multiple real RBC statements
2. Cross-reference parsed totals with statement summary
3. Consider OCR/table extraction instead of plain text parsing
4. Or: Have user confirm ambiguous transactions in UI

## CIBC Parsing Status

✅ CIBC parsing works reliably because:
- Better spacing between merchant, amount, balance
- Consistent multi-line format
- Less ambiguity in number placement

## Future Banks

For TD, Scotiabank, BMO: Analyze statement format BEFORE implementing parser. PDF table structure might be better than plain text extraction.
