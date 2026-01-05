/**
 * CIBC-specific transaction parser
 * Handles CIBC statement format and transaction patterns
 */

function parseStatementPeriod(text) {
    // Match "For Nov 1 to Nov 30, 2025" or "Nov 1 to Nov 30, 2025"
    const periodMatch = text.match(/(?:For\s+)?([A-Z][a-z]{2}\s+\d+)\s+to\s+([A-Z][a-z]{2}\s+\d+),\s+(\d{4})/);

    if (periodMatch) {
        const [, startDate, endDate, year] = periodMatch;
        return {
            start_date: convertToISO(startDate, year),
            end_date: convertToISO(endDate, year)
        };
    }

    return null;
}

function parseAccountSummary(text) {
    const summary = {};

    const openingMatch = text.match(/Opening balance[^\$]*\$?([\d,]+\.\d{2})/i);
    if (openingMatch) summary.opening_balance = parseFloat(openingMatch[1].replace(/,/g, ''));

    const withdrawalsMatch = text.match(/Withdrawals[^\d]*-?([\d,]+\.\d{2})/i);
    if (withdrawalsMatch) summary.total_withdrawals = parseFloat(withdrawalsMatch[1].replace(/,/g, ''));

    const depositsMatch = text.match(/Deposits[^\d]*\+?([\d,]+\.\d{2})/i);
    if (depositsMatch) summary.total_deposits = parseFloat(depositsMatch[1].replace(/,/g, ''));

    const closingMatch = text.match(/Closing balance[^\$]*\$?([\d,]+\.\d{2})/i);
    if (closingMatch) summary.closing_balance = parseFloat(closingMatch[1].replace(/,/g, ''));

    return summary;
}

function parseTransactions(text, year) {
    const transactions = [];
    const lines = text.split('\n');

    let currentDate = null;
    let i = 0;

    while (i < lines.length) {
        const line = lines[i].trim();

        // Skip empty lines, headers, page markers
        if (!line ||
            line.includes('Transaction details') ||
            line.includes('Page ') ||
            line.includes('continued on next page') ||
            line.includes('DateDescription') ||
            line.includes('Balance forward') ||
            line.includes('Opening balance') ||
            line.includes('Closing balance') ||
            line.includes('CIBC Account Statement')) {
            i++;
            continue;
        }

        // Check if line starts with a date (CIBC format: "Nov 3")
        const dateMatch = line.match(/^(Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct)\s+(\d+)/);

        if (dateMatch) {
            const [, month, day] = dateMatch;
            currentDate = convertToISO(`${month} ${day}`, year);

            // Remove the date from the line to get the rest
            const restOfLine = line.substring(dateMatch[0].length);

            // Try to parse transaction from this line
            const transaction = parseTransactionLine(restOfLine, currentDate, lines, i);
            if (transaction) {
                transactions.push(transaction);
            }
        } else if (currentDate) {
            // This might be a continuation line or standalone transaction line
            const transaction = parseTransactionLine(line, currentDate, lines, i);
            if (transaction) {
                transactions.push(transaction);
            }
        }

        i++;
    }

    return transactions;
}

