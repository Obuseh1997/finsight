#!/usr/bin/env python3
"""
Debug version of extract-pdfplumber.py with detailed logging
"""
import pdfplumber
import sys
from collections import defaultdict

def extract_and_parse_with_debug(pdf_path: str):
    """Extract with detailed logging"""

    items = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            words = page.extract_words(x_tolerance=3, y_tolerance=3)
            for word in words:
                items.append({
                    'page': page_num,
                    'x': word['x0'],
                    'y': word['top'],
                    'text': word['text']
                })

    # Filter
    filtered = []
    for item in items:
        page = item.get('page', 0)
        y = item['y']

        # Page-specific Y filtering
        if page == 0 and y < 460:
            continue
        elif page > 0 and y < 120:
            continue
        if y > 650:
            continue

        filtered.append(item)

    # Group by Y
    by_y = defaultdict(lambda: {
        'y': 0,
        'date': '',
        'description': [],
        'withdrawal': None,
        'deposit': None,
        'balance': None
    })

    for item in sorted(filtered, key=lambda x: x['y']):
        x = item['x']
        y = round(item['y'], 1)
        text = item['text']

        by_y[y]['y'] = item['y']

        # Date column
        if 50 <= x <= 80:
            if text in ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']:
                by_y[y]['date'] = text
            elif text.isdigit() and len(text) <= 2 and int(text) <= 31:
                if by_y[y]['date']:
                    by_y[y]['date'] += ' ' + text
        # Description column
        elif 100 <= x <= 325:
            by_y[y]['description'].append(text)
        # Withdrawals
        elif 330 <= x <= 400:
            try:
                amount = float(text.replace(',', '').replace('$', ''))
                by_y[y]['withdrawal'] = amount
            except:
                pass
        # Deposits
        elif 420 <= x <= 480:
            try:
                amount = float(text.replace(',', '').replace('$', ''))
                by_y[y]['deposit'] = amount
            except:
                pass
        # Balance
        elif x >= 520:
            try:
                amount = float(text.replace(',', '').replace('$', ''))
                by_y[y]['balance'] = amount
            except:
                pass

    # Sort rows
    sorted_rows = sorted(by_y.values(), key=lambda r: r['y'])

    # Process with detailed logging
    print(f"\n{'Y':>6} | {'Has $':>5} | {'Pending':>7} | {'Date':<8} | {'Action':<30} | {'Description'[:60]}")
    print('-' * 140)

    result = []
    current_date = None
    current_transaction = None
    pending_continuation = False

    for i, row in enumerate(sorted_rows):
        if row['date']:
            current_date = row['date']

        has_amount = row['withdrawal'] is not None or row['deposit'] is not None
        desc = ' '.join(row['description'])[:60]

        action = ""

        if has_amount:
            # Save previous transaction
            if current_transaction:
                action = "SAVE prev, START new"
                prev_desc = ' '.join(current_transaction['description'])
                result.append({
                    'date': current_transaction['date'],
                    'description': prev_desc,
                    'withdrawal': current_transaction['withdrawal'],
                    'deposit': current_transaction['deposit']
                })
            else:
                action = "START new transaction"

            # Start new transaction
            current_transaction = {
                'date': current_date,
                'description': row['description'],
                'withdrawal': row['withdrawal'],
                'deposit': row['deposit'],
                'balance': row['balance']
            }
            pending_continuation = True
        else:
            # No amount - continuation or orphan?
            if current_transaction and pending_continuation:
                action = "APPEND to current"
                current_transaction['description'].extend(row['description'])
                pending_continuation = False
            elif current_transaction and not pending_continuation:
                action = "SKIP (already had continuation)"
            else:
                action = "SKIP (no current transaction)"

        pending_str = "YES" if pending_continuation else "NO"
        has_str = "✓" if has_amount else ""

        print(f"{row['y']:6.1f} | {has_str:>5} | {pending_str:>7} | {current_date or '':<8} | {action:<30} | {desc}")

    # Don't forget last transaction
    if current_transaction:
        desc = ' '.join(current_transaction['description'])
        result.append({
            'date': current_transaction['date'],
            'description': desc,
            'withdrawal': current_transaction['withdrawal'],
            'deposit': current_transaction['deposit']
        })

    return result


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 extract-pdfplumber-debug.py <pdf-path>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    transactions = extract_and_parse_with_debug(pdf_path)

    print(f"\n\n{'='*100}")
    print(f"FINAL RESULT: {len(transactions)} transactions")
    print(f"{'='*100}\n")

    for i, t in enumerate(transactions[:10], 1):
        print(f"{i}. {t['date']}: {t['description'][:80]}")
        print(f"   Withdrawal: {t['withdrawal']}, Deposit: {t['deposit']}\n")
