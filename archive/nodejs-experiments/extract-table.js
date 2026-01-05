const fs = require('fs');
const { PdfReader } = require('pdfreader');

/**
 * Coordinate-based PDF table extractor
 * Extracts bank statement transactions using X/Y coordinates to detect columns
 * 100% LOCAL - no data sent anywhere during extraction
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

function detectColumns(items) {
    // Analyze X positions to find column boundaries
    const xCounts = {};

    items.forEach(item => {
        const x = Math.round(item.x * 2) / 2; // Round to 0.5
        xCounts[x] = (xCounts[x] || 0) + 1;
    });

    // Find most common X positions (minimum 10 occurrences)
    const commonX = Object.entries(xCounts)
        .filter(([x, count]) => count >= 10)
        .map(([x, count]) => ({ x: parseFloat(x), count }))
        .sort((a, b) => a.x - b.x);

    console.log('\nMost common X positions:');
    commonX.slice(0, 15).forEach(({ x, count }) => {
        console.log(`  X=${x.toFixed(1)}: ${count} items`);
    });

    // Heuristic: Identify columns based on common positions
    // For CIBC/RBC: Date (~3), Description (~6), Withdrawals (~21), Deposits (~27), Balance (~33)
    const xValues = commonX.map(c => c.x);

    const columns = {
        date: xValues.find(x => x >= 2.5 && x <= 4) || 3,
        description: xValues.find(x => x >= 5.5 && x <= 7.5) || 6.5,
        withdrawals: xValues.find(x => x >= 20 && x <= 22) || 21,
        deposits: xValues.find(x => x >= 25.5 && x <= 28) || 26.5,
        balance: xValues.find(x => x >= 32) || 33
    };

    console.log('\nDetected columns:', columns);
    return columns;
}

function groupByRows(items) {
    // Group items by Y position (same row)
    const rows = {};

    items.forEach(item => {
        const y = Math.round(item.y * 4) / 4; // Round to 0.25 for row grouping
        if (!rows[y]) rows[y] = [];
        rows[y].push(item);
    });

    // Sort rows by Y position (top to bottom)
    const sortedRows = Object.entries(rows)
        .map(([y, items]) => ({ y: parseFloat(y), items: items.sort((a, b) => a.x - b.x) }))
        .sort((a, b) => a.y - b.y);

    return sortedRows;
}

function assignToColumns(row, columns) {
    // Assign each item in a row to its column based on X position
    const assigned = {
        date: [],
        description: [],
        withdrawals: [],
        deposits: [],
        balance: []
    };

    row.items.forEach(item => {
        const x = item.x;

        // Determine which column this item belongs to
        if (x < columns.description - 2) {
            assigned.date.push(item.text);
        } else if (x < columns.withdrawals - 2) {
            assigned.description.push(item.text);
        } else if (x < columns.deposits - 2) {
            assigned.withdrawals.push(item.text);
        } else if (x < columns.balance - 2) {
            assigned.deposits.push(item.text);
        } else {
            assigned.balance.push(item.text);
        }
    });

    // Join text within each column
    return {
        date: assigned.date.join(' ').trim(),
        description: assigned.description.join(' ').trim(),
        withdrawals: assigned.withdrawals.join(' ').trim(),
        deposits: assigned.deposits.join(' ').trim(),
        balance: assigned.balance.join(' ').trim()
    };
}

function parseAmount(text) {
    if (!text) return null;
    // Remove currency symbols, spaces, and parse
    const cleaned = text.replace(/[\$\s]/g, '').replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

function parseTransactions(rows, columns) {
    const transactions = [];
    let currentDate = null;
    let currentDescription = [];

    // Filter out header rows and junk
    const dataRows = rows.filter(row => {
        const cols = assignToColumns(row, columns);
        const text = (cols.date + cols.description + cols.withdrawals + cols.deposits + cols.balance).toLowerCase();

        // Skip headers, footers, and junk
        return !text.includes('transaction details') &&
               !text.includes('opening balance') &&
               !text.includes('closing balance') &&
               !text.includes('page of') &&
               !text.includes('account statement') &&
               !text.includes('cibc in writing') &&
               !text.includes('trademark') &&
               row.y > 5; // Skip top header area
    });

    dataRows.forEach(row => {
        const cols = assignToColumns(row, columns);

        // Check if this row has a date (format: "Nov 3", "Dec 25", etc)
        const dateMatch = cols.date.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/);
        if (dateMatch) {
            // New transaction starts - save previous if exists
            if (currentDate && currentDescription.length > 0) {
                const withdrawal = parseAmount(cols.withdrawals);
                const deposit = parseAmount(cols.deposits);
                const balance = parseAmount(cols.balance);

                if (withdrawal || deposit || balance) {
                    const isCredit = deposit !== null && deposit > 0;
                    const amount = isCredit ? deposit : (withdrawal || 0);

                    transactions.push({
                        date: currentDate,
                        description: currentDescription.join(' '),
                        merchant: extractMerchant(currentDescription.join(' ')),
                        amount: isCredit ? amount : -amount,
                        type: isCredit ? 'credit' : 'debit',
                        balance: balance
                    });
                }
            }

            // Start new transaction
            currentDate = cols.date;
            currentDescription = cols.description ? [cols.description] : [];
        } else if (cols.description) {
            // Continuation of current transaction description
            currentDescription.push(cols.description);
        }

        // Check if this row has amounts (might be on same line or next line)
        const withdrawal = parseAmount(cols.withdrawals);
        const deposit = parseAmount(cols.deposits);
        const balance = parseAmount(cols.balance);

        if (currentDate && (withdrawal || deposit || balance)) {
            const isCredit = deposit !== null && deposit > 0;
            const amount = isCredit ? deposit : (withdrawal || 0);

            if (amount > 0 || balance !== null) {
                transactions.push({
                    date: currentDate,
                    description: currentDescription.join(' '),
                    merchant: extractMerchant(currentDescription.join(' ')),
                    amount: isCredit ? amount : -amount,
                    type: isCredit ? 'credit' : 'debit',
                    balance: balance
                });

                // Reset for next transaction
                currentDescription = [];
            }
        }
    });

    return transactions;
}

function extractMerchant(description) {
    // Extract merchant name from description
    // Remove transaction types
    let merchant = description
        .replace(/VISA DEBIT.*?PURCHASE/i, '')
        .replace(/E-TRANSFER/i, 'E-Transfer')
        .replace(/PREAUTHORIZED DEBIT/i, '')
        .replace(/INTERNET TRANSFER/i, 'Internet Transfer')
        .replace(/Contactless Interac purchase/i, '')
        .replace(/Online Banking payment/i, '')
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

    return merchant || 'Unknown';
}

async function main() {
    try {
        const pdfPath = process.argv[2] || '/Users/emekeobuseh/Downloads/CIBC Statement - Nov 25.pdf';
        const outputPath = process.argv[3] || './transactions-table.json';

        console.log('📄 Extracting PDF with coordinates (100% local):', pdfPath);
        const items = await extractWithCoordinates(pdfPath);
        console.log(`✓ Extracted ${items.length} text items`);

        console.log('\n📊 Detecting column boundaries...');
        const columns = detectColumns(items);

        console.log('\n🔄 Grouping by rows...');
        const rows = groupByRows(items);
        console.log(`✓ Found ${rows.length} rows`);

        console.log('\n💰 Parsing transactions...');
        const transactions = parseTransactions(rows, columns);
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
        transactions.slice(0, 5).forEach(t => {
            const sign = t.type === 'debit' ? '-' : '+';
            console.log(`  ${t.date.padEnd(10)} | ${t.merchant.padEnd(25)} | ${sign}$${Math.abs(t.amount).toFixed(2)}`);
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
