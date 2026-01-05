#!/usr/bin/env python3
"""
PII Scrubbing for extracted bank transactions
100% LOCAL - no data sent anywhere
"""

import re
from typing import Dict, Any, List


def scrub_cibc_transaction(transaction: Dict[str, Any]) -> Dict[str, Any]:
    """
    Scrub PII from a single CIBC transaction.
    Preserves original description for user review of unmatched transactions.
    """
    scrubbed = transaction.copy()

    # Preserve original description BEFORE any scrubbing
    # This is shown to users for unmatched/low-confidence transactions
    original_description = scrubbed.get('description', '')
    scrubbed['original_description'] = original_description

    # Scrub description field
    description = original_description

    # 1. Remove hyphenated names (e.g., UTEH-OBUSEH, NAME1-NAME2)
    description = re.sub(r'\b[A-Z]+-[A-Z]+\b', '[NAME]', description)

    # 2. Remove common personal names (all-caps words that are likely names)
    # Preserve common transaction keywords AND known merchants
    # IMPORTANT: If merchant is already extracted, preserve it in keep_words
    keep_words = ['VISA', 'DEBIT', 'RETAIL', 'PURCHASE', 'CORRECTION', 'UBER', 'CANADA',
                  'TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'PREAUTHORIZED', 'INTERNET',
                  'WEALTHSIMPLE', 'INVESTMENTS', 'INC', 'SPOTIFY', 'SERVICE', 'CHARGE',
                  'DISCOUNT', 'REVERSAL', 'MERCHANDISE', 'RET', 'REV', 'INTL', 'DEB',
                  'CIBC', 'SECURITIES', 'GOODLIFE', 'FITNESS', 'CENTRES', 'WWW', 'COM',
                  'MARKS', 'SPORTCHEK', 'REXALL', 'PHARMACY', 'STARBUCKS', 'FOOD', 'BASICS',
                  'LTD', 'LLC', 'CORP', 'LIMITED', 'CORPORATION',  # Business suffixes
                  # Additional known merchants to preserve
                  'LEMONADE', 'NETFLIX', 'AMAZON', 'GOOGLE', 'APPLE', 'MICROSOFT', 'META',
                  'WALMART', 'COSTCO', 'SOBEYS', 'LOBLAWS', 'METRO', 'SHOPPERS', 'DRUG',
                  'TIMS', 'MCDONALDS', 'WENDYS', 'SUBWAY', 'PIZZA', 'DOMINOS', 'PIZZAHUT',
                  'GAS', 'ESSO', 'SHELL', 'PETRO', 'TIRE', 'AUTO', 'PARTS',
                  'HOME', 'DEPOT', 'IKEA', 'BEST', 'BUY', 'DOLLARAMA', 'DOLLAR',
                  'INDIGO', 'CHAPTERS', 'CINEPLEX', 'AMC', 'THEATRE', 'THEATERS',
                  'BARBER', 'SALON', 'SPA', 'GYM', 'YOGA', 'CLINIC', 'DENTAL']

    # Also preserve the merchant field if it's already in the transaction
    existing_merchant = scrubbed.get('merchant', '').upper()
    if existing_merchant:
        # Add words from existing merchant to keep_words
        merchant_words = existing_merchant.split()
        keep_words.extend([w for w in merchant_words if w.isalpha() and len(w) >= 3])

    # PII-ONLY APPROACH: DO NOT scrub merchant names!
    # Users have already seen their bank statements and know their transactions.
    # Only scrub: reference numbers, e-transfer recipient names, account details.
    # Merchant names like "DOLLARAMA", "FOOD BASICS", "THAI EXPRESS" should be preserved.

    # Removing the aggressive all-caps word scrubbing that was removing merchant names

    # 3. Remove e-transfer reference numbers (12 digits)
    description = re.sub(r'E-TRANSFER\s+\d{12}', 'E-TRANSFER [REF]', description)
    description = re.sub(r'E-TRANSFER\s+\d{12}', 'E-TRANSFER [REF]', description, flags=re.IGNORECASE)

    # 4. Remove UBER transaction IDs (12 digits after "UBER CANADA/UBE")
    description = re.sub(r'UBER CANADA/UBE\s+\d{12}', 'UBER CANADA/UBE [REF]', description)

    # 5. Remove other long reference numbers (10+ digits standalone)
    description = re.sub(r'\b\d{10,}\b', '[REF]', description)

    # 6. Remove CAD conversion details (e.g., "14.34 CAD @ 1.000000")
    description = re.sub(r'\d+\.\d{2}\s+CAD\s+@\s+[\d\.]+', '[CONVERSION]', description)

    # 7. Remove internet transfer reference numbers but preserve merchant info
    # Pattern: INTERNET TRANSFER [digits] [merchant info] [more digits]
    # We want to keep merchant names but remove personal reference numbers
    description = re.sub(r'(INTERNET TRANSFER)\s+\d{10,}', r'\1 [REF]', description)

    # 8. Remove recipient names after E-TRANSFER (capitalized words that are likely personal names)
    # But preserve known merchants (they're in keep_words)
    description = re.sub(r'(E-TRANSFER\s+\[REF\])\s+([A-Z][a-z]+\s+)+', r'\1 [RECIPIENT] ', description)

    # 9. Remove PREAUTHORIZED DEBIT reference numbers but keep merchant
    description = re.sub(r'(PREAUTHORIZED DEBIT)\s+\d{10,}', r'\1 [REF]', description)

    # 10. Remove trailing personal initials or short name fragments (e.g., "AE/EI", "JD/KL")
    # These appear at the end of descriptions and are typically 2-3 letter combos with slashes
    description = re.sub(r'\s+[A-Z]{1,3}/[A-Z]{1,3}\s*$', '', description)

    # 11. Clean up extra whitespace
    description = ' '.join(description.split())

    scrubbed['description'] = description

    # Clean merchant field: remove [REF] markers only
    # DO NOT remove merchant names or store numbers
    merchant = scrubbed.get('merchant', '')
    merchant = re.sub(r'\[REF\]\s*', '', merchant)  # Remove [REF] markers
    merchant = re.sub(r'\[NAME\]\s*', '', merchant)  # Remove [NAME] markers
    merchant = re.sub(r'\[CONVERSION\]\s*', '', merchant)  # Remove [CONVERSION] markers
    merchant = re.sub(r'\[RECIPIENT\]\s*', '', merchant)  # Remove [RECIPIENT] markers
    # NOTE: Do NOT remove digits - store numbers like "#0979" should be preserved
    merchant = ' '.join(merchant.split())
    scrubbed['merchant'] = merchant

    return scrubbed


