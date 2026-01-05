#!/usr/bin/env python3
"""
Debug the parsing logic to see exactly what's being grouped
"""
import sys
import json
from extract_pdfplumber import extract_text_with_coordinates, filter_transaction_items

if len(sys.argv) < 2:
    print("Usage: python3 debug_parser.py <pdf-path>")
    sys.exit(1)

pdf_path = sys.argv[1]

# Extract and filter
items = extract_text_with_coordinates(pdf_path)
filtered = filter_transaction_items(items)

# Group by Y
from collections import defaultdict
by_y = defaultdict(lambda: {'description': [], 'withdrawal': None, 'deposit': None, 'date': ''})

for item in sorted(filtered, key=lambda x: x['y']):
    x = item['x']
    y = round(item['y'], 1)
    text = item['text']

    # Column assignment (same as extract_pdfplumber.py)
    if 50 <= x <= 80:
        if text in ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']:
            by_y[y]['date'] = text
        elif text.isdigit() and len(text) <= 2:
            if by_y[y]['date']:
                by_y[y]['date'] += ' ' + text
    elif 100 <= x <= 325:
        by_y[y]['description'].append(text)
    elif 330 <= x <= 400:
        try:
            amount = float(text.replace(',', '').replace('$', ''))
            by_y[y]['withdrawal'] = amount
        except:
            pass
    elif 420 <= x <= 480:
        try:
            amount = float(text.replace(',', '').replace('$', ''))
            by_y[y]['deposit'] = amount
        except:
            pass

# Show rows
print(f"{'Y':>6} | {'Has $':>5} | {'Date':<8} | {'Description'}")
print('-' * 120)

for y in sorted(by_y.keys()):
    row = by_y[y]
    has_amount = '✓' if row['withdrawal'] or row['deposit'] else ''
    desc = ' '.join(row['description'])[:80]
    date = row['date']

    print(f"{y:6.1f} | {has_amount:>5} | {date:<8} | {desc}")
