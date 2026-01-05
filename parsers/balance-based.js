/**
 * Balance-based transaction parser
 * Works for both CIBC and RBC by using the balance column to calculate amounts
 *
 * Key insight: Balance is always the LAST (largest) number on each transaction line
 * Amount = Previous Balance - Current Balance
 */

function parseStatementPeriod(text, bank) {
    if (bank === 'cibc') {
        const periodMatch = text.match(/(?:For\s+)?([A-Z][a-z]{2}\s+\d+)\s+to\s+([A-Z][a-z]{2}\s+\d+),\s+(\d{4})/);
        if (periodMatch) {
            const [, startDate, endDate, year] = periodMatch;
            return {
                start_date: convertToISO(startDate, year),
                end_date: convertToISO(endDate, year)
            };
        }
    } else if (bank === 'rbc') {
        const periodMatch = text.match(/From\s+([A-Z][a-z]+\s+\d+),\s+(\d{4})\s+to\s+([A-Z][a-z]+\s+\d+),\s+(\d{4})/);
        if (periodMatch) {
            const [, startDate, startYear, endDate, endYear] = periodMatch;
            return {
                start_date: convertToISO(startDate, startYear),
                end_date: convertToISO(endDate, endYear)
            };
        }
    }
    return null;
}

function parseAccountSummary(text, bank) {
    const summary = {};

    const openingMatch = text.match(/(?:Your\s+)?[Oo]pening balance[^\$]*\$?([\d,]+\.\d{2})/i);
    if (openingMatch) summary.opening_balance = parseFloat(openingMatch[1].replace(/,/g, ''));

    const withdrawalsMatch = text.match(/(?:Total\s+)?[Ww]ithdrawals[^\d]*-?\s*([\d,]+\.\d{2})/i);
    if (withdrawalsMatch) summary.total_withdrawals = parseFloat(withdrawalsMatch[1].replace(/,/g, ''));

    const depositsMatch = text.match(/(?:Total\s+)?[Dd]eposits[^\d]*\+?\s*([\d,]+\.\d{2})/i);
    if (depositsMatch) summary.total_deposits = parseFloat(depositsMatch[1].replace(/,/g, ''));

    const closingMatch = text.match(/(?:Your\s+)?[Cc]losing balance[^\$]*\$?([\d,]+\.\d{2})/i);
    if (closingMatch) summary.closing_balance = parseFloat(closingMatch[1].replace(/,/g, ''));

    return summary;
}

function parseTransactions(text, year, bank) {
    const transactions = [];
    const lines = text.split('\n');

    let currentDate = null;
    let previousBalance = null;

    // Get opening balance to start
    const openingMatch = text.match(/(?:Your\s+)?[Oo]pening balance[^\$]*\$?([\d,]+\.\d{2})/i);
    if (openingMatch) {
        previousBalance = parseFloat(openingMatch[1].replace(/,/g, ''));
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip headers and junk
        if (!line ||
            line.includes('Transaction details') ||
            line.includes('Details of your account') ||
            line.includes('Page ') ||
            line.includes('continued') ||
            line.includes('DateDescription') ||
            line.includes('Balance forward') ||
            line.includes('Opening balance') ||
            line.includes('Closing balance') ||
            line.includes('Account Statement')) {
            continue;
        }

        // Detect date (CIBC: "Nov 3", RBC: "27 Oct")
        let dateMatch;
        if (bank === 'cibc') {
            dateMatch = line.match(/^(Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct)\s+(\d+)/);
            if (dateMatch) {
                const [, month, day] = dateMatch;
                currentDate = convertToISO(`${month} ${day}`, year);
            }
        } else if (bank === 'rbc') {
            dateMatch = line.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
            if (dateMatch) {
                const [, day, month] = dateMatch;
                currentDate = convertToISO(`${month} ${day}`, year);
            }
        }

        if (!currentDate) continue;

        // Look for transaction descriptions
        const transaction = parseTransactionLine(line, currentDate, lines, i, previousBalance, bank);

        if (transaction) {
            transactions.push(transaction);
            previousBalance = transaction.balance;
        }
    }

    return transactions;
}

