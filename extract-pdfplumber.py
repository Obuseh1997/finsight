#!/usr/bin/env python3
"""
Bank Statement PDF Table Extractor using pdfplumber
100% LOCAL - no data sent anywhere during extraction

Usage: python3 extract-pdfplumber.py <pdf-path> [output-json-path] [--scrub]
Example: python3 extract-pdfplumber.py statement.pdf transactions.json --scrub
"""

import sys
import json
import re
import pdfplumber
from datetime import datetime
from typing import List, Dict, Any

# Import scrubbing and normalization functions
try:
    from scrub_pii import scrub_transactions
    SCRUB_AVAILABLE = True
except ImportError:
    SCRUB_AVAILABLE = False

try:
    from normalize_merchant import add_normalization_to_transaction
    NORMALIZE_AVAILABLE = True
except ImportError:
    NORMALIZE_AVAILABLE = False

def detect_bank(pdf_path: str) -> str:
    """Detect which bank and statement type from the statement."""
    with pdfplumber.open(pdf_path) as pdf:
        first_page_text = pdf.pages[0].extract_text() or ''

        if 'CIBC' in first_page_text:
            # Credit card indicators: Visa/Mastercard card statements
            if any(kw in first_page_text for kw in ['Visa', 'Mastercard', 'VisaTM', 'Aventura', 'CIBC Card']):
                return 'cibc-credit'
            return 'cibc'
        elif 'RBC' in first_page_text or 'Royal Bank' in first_page_text:
            return 'rbc'
        else:
            return 'unknown'


# ---------------------------------------------------------------------------
# CIBC Credit Card parser (text-line based, not coordinate based)
# ---------------------------------------------------------------------------

# All CIBC Spend Categories as they appear verbatim in statements
CIBC_CREDIT_CATEGORIES = [
    'Personal and Household Expenses',
    'Professional and Financial Services',
    'Retail and Grocery',
    'Transportation',
    'Hotel, Entertainment and Recreation',
    'Restaurants',
    'Home and Office Improvement',
    'Health and Education',
]

MONTH_MAP = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12',
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
}


def _credit_statement_meta(first_page_text: str) -> dict:
    """Extract statement date and period from first page."""
    meta = {'year': str(datetime.now().year), 'end_month': datetime.now().month, 'period': None}

    # Statement Date: "Statement Date\nFebruary 22, 2026" or inline
    date_match = re.search(
        r'Statement Date\s+(\w+)\s+(\d{1,2}),\s+(\d{4})', first_page_text
    )
    if date_match:
        meta['year'] = date_match.group(3)
        meta['end_month'] = int(MONTH_MAP.get(date_match.group(1), '01'))

    # Period: "January 23to February 22, 2026" (no space before 'to' is common)
    period_match = re.search(
        r'(\w+)\s+(\d{1,2})\s*to\s+(\w+)\s+(\d{1,2}),\s+(\d{4})', first_page_text
    )
    if period_match:
        year = period_match.group(5)
        start_month = MONTH_MAP.get(period_match.group(1), '01')
        start_day = period_match.group(2).zfill(2)
        end_month_str = MONTH_MAP.get(period_match.group(3), '01')
        end_day = period_match.group(4).zfill(2)
        meta['period'] = {
            'start_date': f"{year}-{start_month}-{start_day}",
            'end_date': f"{year}-{end_month_str}-{end_day}",
        }

    return meta


def _infer_year(trans_month: int, end_month: int, end_year: int) -> int:
    """Handle cross-year statements (e.g., Dec-Jan)."""
    return end_year - 1 if trans_month > end_month else end_year


def _parse_credit_line(line: str, end_month: int, end_year: int) -> dict | None:
    """
    Parse one transaction line from a CIBC credit card statement.

    Expected format:
      Mon DD  Mon DD  MERCHANT NAME CITY PROV  [Category]  Amount
    e.g.:
      Jan 22 Jan 23 LINKEDIN P767950886 Mountain ViewCA Professional and Financial Services 322.73
    """
    line = line.strip()

    # Must start with two short-month abbreviations and days
    date_re = r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+' \
              r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+'
    date_match = re.match(date_re, line)
    if not date_match:
        return None

    trans_month_str, trans_day, post_month_str, post_day = date_match.groups()
    remainder = line[date_match.end():]

    # Amount is always the last token
    amount_match = re.search(r'([\d,]+\.\d{2})$', remainder)
    if not amount_match:
        return None
    amount = float(amount_match.group(1).replace(',', ''))
    remainder = remainder[:amount_match.start()].strip()

    # Check if a known category is present at the end of remainder
    category = 'Uncategorized'
    for cat in CIBC_CREDIT_CATEGORIES:
        if remainder.endswith(cat):
            category = cat
            remainder = remainder[: -len(cat)].strip()
            break

    merchant = remainder.strip()
    if not merchant:
        return None

    # Infer correct year for post date
    post_month_num = int(MONTH_MAP.get(post_month_str, '01'))
    year = _infer_year(post_month_num, end_month, end_year)
    post_date = f"{year}-{MONTH_MAP[post_month_str]}-{post_day.zfill(2)}"

    return {
        'date': post_date,
        'description': merchant,
        'merchant': merchant,
        'amount': -amount,   # charges are negative (debit)
        'type': 'debit',
        'category': category,
        'withdrawal': amount,
        'deposit': None,
        'balance': None,
    }