def scrub_rbc_transaction(transaction: Dict[str, Any]) -> Dict[str, Any]:
    """
    Scrub PII from a single RBC transaction.
    """
    scrubbed = transaction.copy()

    # Similar scrubbing for RBC format
    description = scrubbed.get('description', '')

    # 1. Remove e-transfer reference codes (6 alphanumeric)
    description = re.sub(r'e-Transfer\s+[A-Z0-9]{6}', 'e-Transfer [REF]', description)

    # 2. Remove recipient names after e-transfer
    description = re.sub(r'(e-Transfer sent)\s+([A-Za-z\s]+?)\s+([A-Z0-9]{6})', r'\1 [RECIPIENT] [REF]', description)

    # 3. Clean up
    description = ' '.join(description.split())
    scrubbed['description'] = description

    return scrubbed


def scrub_transactions(transactions: List[Dict[str, Any]], bank: str = 'cibc') -> List[Dict[str, Any]]:
    """
    Scrub PII from all transactions based on bank type.
    """
    scrubber = scrub_cibc_transaction if bank == 'cibc' else scrub_rbc_transaction
    return [scrubber(t) for t in transactions]


if __name__ == '__main__':
    import json
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 scrub_pii.py <input-json> [output-json] [bank-type]")
        print("Example: python3 scrub_pii.py transactions.json transactions-scrubbed.json cibc")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else input_path.replace('.json', '-scrubbed.json')
    bank = sys.argv[3] if len(sys.argv) > 3 else 'cibc'

    # Load transactions
    with open(input_path, 'r') as f:
        data = json.load(f)

    print(f'🔒 Scrubbing PII from {len(data["transactions"])} transactions (bank: {bank})...')

    # Scrub
    data['transactions'] = scrub_transactions(data['transactions'], bank)

    # Save
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

    print(f'✓ Saved scrubbed data to {output_path}')

    # Show sample
    print('\n--- Sample scrubbed transactions ---')
    for t in data['transactions'][:5]:
        print(f"  {t['date']}: {t['description'][:60]}...")
