#!/usr/bin/env python3
"""
Generate spending insights from transactions (no AI required)

Insights generated:
- Top merchants by spending
- Recurring charges (subscriptions)
- Spending patterns by merchant
- Total spending summary

Usage: python3 generate_insights.py <transactions-json> [--output insights.json]
"""

import sys
import json
from typing import Dict, Any, List, Tuple
from collections import defaultdict
from datetime import datetime
import re


def parse_date(date_str: str) -> datetime:
    """
    Parse date from various formats (Nov 3, 27Oct, etc).
    Returns datetime for analysis. Uses current year as default.
    """
    current_year = datetime.now().year

    # Format: "Nov 3" or "Nov 15"
    match = re.match(r'([A-Za-z]+)\s*(\d+)', date_str)
    if match:
        month_str, day_str = match.groups()
        try:
            return datetime.strptime(f"{month_str} {day_str} {current_year}", "%b %d %Y")
        except ValueError:
            pass

    # Format: "27Oct" or "3Nov"
    match = re.match(r'(\d+)([A-Za-z]+)', date_str)
    if match:
        day_str, month_str = match.groups()
        try:
            return datetime.strptime(f"{day_str} {month_str} {current_year}", "%d %b %Y")
        except ValueError:
            pass

    return datetime(1970, 1, 1)


def analyze_top_merchants(transactions: List[Dict[str, Any]], top_n: int = 10) -> List[Dict[str, Any]]:
    """
    Analyze spending by merchant.

    Returns:
        List of top merchants with spending details
    """
    merchant_spending = defaultdict(lambda: {
        'total_spend': 0.0,
        'transaction_count': 0,
        'transactions': [],
        'merchant_display': '',
        'normalized_merchant': ''
    })

    for txn in transactions:
        amount = txn.get('amount', 0)

        # Only count debits (negative amounts)
        if amount >= 0:
            continue

        normalized = txn.get('normalized_merchant', 'unknown')
        display = txn.get('merchant_display') or txn.get('merchant') or normalized
        category = txn.get('category', 'Uncategorized')

        merchant_spending[normalized]['total_spend'] += abs(amount)
        merchant_spending[normalized]['transaction_count'] += 1
        merchant_spending[normalized]['transactions'].append({
            'date': txn.get('date'),
            'amount': amount,
            'description': txn.get('description', '')
        })
        merchant_spending[normalized]['merchant_display'] = display
        merchant_spending[normalized]['normalized_merchant'] = normalized
        merchant_spending[normalized]['category'] = category

    # Convert to list and sort by total spend
    merchants = []
    for normalized, data in merchant_spending.items():
        merchants.append({
            'merchant': normalized,
            'merchant_display': data['merchant_display'],
            'category': data.get('category', 'Uncategorized'),
            'total_spend': round(data['total_spend'], 2),
            'transaction_count': data['transaction_count'],
            'average_transaction': round(data['total_spend'] / data['transaction_count'], 2),
            'transactions': sorted(data['transactions'], key=lambda t: parse_date(t.get('date', '')))
        })

    # Sort by total spend
    merchants.sort(key=lambda m: m['total_spend'], reverse=True)

    return merchants[:top_n]