def parse_credit_card_statement(pdf_path: str) -> tuple[List[Dict[str, Any]], str, dict]:
    """
    Parse a CIBC credit card PDF statement using text-line parsing.
    Returns (transactions, bank_type, meta).
    """
    transactions = []

    with pdfplumber.open(pdf_path) as pdf:
        first_page_text = pdf.pages[0].extract_text() or ''
        meta = _credit_statement_meta(first_page_text)
        end_month = meta['end_month']
        end_year = int(meta['year'])

        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue

            in_charges = False

            for line in text.split('\n'):
                stripped = line.strip()

                # Detect entry into charges section
                if 'Your new charges and credits' in stripped:
                    in_charges = True
                    continue

                # Stop at summary/total lines
                if in_charges and re.match(r'^Total\s+(for|payments)', stripped, re.IGNORECASE):
                    in_charges = False
                    continue

                # Skip non-charge sections and junk lines
                if not in_charges:
                    continue
                if not stripped or stripped == 'Q':
                    continue
                # Q marker can prefix the transaction line itself — strip and keep
                if stripped.startswith('Q '):
                    stripped = stripped[2:].strip()
                if re.match(r'^Card number', stripped):
                    continue
                if 'Points Multiplier' in stripped or 'earn rate' in stripped:
                    continue

                txn = _parse_credit_line(stripped, end_month, end_year)
                if txn:
                    transactions.append(txn)

    return transactions, 'cibc-credit', meta

def extract_text_with_coordinates(pdf_path: str) -> tuple[List[Dict[str, Any]], str]:
    """
    Extract text items with X/Y coordinates from PDF using pdfplumber.
    Returns a tuple of (text items, bank_type).
    """
    items = []
    bank = detect_bank(pdf_path)

    print(f"📍 Detected bank: {bank.upper()}")

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            # Extract words with coordinates
            words = page.extract_words(
                x_tolerance=3,
                y_tolerance=3,
                keep_blank_chars=False,
                use_text_flow=False
            )

            for word in words:
                items.append({
                    'page': page_num,
                    'x': word['x0'],
                    'y': word['top'],
                    'text': word['text']
                })

            print(f"✓ Extracted {len(words)} words from page {page_num + 1}")

    return items, bank

