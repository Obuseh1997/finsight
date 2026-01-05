const fs = require('fs');
const { PdfReader } = require('pdfreader');

/**
 * Coordinate-based PDF table extractor v2
 * Fixed logic based on actual coordinate analysis
 * 100% LOCAL - no data sent anywhere
 */

function extractWithCoordinates(pdfPath) {
    return new Promise((resolve, reject) => {
        const items = [];

        new PdfReader().parseFileItems(pdfPath, (err, item) => {
            if (err) {
                reject(err);
            } else if (!item) {
                resolve(items);
            } else if (item.text) {
                items.push({
                    page: item.page,
                    x: item.x,
                    y: item.y,
                    text: item.text
                });
            }
        });
    });
}

function parseTransactions(items) {
    // Filter to only transaction detail items
    const transactionItems = items.filter(item => {
        // Skip headers
        if (item.text === 'Date' || item.text === 'Description' ||
            item.text === 'Withdrawals ($)' || item.text === 'Deposits ($)' ||
            item.text === 'Balance ($)' ||
            item.text === 'DateDescriptionWithdrawals ($)Deposits ($)Balance ($)' ||
            item.text === 'Transaction details' ||
            item.text === 'Transaction details (continued)' ||
            item.text === 'Balance forward' ||
            item.text === 'Opening balance' ||
            item.text === 'Closing balance') {
            return false;
        }

        // Skip footer/junk
        if (item.text.includes('Free Transaction') ||
            item.text.includes('Important: This statement') ||
            item.text.includes('Foreign Currency') ||
            item.text.includes('Trademark') ||
            item.text.includes('Page ') ||
            item.text.includes('continued on next page') ||
            item.text.includes('10774E PER')) {
            return false;
        }

        // Skip header area (top of page)
        if (item.y < 7) {
            return false;
        }

        // Skip account summary AND contact information sections (Y= 17-26)
        if (item.y >= 17 && item.y <= 26.5) {
            // Skip anything in this Y range that's not clearly a transaction
            // Contact info is on the right (X > 24), account summary on left (X < 20)
            if (item.x > 24 || item.x < 20) {
                return false;
            }
        }

        return true;
    });

    // Group by transaction (same date Y position = same transaction)
    const transactions = {};

    transactionItems.forEach(item => {
        const x = item.x;
        const y = Math.round(item.y * 4) / 4;  // Group by Y position

        // Initialize transaction row
        if (!transactions[y]) {
            transactions[y] = {
                y: item.y,
                date: null,
                description: [],
                withdrawal: null,
                deposit: null,
                balance: null
            };
        }

        // Assign to column based on X position
        if (x >= 2.5 && x <= 3.5) {
            // Date column
            if (item.text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/)) {
                transactions[y].date = item.text;
            }
        } else if (x >= 5.5 && x <= 7.5) {
            // Description column
            transactions[y].description.push(item.text);
        } else if (x >= 18 && x <= 22) {
            // Withdrawals column
            const amount = parseAmount(item.text);
            if (amount !== null) {
                transactions[y].withdrawal = amount;
            }
        } else if (x >= 24 && x <= 27.5) {
            // Deposits column
            const amount = parseAmount(item.text);
            if (amount !== null) {
                transactions[y].deposit = amount;
            }
        } else if (x >= 32 && x <= 34) {
            // Balance column
            const amount = parseAmount(item.text);
            if (amount !== null) {
                transactions[y].balance = amount;
            }
        }
    });

    // Convert to array and sort by Y position
    const sortedTransactions = Object.values(transactions)
        .sort((a, b) => a.y - b.y);

    // Build final transaction list
    const result = [];
    let currentDate = null;

    for (const row of sortedTransactions) {
        // Update current date if this row has a date
        if (row.date) {
            currentDate = row.date;
        }

        // Skip rows without amounts
        if (row.withdrawal === null && row.deposit === null && row.balance === null) {
            continue;
        }

        // Determine transaction type and amount
        const isCredit = row.deposit !== null && row.deposit > 0;
        const amount = isCredit ? row.deposit : (row.withdrawal || 0);

        if (currentDate && amount > 0) {
            const description = row.description.join(' ').trim();

            result.push({
                date: currentDate,
                description: description,
                merchant: extractMerchant(description),
                amount: isCredit ? amount : -amount,
                type: isCredit ? 'credit' : 'debit',
                withdrawal: row.withdrawal,
                deposit: row.deposit,
                balance: row.balance
            });
        }
    }

    return result;
}

function parseAmount(text) {
    if (!text) return null;
    // Remove currency symbols, spaces, and parse
    const cleaned = text.replace(/[\$\s]/g, '').replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

function extractMerchant(description) {
    // Remove transaction types
    let merchant = description
        .replace(/VISA DEBIT.*?PURCHASE/i, '')
        .replace(/E-TRANSFER/i, 'E-Transfer')
        .replace(/PREAUTHORIZED DEBIT/i, '')
        .replace(/INTERNET TRANSFER/i, 'Internet Transfer')
        .replace(/DEPOSIT/i, '')
        .trim();

    // Remove reference numbers (long digit sequences)
    merchant = merchant.replace(/\d{8,}/g, '').trim();

    // Clean up
    merchant = merchant.replace(/\s+/g, ' ').trim();

    // Normalize common merchants
    if (merchant.match(/UBER/i)) return 'Uber';
    if (merchant.match(/SPOTIFY/i)) return 'Spotify';
    if (merchant.match(/WEALTHSIMPLE/i)) return 'Wealthsimple';
    if (merchant.match(/FOOD BASICS/i)) return 'Food Basics';
    if (merchant.match(/STARBUCKS/i)) return 'Starbucks';
    if (merchant.match(/REXALL/i)) return 'Rexall Pharmacy';
    if (merchant.match(/GOODLIFE/i)) return 'GoodLife Fitness';
    if (merchant.match(/SPORTCHEK/i)) return 'SportChek';
    if (merchant.match(/MARKS/i)) return 'Marks';

    return merchant || 'Unknown';
}

async function main() {
    try {
        const pdfPath = process.argv[2] || '/Users/emekeobuseh/Downloads/CIBC Statement - Nov 25.pdf';
        const outputPath = process.argv[3] || './transactions-table.json';

        console.log('📄 Extracting PDF with coordinates (100% local):', pdfPath);
        const items = await extractWithCoordinates(pdfPath);
        console.log(`✓ Extracted ${items.length} text items`);

        console.log('\n💰 Parsing transactions...');
        const transactions = parseTransactions(items);
        console.log(`✓ Extracted ${transactions.length} transactions`);

        // Calculate totals for validation
        const totalDebits = transactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const totalCredits = transactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);

        console.log('\n--- Validation ---');
        console.log(`Total debits: $${totalDebits.toFixed(2)}`);
        console.log(`Total credits: $${totalCredits.toFixed(2)}`);

        // Show sample
        console.log('\n--- Sample transactions ---');
        transactions.slice(0, 10).forEach(t => {
            const sign = t.type === 'debit' ? '-' : '+';
            console.log(`  ${t.date.padEnd(10)} | ${t.merchant.padEnd(25)} | ${sign}$${Math.abs(t.amount).toFixed(2).padStart(8)}`);
        });

        // Save
        const result = {
            extracted_at: new Date().toISOString(),
            source_file: pdfPath,
            transactions: transactions
        };

        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`\n✓ Saved to ${outputPath}`);

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