function parseTransactionLine(line, date, allLines, currentIndex, previousBalance, bank) {
    // Skip certain line types
    if (line.match(/^\d+[\.,]\d{2}$/)) return null; // Just a balance
    if (line.includes('CORRECTION')) return null;

    // Transaction patterns (both banks)
    const patterns = [
        /VISA DEBIT.*PURCHASE/i,
        /VISA DEBIT.*REVERSAL/i,
        /INTL VISA DEB/i,
        /E-TRANSFER/i,
        /e-Transfer/i,
        /PREAUTHORIZED DEBIT/i,
        /DEPOSIT/i,
        /INTERNET TRANSFER/i,
        /SERVICE CHARGE/i,
        /Contactless Interac purchase/i,
        /Online Banking payment/i,
        /Telephone Bill Pmt/i,
        /Misc Payment/i,
        /Monthly fee/i
    ];

    const isTransaction = patterns.some(p => p.test(line));
    if (!isTransaction) return null;

    // Get merchant name (next line typically)
    let merchant = 'Unknown';
    if (currentIndex + 1 < allLines.length) {
        const nextLine = allLines[currentIndex + 1].trim();
        // Extract merchant name (letters, spaces, underscores before numbers)
        const merchantMatch = nextLine.match(/^([A-Z][A-Z\s_\-\/\*\.]+?)(?=\d)/);
        if (merchantMatch) {
            merchant = merchantMatch[1].trim();
        } else if (nextLine.match(/^[A-Z]/)) {
            // Whole line might be merchant if no numbers immediately follow
            merchant = nextLine.split(/\s+\d/)[0].trim();
        }
    }

    // Extract balance from current or next line
    // Balance is always the RIGHTMOST number (last column)
    // Numbers may be glued: "100.001,014.71" = amount 100.00 + balance 1,014.71
    const searchText = allLines.slice(currentIndex, currentIndex + 3).join(' ');
    const allNumbers = searchText.match(/[\d,]+\.\d{2}/g);

    if (!allNumbers || allNumbers.length === 0) return null;

    // Balance is the LAST number with a comma, or largest number
    let currentBalance = null;

    // Find rightmost number with comma (that's the balance)
    for (let i = allNumbers.length - 1; i >= 0; i--) {
        if (allNumbers[i].includes(',')) {
            currentBalance = parseFloat(allNumbers[i].replace(/,/g, ''));
            break;
        }
    }

    // If no comma found, use the largest number
    if (currentBalance === null) {
        const numbers = allNumbers.map(n => parseFloat(n.replace(/,/g, '')));
        currentBalance = Math.max(...numbers);
    }

    // Calculate amount from balance change
    if (previousBalance === null) {
        // First transaction, can't calculate
        return null;
    }

    const amount = previousBalance - currentBalance;

    // Determine transaction type
    const isCredit = line.match(/REVERSAL|DEPOSIT|E-TRANSFER.*sent|e-Transfer.*sent|Misc Payment/i);
    const type = amount < 0 ? 'credit' : 'debit';

    return {
        date: date,
        type: type,
        merchant: cleanMerchantName(merchant),
        description: line.substring(0, 50).trim(),
        amount: amount,
        balance: currentBalance
    };
}

function cleanMerchantName(merchant) {
    merchant = merchant.replace(/\s+/g, ' ').trim();
    merchant = merchant.replace(/\[REDACTED\]/g, '').trim();
    merchant = merchant.replace(/\[RECIPIENT\]/g, 'E-Transfer Recipient').trim();
    merchant = merchant.replace(/\[REF\]/g, '').trim();

    // Remove common suffixes
    merchant = merchant.replace(/\s+INC\.?$/i, '');
    merchant = merchant.replace(/\s+LTD\.?$/i, '');

    // Normalize common merchants
    if (merchant.includes('UBER')) return 'Uber';
    if (merchant.includes('SPOTIFY')) return 'Spotify';
    if (merchant.includes('WEALTHSIMPLE')) return 'Wealthsimple';
    if (merchant.includes('GOODLIFE')) return 'GoodLife Fitness';
    if (merchant.includes('SPORTCHEK')) return 'SportChek';
    if (merchant.includes('MARKS.COM')) return 'Marks';
    if (merchant.includes('FOOD BASICS')) return 'Food Basics';
    if (merchant.includes('STARBUCKS')) return 'Starbucks';
    if (merchant.includes('REXALL')) return 'Rexall Pharmacy';

    return merchant || 'Unknown Merchant';
}

function convertToISO(dateStr, year) {
    const months = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12',
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    const parts = dateStr.trim().split(/\s+/);
    const month = months[parts[0]];
    const day = parts[1].padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function parse(scrubbedText, bank) {
    const period = parseStatementPeriod(scrubbedText, bank);
    const summary = parseAccountSummary(scrubbedText, bank);
    const year = period ? period.start_date.split('-')[0] : '2025';
    const transactions = parseTransactions(scrubbedText, year, bank);

    return {
        statement_period: period,
        summary: summary,
        transactions: transactions
    };
}

module.exports = { parse };
