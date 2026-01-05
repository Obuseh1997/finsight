/**
 * RBC-specific transaction parser
 * Handles RBC statement format and transaction patterns
 */

function parseStatementPeriod(text) {
    // RBC format: "From October 24, 2025 to November 24, 2025"
    const periodMatch = text.match(/From\s+([A-Z][a-z]+\s+\d+),\s+(\d{4})\s+to\s+([A-Z][a-z]+\s+\d+),\s+(\d{4})/);

    if (periodMatch) {
        const [, startDate, startYear, endDate, endYear] = periodMatch;
        return {
            start_date: convertToISO(startDate, startYear),
            end_date: convertToISO(endDate, endYear)
        };
    }

    return null;
}

function parseAccountSummary(text) {
    const summary = {};

    const openingMatch = text.match(/(?:Your\s+)?opening balance[^\$]*\$?([\d,]+\.\d{2})/i);
    if (openingMatch) summary.opening_balance = parseFloat(openingMatch[1].replace(/,/g, ''));

    const withdrawalsMatch = text.match(/Total withdrawals[^\d]*-?\s*([\d,]+\.\d{2})/i);
    if (withdrawalsMatch) summary.total_withdrawals = parseFloat(withdrawalsMatch[1].replace(/,/g, ''));

    const depositsMatch = text.match(/Total deposits[^\d]*\+?\s*([\d,]+\.\d{2})/i);
    if (depositsMatch) summary.total_deposits = parseFloat(depositsMatch[1].replace(/,/g, ''));

    const closingMatch = text.match(/(?:Your\s+)?closing balance[^\$]*\$?([\d,]+\.\d{2})/i);
    if (closingMatch) summary.closing_balance = parseFloat(closingMatch[1].replace(/,/g, ''));

    return summary;
}

function parseTransactions(text, year) {
    const transactions = [];
    const lines = text.split('\n');

    let currentDate = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines, headers, page markers
        if (!line ||
            line.includes('Details of your account activity') ||
            line.includes('Page ') ||
            line.includes('DateDescription') ||
            line.includes('Opening Balance') ||
            line.includes('Closing Balance') ||
            line.includes('Your RBC personal banking') ||
            line.includes('Royal Bank of Canada')) {
            continue;
        }

        // RBC date format: "27 Oct" or "3 Nov" at start of line
        const dateMatch = line.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);

        if (dateMatch) {
            const [, day, month] = dateMatch;
            currentDate = convertToISO(`${month} ${day}`, year);

            // Remove date from line
            const restOfLine = line.substring(dateMatch[0].length).trim();

            // Parse transaction from rest of line
            const transaction = parseTransactionLine(restOfLine, currentDate, lines, i);
            if (transaction) {
                transactions.push(transaction);
            }
        } else if (currentDate) {
            // Continuation line or standalone transaction
            const transaction = parseTransactionLine(line, currentDate, lines, i);
            if (transaction) {
                transactions.push(transaction);
            }
        }
    }

    return transactions;
}