def detect_recurring_charges(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Detect recurring charges (subscriptions, monthly bills).

    A charge is considered recurring if:
    - Same merchant appears multiple times
    - Amounts are similar (within 10%)
    - Appears roughly monthly (25-35 days apart)

    Returns:
        List of detected recurring charges
    """
    # Group by merchant
    merchant_groups = defaultdict(list)

    for txn in transactions:
        amount = txn.get('amount', 0)
        if amount >= 0:  # Only debits
            continue

        normalized = txn.get('normalized_merchant', 'unknown')
        merchant_groups[normalized].append({
            'date': txn.get('date'),
            'date_obj': parse_date(txn.get('date', '')),
            'amount': abs(amount),
            'description': txn.get('description', '')
        })

    recurring_charges = []

    for merchant, txns in merchant_groups.items():
        if len(txns) < 2:  # Need at least 2 occurrences
            continue

        # Sort by date
        txns.sort(key=lambda t: t['date_obj'])

        # Check if amounts are similar
        amounts = [t['amount'] for t in txns]
        avg_amount = sum(amounts) / len(amounts)
        amount_variance = max(amounts) - min(amounts)

        # If variance is > 10% of average, probably not recurring
        if amount_variance > avg_amount * 0.10:
            continue

        # Check if dates are roughly monthly
        if len(txns) >= 2:
            intervals = []
            for i in range(1, len(txns)):
                days_apart = (txns[i]['date_obj'] - txns[i-1]['date_obj']).days
                intervals.append(days_apart)

            avg_interval = sum(intervals) / len(intervals)

            # Recurring if average interval is 25-35 days (monthly) or 12-16 days (bi-weekly)
            is_monthly = 25 <= avg_interval <= 35
            is_biweekly = 12 <= avg_interval <= 16

            if is_monthly or is_biweekly:
                frequency = 'monthly' if is_monthly else 'bi-weekly'

                # Get merchant display name
                display = txns[0].get('description', merchant).split()[0:3]
                display = ' '.join(display) if display else merchant

                recurring_charges.append({
                    'merchant': merchant,
                    'merchant_display': display,
                    'amount': round(avg_amount, 2),
                    'frequency': frequency,
                    'occurrences': len(txns),
                    'dates': [t['date'] for t in txns],
                    'estimated_annual_cost': round(avg_amount * (12 if is_monthly else 26), 2)
                })

    # Sort by annual cost
    recurring_charges.sort(key=lambda r: r['estimated_annual_cost'], reverse=True)

    return recurring_charges


def calculate_spending_summary(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate overall spending summary.

    Returns:
        Dict with total spending, transaction counts, etc.
    """
    total_debits = 0.0
    total_credits = 0.0
    debit_count = 0
    credit_count = 0

    dates = []

    for txn in transactions:
        amount = txn.get('amount', 0)
        date_str = txn.get('date', '')

        if date_str:
            dates.append(parse_date(date_str))

        if amount < 0:
            total_debits += abs(amount)
            debit_count += 1
        else:
            total_credits += amount
            credit_count += 1

    # Calculate date range
    if dates:
        dates.sort()
        start_date = dates[0]
        end_date = dates[-1]
        days = (end_date - start_date).days + 1
        months = days / 30.0
    else:
        start_date = end_date = datetime.now()
        days = months = 0

    return {
        'total_spent': round(total_debits, 2),
        'total_received': round(total_credits, 2),
        'net_change': round(total_credits - total_debits, 2),
        'debit_count': debit_count,
        'credit_count': credit_count,
        'total_transactions': len(transactions),
        'period': {
            'start': start_date.strftime('%Y-%m-%d'),
            'end': end_date.strftime('%Y-%m-%d'),
            'days': days,
            'months': round(months, 1)
        },
        'average_per_month': round(total_debits / months, 2) if months > 0 else 0
    }


def analyze_spending_by_category(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Analyze spending by category.

    Returns:
        List of categories with spending details
    """
    category_spending = defaultdict(lambda: {
        'total_spend': 0.0,
        'transaction_count': 0,
        'transactions': []
    })

    for txn in transactions:
        amount = txn.get('amount', 0)

        # Only count debits (negative amounts)
        if amount >= 0:
            continue

        category = txn.get('category', 'Other')
        if not category:
            category = 'Other'

        category_spending[category]['total_spend'] += abs(amount)
        category_spending[category]['transaction_count'] += 1
        category_spending[category]['transactions'].append({
            'date': txn.get('date'),
            'amount': amount,
            'merchant': txn.get('merchant_display') or txn.get('merchant', 'Unknown')
        })

    # Convert to list and sort by total spend
    categories = []
    for category, data in category_spending.items():
        categories.append({
            'category': category,
            'total_spend': round(data['total_spend'], 2),
            'transaction_count': data['transaction_count'],
            'average_transaction': round(data['total_spend'] / data['transaction_count'], 2) if data['transaction_count'] > 0 else 0,
            'transactions': sorted(data['transactions'], key=lambda t: parse_date(t.get('date', '')))
        })

    # Sort by total spend
    categories.sort(key=lambda c: c['total_spend'], reverse=True)

    return categories


def generate_insights(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate complete insights from transactions.

    Returns:
        Dict with all insights
    """
    print(f"📊 Analyzing {len(transactions)} transactions...\n")

    # Calculate spending summary
    print("💰 Calculating spending summary...")
    summary = calculate_spending_summary(transactions)
    print(f"  ✓ Total spent: ${summary['total_spent']}")
    print(f"  ✓ Period: {summary['period']['start']} to {summary['period']['end']} ({summary['period']['months']} months)")

    # Analyze top merchants
    print("\n🏪 Analyzing top merchants...")
    top_merchants = analyze_top_merchants(transactions, top_n=10)
    print(f"  ✓ Found {len(top_merchants)} top merchants")

    # Detect recurring charges
    print("\n🔄 Detecting recurring charges...")
    recurring = detect_recurring_charges(transactions)
    print(f"  ✓ Found {len(recurring)} recurring charges")

    if recurring:
        total_recurring_annual = sum(r['estimated_annual_cost'] for r in recurring)
        print(f"  ✓ Total recurring: ${total_recurring_annual:.2f}/year")

    # Analyze spending by category
    print("\n📂 Analyzing spending by category...")
    categories = analyze_spending_by_category(transactions)
    print(f"  ✓ Found {len(categories)} spending categories")

    insights = {
        'generated_at': datetime.now().isoformat(),
        'summary': summary,
        'top_merchants': top_merchants,
        'recurring_charges': recurring,
        'recurring_summary': {
            'count': len(recurring),
            'total_annual_cost': round(sum(r['estimated_annual_cost'] for r in recurring), 2) if recurring else 0,
            'total_monthly_cost': round(sum(r['estimated_annual_cost'] for r in recurring) / 12, 2) if recurring else 0
        },
        'spending_by_category': categories
    }

    return insights


def format_insights_for_display(insights: Dict[str, Any]) -> str:
    """
    Format insights as human-readable text.

    Returns:
        Formatted string
    """
    output = []
    summary = insights['summary']
    top_merchants = insights['top_merchants']
    recurring = insights['recurring_charges']

    output.append("=" * 60)
    output.append("💰 YOUR SPENDING INSIGHTS")
    output.append("=" * 60)
    output.append("")

    # Period
    output.append(f"📅 Period: {summary['period']['start']} to {summary['period']['end']}")
    output.append(f"   ({summary['period']['months']} months, {summary['period']['days']} days)")
    output.append("")

    # Summary
    output.append("📊 SPENDING SUMMARY")
    output.append("-" * 60)
    output.append(f"Total Spent:        ${summary['total_spent']:>10,.2f}")
    output.append(f"Total Received:     ${summary['total_received']:>10,.2f}")
    output.append(f"Net Change:         ${summary['net_change']:>10,.2f}")
    output.append(f"Transactions:       {summary['total_transactions']:>10}")
    output.append(f"Average/month:      ${summary['average_per_month']:>10,.2f}")
    output.append("")

    # Top merchants
    output.append("🏪 TOP MERCHANTS")
    output.append("-" * 60)
    for i, merchant in enumerate(top_merchants, 1):
        display = merchant['merchant_display'][:30].ljust(30)
        spend = merchant['total_spend']
        count = merchant['transaction_count']
        avg = merchant['average_transaction']
        pct = (spend / summary['total_spent'] * 100) if summary['total_spent'] > 0 else 0

        output.append(f"{i:2}. {display} | ${spend:>8,.2f} ({pct:>4.1f}%) | {count:>3} txns | avg ${avg:>6.2f}")

    output.append("")

    # Recurring charges
    if recurring:
        output.append("🔄 RECURRING CHARGES")
        output.append("-" * 60)
        for charge in recurring:
            display = charge['merchant_display'][:30].ljust(30)
            amount = charge['amount']
            freq = charge['frequency']
            annual = charge['estimated_annual_cost']
            count = charge['occurrences']

            output.append(f"   {display} | ${amount:>7.2f}/{freq:<10} | ${annual:>8,.2f}/year ({count} charges)")

        output.append("")
        output.append(f"   Total Recurring: ${insights['recurring_summary']['total_monthly_cost']:>7.2f}/month = ${insights['recurring_summary']['total_annual_cost']:>9,.2f}/year")
        output.append("")

    output.append("=" * 60)

    return "\n".join(output)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate_insights.py <transactions-json> [--output insights.json]")
        print("Example: python3 generate_insights.py merged-statements.json --output insights.json")
        sys.exit(1)

    # Parse arguments
    args = sys.argv[1:]
    input_path = args[0]
    output_path = input_path.replace('.json', '-insights.json')

    i = 1
    while i < len(args):
        if args[i] == '--output' and i + 1 < len(args):
            output_path = args[i + 1]
            i += 2
        else:
            i += 1

    # Load transactions
    print(f"📄 Loading transactions from {input_path}...")
    with open(input_path, 'r') as f:
        data = json.load(f)

    transactions = data.get('transactions', [])
    print(f"✓ Loaded {len(transactions)} transactions\n")

    # Generate insights
    insights = generate_insights(transactions)

    # Save insights JSON
    print(f"\n💾 Saving insights to {output_path}...")
    with open(output_path, 'w') as f:
        json.dump(insights, f, indent=2)
    print(f"✓ Saved successfully")

    # Display formatted insights
    print("\n")
    formatted = format_insights_for_display(insights)
    print(formatted)


if __name__ == '__main__':
    main()
