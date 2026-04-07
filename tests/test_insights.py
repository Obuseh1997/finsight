"""
Unit tests for generate_insights.py — covers the two bugs fixed:
1. parse_date() now handles ISO format (credit card parser output)
2. net_change insight direction is correct
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime
from generate_insights import parse_date, calculate_spending_summary as calculate_summary


# ── parse_date ────────────────────────────────────────────────────────────────

def test_parse_date_iso():
    """ISO dates from credit card parser must not fall back to 1970-01-01."""
    d = parse_date('2026-01-22')
    assert d == datetime(2026, 1, 22), f"Got {d}"

def test_parse_date_iso_with_time():
    """ISO with trailing time component should still parse."""
    d = parse_date('2026-02-15T00:00:00')
    assert d == datetime(2026, 2, 15), f"Got {d}"

def test_parse_date_nov_3():
    """Legacy chequing format: 'Nov 3'."""
    d = parse_date('Nov 3')
    assert d.month == 11 and d.day == 3

def test_parse_date_27oct():
    """Legacy RBC format: '27Oct'."""
    d = parse_date('27Oct')
    assert d.month == 10 and d.day == 27

def test_parse_date_empty():
    """Empty string returns datetime.min, not 1970-01-01 epoch."""
    d = parse_date('')
    assert d == datetime.min

def test_parse_date_unknown():
    """Completely unparseable string returns epoch fallback, not crash."""
    d = parse_date('not-a-date')
    assert d == datetime(1970, 1, 1)


# ── calculate_summary net_change sign ─────────────────────────────────────────

def _make_txns(debits, credits):
    txns = []
    for amt in debits:
        txns.append({'date': '2026-01-15', 'amount': -amt, 'type': 'debit', 'merchant': 'Store'})
    for amt in credits:
        txns.append({'date': '2026-01-20', 'amount': amt, 'type': 'credit', 'merchant': 'Employer'})
    return txns

def test_net_change_spend_more_than_receive():
    """Spent more than received → net_change is negative."""
    txns = _make_txns(debits=[500, 300], credits=[100])
    summary = calculate_summary(txns)
    assert summary['net_change'] < 0, f"Expected negative, got {summary['net_change']}"
    assert summary['total_spent'] == 800.0
    assert summary['total_received'] == 100.0

def test_net_change_receive_more_than_spend():
    """Received more than spent → net_change is positive."""
    txns = _make_txns(debits=[200], credits=[1000])
    summary = calculate_summary(txns)
    assert summary['net_change'] > 0, f"Expected positive, got {summary['net_change']}"

def test_net_change_credit_card_only():
    """Credit card statement: all debits, no credits → net_change negative."""
    txns = _make_txns(debits=[2373.15], credits=[])
    summary = calculate_summary(txns)
    assert summary['net_change'] == -2373.15
    assert summary['total_received'] == 0.0

def test_date_range_iso():
    """Date range is correct when all dates are ISO format."""
    txns = _make_txns(debits=[100, 200], credits=[])
    txns[0]['date'] = '2026-01-05'
    txns[1]['date'] = '2026-01-28'
    summary = calculate_summary(txns)
    assert summary['period']['start'] == '2026-01-05'
    assert summary['period']['end'] == '2026-01-28'


if __name__ == '__main__':
    tests = [v for k, v in list(globals().items()) if k.startswith('test_')]
    passed = failed = 0
    for t in tests:
        try:
            t()
            print(f'  ✅ {t.__name__}')
            passed += 1
        except Exception as e:
            print(f'  ❌ {t.__name__}: {e}')
            failed += 1
    print(f'\n{passed} passed, {failed} failed')
    sys.exit(1 if failed else 0)