function parseTransactionLine(line, date, allLines, currentIndex) {
    // Skip balance lines
    if (/^\d+,?\d*\.\d{2}$/.test(line)) {
        return null;
    }

    // RBC transaction patterns
    const patterns = [
        {
            type: 'E-Transfer',
            regex: /e-Transfer sent/i,
            isCredit: false,  // Sent = debit
            extractMerchant: (line) => {
                // Format: "e-Transfer sent [RECIPIENT] [REF]200.00"
                const match = line.match(/e-Transfer sent\s+(.+?)(?:\d+\.\d{2}|$)/i);
                return match ? match[1].trim() : 'E-Transfer';
            }
        },
        {
            type: 'Interac Purchase',
            regex: /Contactless Interac purchase/i,
            isCredit: false,
            extractMerchant: (line, lines, idx) => {
                // Merchant is usually on next line
                if (idx + 1 < lines.length) {
                    const nextLine = lines[idx + 1].trim();
                    // RBC format: "MERCHANT NAME 123amount.dollarsamount.dollars"
                    // We need to extract just the merchant name (may include store number)
                    // Look for pattern: letters/spaces/underscores, optionally followed by 2-4 digits (store number)
                    const match = nextLine.match(/^([A-Z\s_]+\d{2,4}?)/);
                    if (match) return match[1].trim();
                }
                return 'Contactless Purchase';
            }
        },
        {
            type: 'Online Banking Payment',
            regex: /Online Banking payment/i,
            isCredit: false,
            extractMerchant: (line, lines, idx) => {
                // Merchant on same or next line
                const match = line.match(/Online Banking payment\s*-\s*\[REF\]\s*([A-Z\s]+)/i);
                if (match) return match[1].trim();

                if (idx + 1 < lines.length) {
                    const nextLine = lines[idx + 1].trim();
                    const merchantMatch = nextLine.match(/^([A-Z\s]+?)(\d|$)/);
                    if (merchantMatch) return merchantMatch[1].trim();
                }
                return 'Online Payment';
            }
        },
        {
            type: 'Telephone Bill Payment',
            regex: /Telephone Bill Pmt/i,
            isCredit: false,
            extractMerchant: (line) => {
                const match = line.match(/Telephone Bill Pmt\s+(.+?)(?:\d+\.\d{2}|$)/i);
                return match ? match[1].trim() : 'Bill Payment';
            }
        },
        {
            type: 'Misc Payment',
            regex: /Misc Payment/i,
            isCredit: true,  // Usually credits/refunds
            extractMerchant: (line) => {
                const match = line.match(/Misc Payment\s+(.+?)(?:\d+\.\d{2}|$)/i);
                return match ? match[1].trim() : 'Misc Payment';
            }
        },
        {
            type: 'Monthly Fee',
            regex: /Monthly fee/i,
            isCredit: false,
            extractMerchant: () => 'RBC Monthly Fee'
        }
    ];

    for (const pattern of patterns) {
        if (pattern.regex.test(line)) {
            // Extract merchant name
            let merchant = 'Unknown';
            if (pattern.extractMerchant) {
                merchant = pattern.extractMerchant(line, allLines, currentIndex);
            }

            // Extract amount from next line
            // RBC format (from actual PDF - spaces get removed by pdf-parse):
            // Actual PDF: "FOOD BASICS 87 3.98"           → pdf-parse: "FOOD BASICS 873.98"
            // Actual PDF: "FOOD BASICS 87 110.71"         → pdf-parse: "FOOD BASICS 87110.71"
            // Actual PDF: "REXALL PHARMACY 34.12 4,228.75" → pdf-parse: "REXALL PHARMACY34.124,228.75"
            //
            // Pattern:
            // - 2 decimal numbers: Last one is amount (store code + amount)
            // - 3+ decimal numbers: Second-to-last is amount (store + amount + balance)
            // - Amount is always the number RIGHT BEFORE the balance (if balance exists) or last number
            let amount = 0;

            if (currentIndex + 1 < allLines.length) {
                const nextLine = allLines[currentIndex + 1].trim();

                // Find ALL decimal numbers (amounts can have commas: 1,350.00)
                const allNumbers = nextLine.match(/[\d,]+\.\d{2}/g);

                if (allNumbers && allNumbers.length > 0) {
                    if (allNumbers.length === 1) {
                        // Only one number visible
                        const numStr = allNumbers[0];
                        const intPart = numStr.split('.')[0].replace(/,/g, '');

                        // Check if this might be store code + amount glued together
                        // Pattern: 3-5 digit number = likely store (2-3 digits) + amount (1-3 digits)
                        if (intPart.length >= 3 && intPart.length <= 5 && !numStr.includes(',')) {
                            // Extract last 1-3 digits before decimal as amount
                            // e.g., "873.98" -> "3.98", "87110.71" -> "10.71", "74613.56" -> "13.56"
                            const match = numStr.match(/(\d{1,3})\.(\d{2})$/);
                            if (match) {
                                amount = parseFloat(`${match[1]}.${match[2]}`);
                            }
                        } else {
                            // Normal amount (< 3 digits or has comma = real amount)
                            amount = parseFloat(numStr.replace(/,/g, ''));
                        }
                    } else if (allNumbers.length === 2) {
                        // Two numbers: Could be AMOUNT + BALANCE
                        const nums = allNumbers.map(n => parseFloat(n.replace(/,/g, '')));
                        // If second number is much larger (>1000), first is amount
                        if (nums[1] > 1000) {
                            amount = nums[0];
                        } else {
                            // Both small: last one is likely amount
                            amount = nums[1];
                        }
                    } else if (allNumbers.length >= 3) {
                        // Three+ numbers: STORE + AMOUNT + BALANCE
                        const nums = allNumbers.map(n => parseFloat(n.replace(/,/g, '')));
                        amount = nums[nums.length - 2];
                    }
                }
            }

            if (amount > 0) {
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

    // Remove scrubbing markers
    merchant = merchant.replace(/\[REDACTED\]/g, '').trim();
    merchant = merchant.replace(/\[RECIPIENT\]/g, 'E-Transfer Recipient').trim();
    merchant = merchant.replace(/\[REF\]/g, '').trim();

    // Remove trailing numbers (location codes)
    merchant = merchant.replace(/\s+\d{2,4}$/, '');

    // Remove common suffixes
    merchant = merchant.replace(/\s+INC\.?$/i, '');
    merchant = merchant.replace(/\s+LTD\.?$/i, '');

    // Normalize common merchants
    if (merchant.includes('FOOD BASICS')) return 'Food Basics';
    if (merchant.includes('STARBUCKS')) return 'Starbucks';
    if (merchant.includes('REXALL')) return 'Rexall Pharmacy';
    if (merchant.includes('GREEN FRESH')) return 'Green Fresh';
    if (merchant.includes('EVERGREEN')) return 'Evergreen Kitchen';
    if (merchant.includes('MARSHALLS')) return 'Marshalls';
    if (merchant.includes('LAGO BAR')) return 'Lago Bar & Grill';
    if (merchant.includes('FIDO')) return 'Fido Mobile';
    if (merchant.includes('COKE_')) return 'Coca-Cola Vending';
    if (merchant.includes('SUPPLEMENT')) return 'Supplement King';
    if (merchant.includes('ZERO LATENCY')) return 'Zero Latency';

    // Clean up underscores and weird formatting
    merchant = merchant.replace(/_/g, ' ');

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
