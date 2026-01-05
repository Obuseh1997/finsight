#!/usr/bin/env python3
"""
Debug extraction to see exactly what's being grouped
"""
import pdfplumber
import sys
from typing import List, Dict, Any


def extract_all_text_items(pdf_path: str) -> List[Dict[str, Any]]:
    """Extract all text items with coordinates from PDF"""
    all_items = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            words = page.extract_words(x_tolerance=3, y_tolerance=3)

            for word in words:
                all_items.append({
                    'page': page_num,
                    'text': word['text'],
                    'x': round(word['x0'], 1),
                    'y': round(word['top'], 1),
                    'width': round(word['x1'] - word['x0'], 1),
                })

    return all_items


def group_by_row(items: List[Dict[str, Any]]) -> Dict[float, List[Dict[str, Any]]]:
    """Group items by Y coordinate (row)"""
    rows = {}

    for item in items:
        y = item['y']
        if y not in rows:
            rows[y] = []
        rows[y].append(item)

    return rows


def analyze_row(row_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze what's in a row"""
    # Sort by X coordinate
    row_items = sorted(row_items, key=lambda x: x['x'])

    # Categorize by X position
    date_items = [i for i in row_items if 50 <= i['x'] <= 80]
    desc_items = [i for i in row_items if 100 <= i['x'] <= 325]
    withdrawal_items = [i for i in row_items if 330 <= i['x'] <= 400]
    deposit_items = [i for i in row_items if 420 <= i['x'] <= 480]
    balance_items = [i for i in row_items if i['x'] >= 520]

    return {
        'y': row_items[0]['y'],
        'date': ' '.join([i['text'] for i in date_items]),
        'description': ' '.join([i['text'] for i in desc_items]),
        'withdrawal': ' '.join([i['text'] for i in withdrawal_items]),
        'deposit': ' '.join([i['text'] for i in deposit_items]),
        'balance': ' '.join([i['text'] for i in balance_items]),
        'has_amount': len(withdrawal_items) > 0 or len(deposit_items) > 0
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 debug_extraction.py <pdf-path>")
        sys.exit(1)

    pdf_path = sys.argv[1]

    print(f"📄 Extracting from: {pdf_path}\n")

    # Extract all text
    items = extract_all_text_items(pdf_path)

    # Filter to transaction area (page 1, Y between 490-650)
    transaction_area = [i for i in items if i['page'] == 1 and 490 <= i['y'] <= 650]

    # Group by row
    rows = group_by_row(transaction_area)

    # Analyze each row
    print(f"{'Y':>6} | {'Has $':>5} | {'Date':<8} | {'Description'}")
    print('-' * 120)

    for y in sorted(rows.keys()):
        analysis = analyze_row(rows[y])
        has_amount = '✓' if analysis['has_amount'] else ''

        desc = analysis['description'][:80]

        print(f"{analysis['y']:6.1f} | {has_amount:>5} | {analysis['date']:<8} | {desc}")