def filter_transaction_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filter out headers, footers, and non-transaction items.
    """
    filtered = []

    for item in items:
        text = item['text']
        x = item['x']
        y = item['y']
        page = item.get('page', 0)

        # Skip headers
        if text in ['Date', 'Description', 'Withdrawals', 'Deposits', 'Balance',
                    'Transaction', 'details', 'continued', 'Opening', 'Closing',
                    '($)', 'DateDescriptionWithdrawals', 'Account', 'Statement',
                    'number', 'Branch', 'transit', 'forward', 'For']:
            continue

        # Skip junk text (legal disclaimers, notes, etc.)
        if any(skip in text for skip in ['Free Transaction', 'Important:', 'Foreign Currency',
                                          'Trademark', 'Page', '10774E PER',
                                          'names shown', 'based on', 'current records',
                                          'statement will', 'writing within', 'applicable to',
                                          'not reflect', 'account errors', 'omissions',
                                          'irregularities', 'registered trademark',
                                          'Licensee', 'Conversion Fee', 'administration fee',
                                          'disclosed', 'available at', 'CIBC branch',
                                          'addition', 'this is', 'considered correct',
                                          'do not report', 'paperless', 'period included',
                                          'does not reflect', 'holder', 'occurred prior']):
            continue

        # Skip header area (top of page before transactions start)
        # Page 0 (first page): transactions start at Y ~460 (large header with account info)
        # Page 1+: transactions start at Y ~120 (smaller continued header)
        if page == 0 and y < 460:
            continue
        elif page > 0 and y < 120:
            continue

        # Skip footer area (bottom of page)
        if y > 650:
            continue

        filtered.append(item)

    return filtered

def parse_transactions(items: List[Dict[str, Any]], bank: str = 'cibc') -> List[Dict[str, Any]]:
    """
    Parse text items with coordinates into structured transactions.
    Groups items by Y position to form rows, then assigns to columns by X position.

    Args:
        items: Text items with coordinates
        bank: Bank type ('cibc' or 'rbc') for column position detection
    """
    if not items:
        return []

    # Bank-specific column positions
    if bank == 'rbc':
        # RBC column positions (from coordinate analysis)
        date_x = (40, 80)           # Date at X ~44
        desc_x = (85, 250)          # Description at X ~90-150
        withdrawal_x = (340, 400)   # Withdrawals at X ~350
        deposit_x = (420, 480)      # Deposits at X ~423
        balance_x = (520, 600)      # Balance at X ~558
        y_threshold_page0 = 445     # Transactions start at Y ~445
        y_threshold_other = 120
    else:  # CIBC (default)
        # CIBC column positions
        date_x = (50, 80)
        desc_x = (100, 325)
        withdrawal_x = (330, 400)
        deposit_x = (420, 480)
        balance_x = (520, 600)
        y_threshold_page0 = 460
        y_threshold_other = 120

    # Filter to only transaction items
    transaction_items = filter_transaction_items(items)

    # Group by transaction row (same page + Y position = same transaction)
    transactions_by_y = {}

    # Sort by page, then Y position to process top-to-bottom, page-by-page
    transaction_items_sorted = sorted(transaction_items, key=lambda item: (item['page'], item['y']))

    for item in transaction_items_sorted:
        page = item['page']
        x = item['x']
        y = round(item['y'], 1)  # Round to 0.1 for grouping

        # Use (page, y) as key to avoid merging rows from different pages
        row_key = (page, y)

        # Initialize transaction row
        if row_key not in transactions_by_y:
            transactions_by_y[row_key] = {
                'page': page,
                'y': item['y'],
                'date': '',
                'description': [],
                'withdrawal': None,
                'deposit': None,
                'balance': None
            }

        # Assign to column based on X position (bank-specific)
        if date_x[0] <= x <= date_x[1]:
            # Date column
            text = item['text']
            # Handle different date formats
            if re.match(r'^\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$', text):
                # RBC format: "27Oct"
                transactions_by_y[row_key]['date'] = text
            elif re.match(r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$', text):
                # CIBC format: "Nov" followed by day
                transactions_by_y[row_key]['date'] = text
            elif text.isdigit() and len(text) <= 2 and int(text) <= 31:
                # CIBC: Day number - append to month
                if transactions_by_y[row_key]['date']:
                    transactions_by_y[row_key]['date'] += ' ' + text
        elif desc_x[0] <= x <= desc_x[1]:
            # Description column
            transactions_by_y[row_key]['description'].append(item['text'])
        elif withdrawal_x[0] <= x <= withdrawal_x[1]:
            # Withdrawals column
            amount = parse_amount(item['text'])
            if amount is not None:
                transactions_by_y[row_key]['withdrawal'] = amount
        elif deposit_x[0] <= x <= deposit_x[1]:
            # Deposits column
            amount = parse_amount(item['text'])
            if amount is not None:
                transactions_by_y[row_key]['deposit'] = amount
        elif balance_x[0] <= x <= balance_x[1]:
            # Balance column
            amount = parse_amount(item['text'])
            if amount is not None:
                transactions_by_y[row_key]['balance'] = amount

    # Convert to sorted list (by page, then Y position)
    sorted_rows = sorted(transactions_by_y.values(), key=lambda r: (r['page'], r['y']))

    # Process transactions: rows with amounts are transactions,
    # rows without amounts are description continuations
    result = []
    current_date = None
    current_transaction = None
    continuation_count = 0  # Track how many continuation rows we've seen

    for row in sorted_rows:
        # Update current date if this row has a date
        if row['date']:
            current_date = row['date']

        # Check if this row has transaction amounts
        has_amount = row['withdrawal'] is not None or row['deposit'] is not None

        if has_amount:
            # This is a new transaction
            # First, save previous transaction if exists
            if current_transaction:
                description = ' '.join(current_transaction['description']).strip()
                is_credit = current_transaction['deposit'] is not None and current_transaction['deposit'] > 0
                amount = current_transaction['deposit'] if is_credit else (current_transaction['withdrawal'] or 0)

                if amount > 0:
                    result.append({
                        'date': current_transaction['date'],
                        'description': description,
                        'merchant': extract_merchant(description),
                        'amount': amount if is_credit else -amount,
                        'type': 'credit' if is_credit else 'debit',
                        'withdrawal': current_transaction['withdrawal'],
                        'deposit': current_transaction['deposit'],
                        'balance': current_transaction['balance']
                    })

            # Start new transaction with current date
            current_transaction = {
                'date': current_date,
                'description': row['description'],
                'withdrawal': row['withdrawal'],
                'deposit': row['deposit'],
                'balance': row['balance']
            }
            continuation_count = 0  # Reset continuation counter for new transaction
        else:
            # This row has no amounts - it's a description continuation
            # CIBC transactions can have multiple continuation rows:
            # Row 1: PREAUTHORIZED DEBIT or RETAIL PURCHASE
            # Row 2: Reference number (e.g., 1005802179 or 523318030401)
            # Row 3: Actual merchant name (e.g., CIBC Securities Inc. or LB TAPHOUSE - C)
            # Take up to 2 continuation rows to capture merchant name
            if current_transaction and continuation_count < 2:
                current_transaction['description'].extend(row['description'])
                continuation_count += 1

    # Don't forget the last transaction
    if current_transaction:
        description = ' '.join(current_transaction['description']).strip()
        is_credit = current_transaction['deposit'] is not None and current_transaction['deposit'] > 0
        amount = current_transaction['deposit'] if is_credit else (current_transaction['withdrawal'] or 0)

        if amount > 0:
            result.append({
                'date': current_transaction['date'],
                'description': description,
                'merchant': extract_merchant(description),
                'amount': amount if is_credit else -amount,
                'type': 'credit' if is_credit else 'debit',
                'withdrawal': current_transaction['withdrawal'],
                'deposit': current_transaction['deposit'],
                'balance': current_transaction['balance']
            })

    return result

def parse_amount(amount_str: str) -> float:
    """Parse dollar amount from string, handling commas and dollar signs."""
    if not amount_str:
        return None

    # Remove currency symbols, spaces, and parse
    cleaned = amount_str.replace('$', '').replace(',', '').replace(' ', '').strip()

    if not cleaned or cleaned == '-':
        return None

    try:
        return float(cleaned)
    except ValueError:
        return None

def extract_merchant(description: str) -> str:
    """Extract merchant name from transaction description."""
    if not description:
        return 'Unknown'

    description_upper = description.upper()

    # Special handling for transfers (not merchants!)
    # Be MORE SPECIFIC to avoid false positives with "Contactless Interac purchase"
    # which is a MERCHANT PURCHASE, not a transfer
    if any(pattern in description_upper for pattern in [
        'E-TRANSFER', 'INTERNET TRANSFER',
        'ONLINE BANKING PAYMENT', 'PREAUTHORIZED PAYMENT'
    ]):
        # These are person-to-person or bank transfers, not merchant purchases
        if 'E-TRANSFER' in description_upper:
            return 'Interac E-Transfer'
        elif 'INTERNET TRANSFER' in description_upper:
            return 'Internet Transfer'
        elif 'ONLINE BANKING' in description_upper:
            return 'Online Banking Payment'
        elif 'PREAUTHORIZED PAYMENT' in description_upper:
            return 'Pre-authorized Payment'
        else:
            return 'Bank Transfer'

    # Remove common transaction type prefixes for actual merchant purchases
    merchant = description
    prefixes = [
        'VISA DEBIT RETAIL PURCHASE',
        'RETAIL PURCHASE VISA DEBIT',
        'VISA DEBIT PURCHASE',
        'RETAIL PURCHASE',  # Add standalone RETAIL PURCHASE (must be AFTER longer variants)
        'PREAUTHORIZED DEBIT',  # Add this - was missing!
        'DEPOSIT',
        'Contactless Interac purchase',  # This is a MERCHANT purchase, not a transfer
    ]

    for prefix in prefixes:
        merchant = merchant.replace(prefix, '').strip()

    # Remove only long reference numbers (8+ digits)
    # Preserve store numbers like "#0979", "STORE 16", etc.
    # Only remove standalone long numbers (e.g., "12345678" or "1234 5678")
    merchant = re.sub(r'\b\d{8,}\b', '', merchant).strip()

    # Clean up whitespace
    merchant = ' '.join(merchant.split())

    # Normalize common merchants (case-insensitive check)
    merchant_lower = merchant.lower()
    if 'uber' in merchant_lower:
        return 'Uber'
    elif 'spotify' in merchant_lower:
        return 'Spotify'
    elif 'wealthsimple' in merchant_lower:
        return 'Wealthsimple'
    elif 'foodbasics' in merchant_lower.replace(' ', ''):  # Handle "FOODBASICS87" or "FOOD BASICS"
        return 'Food Basics'
    elif 'starbucks' in merchant_lower:
        return 'Starbucks'
    elif 'rexall' in merchant_lower:
        return 'Rexall Pharmacy'
    elif 'goodlife' in merchant_lower:
        return 'GoodLife Fitness'
    elif 'sportchek' in merchant_lower or 'sport chek' in merchant_lower:
        return 'SportChek'
    elif 'marks' in merchant_lower:
        return 'Marks'

    return merchant if merchant else 'Unknown'

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract-pdfplumber.py <pdf-path> [output-json-path] [--scrub]")
        print("Example: python3 extract-pdfplumber.py statement.pdf transactions.json --scrub")
        sys.exit(1)

    pdf_path = sys.argv[1]

    # Parse arguments
    args = sys.argv[2:]
    scrub_pii = '--scrub' in args
    args = [arg for arg in args if not arg.startswith('--')]
    output_path = args[0] if args else 'transactions-pdfplumber.json'

    print(f'📄 Extracting text with coordinates from PDF (100% local): {pdf_path}')
    if scrub_pii:
        if SCRUB_AVAILABLE:
            print('🔒 PII scrubbing: ENABLED')
        else:
            print('⚠ PII scrubbing requested but scrub_pii.py not found')
            scrub_pii = False

    try:
        # Detect bank/statement type first
        bank = detect_bank(pdf_path)
        print(f'📍 Detected bank: {bank.upper()}')

        if bank == 'cibc-credit':
            # Credit card: use text-line parser (coordinate parser is for chequing layouts)
            print('\n💳 Credit card statement detected — using text-line parser...')
            transactions, bank, meta = parse_credit_card_statement(pdf_path)
            print(f'✓ Extracted {len(transactions)} transactions')
        else:
            # Chequing/savings: use coordinate-based parser
            items, bank = extract_text_with_coordinates(pdf_path)
            print(f'\n✓ Extracted {len(items)} text items from PDF')

            if not items:
                print('✗ No text found in PDF')
                sys.exit(1)

            # Parse transactions from coordinate data
            print('\n💰 Parsing transactions...')
            transactions = parse_transactions(items, bank)
            print(f'✓ Extracted {len(transactions)} transactions')

        # Scrub PII if requested
        if scrub_pii and SCRUB_AVAILABLE:
            print('\n🔒 Scrubbing PII...')
            transactions = scrub_transactions(transactions, bank=bank)
            print('✓ PII scrubbed')

        # Normalize merchants (Layer 1: Deterministic normalization)
        if NORMALIZE_AVAILABLE:
            print('\n🏪 Normalizing merchants...')
            transactions = [add_normalization_to_transaction(t) for t in transactions]
            print('✓ Merchants normalized')

        # Calculate totals for validation
        total_debits = sum(abs(t['amount']) for t in transactions if t['type'] == 'debit')
        total_credits = sum(t['amount'] for t in transactions if t['type'] == 'credit')

        print(f'\n--- Validation ---')
        print(f'Total debits: ${total_debits:.2f}')
        print(f'Total credits: ${total_credits:.2f}')

        # Show sample transactions
        print('\n--- Sample transactions ---')
        for t in transactions[:10]:
            sign = '-' if t['type'] == 'debit' else '+'
            date_str = (t.get('date') or 'NO DATE')[:10].ljust(10)
            merchant_str = (t.get('merchant') or 'Unknown')[:25].ljust(25)
            print(f"  {date_str} | {merchant_str} | {sign}${abs(t['amount']):>8.2f}")

        if len(transactions) > 10:
            print(f'  ... and {len(transactions) - 10} more')

        # Save to JSON
        result = {
            'extracted_at': datetime.now().isoformat(),
            'source_file': pdf_path,
            'extraction_method': 'pdfplumber',
            'transactions': transactions
        }

        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)

        print(f'\n✓ Saved to {output_path}')

    except Exception as e:
        print(f'\n✗ Error: {str(e)}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