function parseTransactionLine(line, date, allLines, currentIndex) {
    // Skip correction entries - they're adjustments, not new transactions
    if (line.includes('CORRECTION')) {
        return null;
    }

    // Common CIBC transaction patterns
    const patterns = [
        {
            type: 'VISA DEBIT RETAIL PURCHASE',
            regex: /VISA DEBIT.*PURCHASE/i,
            merchantNext: true,
            isCredit: false
        },
        {
            type: 'VISA DEBIT PURCHASE REVERSAL',
            regex: /VISA DEBIT.*REVERSAL/i,
            merchantNext: true,
            isCredit: true
        },
        {
            type: 'INTL VISA DEB RETAIL PURCHASE',
            regex: /INTL VISA DEB.*PURCHASE/i,
            merchantNext: true,
            isCredit: false
        },
        {
            type: 'E-TRANSFER',
            regex: /E-TRANSFER/i,
            merchant: 'E-Transfer',
            isCredit: true
        },
        {
            type: 'PREAUTHORIZED DEBIT',
            regex: /PREAUTHORIZED DEBIT/i,
            merchantNext: true,
            isCredit: false
        },
        {
            type: 'DEPOSIT',
            regex: /^DEPOSIT$/i,
            merchantNext: true,
            isCredit: true
        },
        {
            type: 'INTERNET TRANSFER',
            regex: /INTERNET TRANSFER/i,
            merchant: 'Internet Transfer',
            isCredit: false  // Usually withdrawals
        },
        {
            type: 'SERVICE CHARGE',
            regex: /SERVICE CHARGE/i,
            merchantNext: true,
            isCredit: false
        }
    ];

    for (const pattern of patterns) {
        if (pattern.regex.test(line)) {
            let merchant = pattern.merchant || 'Unknown';
            let amount = 0;

            // Look at next lines for merchant name and amount
            if (pattern.merchantNext && currentIndex + 1 < allLines.length) {
                const nextLine = allLines[currentIndex + 1].trim();
                const merchantMatch = nextLine.match(/^([A-Z][A-Z\s\/\.\*\-\[\]]+?)(?:\s+[\d,\.]+|$)/);
                if (merchantMatch) {
                    merchant = merchantMatch[1].trim();
                }
            }

            // Extract amount - look in current line and next few lines
            const searchText = allLines.slice(currentIndex, currentIndex + 3).join(' ');
            const amountMatch = searchText.match(/([\d,]+\.\d{2})/);

            if (amountMatch) {
                amount = parseFloat(amountMatch[1].replace(/,/g, ''));

                return {
                    date: date,
                    type: pattern.isCredit ? 'credit' : 'debit',
                    merchant: cleanMerchantName(merchant),
                    description: pattern.type,
                    amount: pattern.isCredit ? amount : -amount
                };
            }
        }
    }

    return null;
}

function cleanMerchantName(merchant) {
    // Remove extra spaces
    merchant = merchant.replace(/\s+/g, ' ').trim();

    // Remove [REDACTED], [RECIPIENT], [REF] markers from scrubbing
    merchant = merchant.replace(/\[REDACTED\]/g, '').trim();
    merchant = merchant.replace(/\[RECIPIENT\]/g, 'E-Transfer Recipient').trim();
    merchant = merchant.replace(/\[REF\]/g, '').trim();

    // Remove common suffixes
    merchant = merchant.replace(/\s+INC\.?$/i, '');
    merchant = merchant.replace(/\s+LTD\.?$/i, '');
    merchant = merchant.replace(/\s+CORP\.?$/i, '');

    // Normalize common merchants
    if (merchant.includes('UBER')) return 'Uber';
    if (merchant.includes('SPOTIFY')) return 'Spotify';
    if (merchant.includes('WEALTHSIMPLE')) return 'Wealthsimple';
    if (merchant.includes('GOODLIFE')) return 'GoodLife Fitness';
    if (merchant.includes('SPORTCHEK')) return 'SportChek';
    if (merchant.includes('MARKS.COM')) return 'Marks';
    if (merchant.includes('CIBC Securities')) return 'CIBC Securities';

    return merchant || 'Unknown Merchant';
}

function convertToISO(dateStr, year) {
    const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    const parts = dateStr.trim().split(/\s+/);
    const month = months[parts[0]];
    const day = parts[1].padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function parse(scrubbedText) {
    const period = parseStatementPeriod(scrubbedText);
    const summary = parseAccountSummary(scrubbedText);
    const year = period ? period.start_date.split('-')[0] : '2025';
    const transactions = parseTransactions(scrubbedText, year);

    return {
        statement_period: period,
        summary: summary,
        transactions: transactions
    };
}

module.exports = { parse };
