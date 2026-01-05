const fs = require('fs');
const { detectBank } = require('./utils/detectBank');

/**
 * Balance-based transaction parser (v3)
 * Uses balance column to calculate correct amounts (no more guessing!)
 *
 * Usage: node parseTransactions-v3.js [input-file] [output-file]
 * Example: node parseTransactions-v3.js output-scrubbed.txt transactions.json
 */

function parseTransactions(text) {
    try {
        // Auto-detect which bank issued the statement
        const bank = detectBank(text);
        console.log(`✓ Detected bank: ${bank.toUpperCase()}`);

        // Use balance-based parser (works for all banks)
        const parser = require('./parsers/balance-based');

        // Parse transactions
        const result = parser.parse(text, bank);

        return result;
    } catch (error) {
        if (error.message.includes('Unable to detect bank')) {
            throw new Error('Cannot parse transactions: ' + error.message);
        }
        throw error;
    }
}

// Main execution
function main() {
    try {
        // Get file paths from command line args or use defaults
        const inputFile = process.argv[2] || './output-scrubbed.txt';
        const outputFile = process.argv[3] || './transactions.json';

        console.log('Reading from:', inputFile);

        if (!fs.existsSync(inputFile)) {
            console.error(`Error: Input file "${inputFile}" not found`);
            console.log('\nUsage: node parseTransactions-v3.js [input-file] [output-file]');
            console.log('Example: node parseTransactions-v3.js output-scrubbed.txt transactions.json');
            process.exit(1);
        }

        const scrubbedText = fs.readFileSync(inputFile, 'utf8');

        console.log('Using balance-based parsing (calculates amounts from balance column)...');
        const result = parseTransactions(scrubbedText);

        console.log('Writing to:', outputFile);
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8');

        console.log('\n✓ Transaction parsing complete!');
        console.log(`Found ${result.transactions.length} transactions`);

        if (result.statement_period) {
            console.log(`Period: ${result.statement_period.start_date} to ${result.statement_period.end_date}`);
        }

        if (result.summary.opening_balance !== undefined) {
            console.log(`Opening balance: $${result.summary.opening_balance.toFixed(2)}`);
        }

        if (result.summary.closing_balance !== undefined) {
            console.log(`Closing balance: $${result.summary.closing_balance.toFixed(2)}`);
        }

        // Validate totals
        const calculatedDebits = result.transactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);

        const calculatedCredits = result.transactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        console.log('\n--- Validation ---');
        console.log(`Calculated debits: $${calculatedDebits.toFixed(2)}`);
        console.log(`Statement says: $${result.summary.total_withdrawals?.toFixed(2) || 'N/A'}`);

        if (result.summary.total_withdrawals) {
            const diff = Math.abs(calculatedDebits - result.summary.total_withdrawals);
            if (diff < 1) {
                console.log('✓ Debits match!');
            } else {
                console.log(`⚠️  Difference: $${diff.toFixed(2)}`);
            }
        }

        // Show sample transactions
        if (result.transactions.length > 0) {
            console.log('\nSample transactions:');
            result.transactions.slice(0, 5).forEach(t => {
                const sign = t.amount > 0 ? '-' : '+';
                console.log(`  ${t.date} | ${t.merchant.padEnd(25)} | ${sign}$${Math.abs(t.amount).toFixed(2)}`);
            });
            if (result.transactions.length > 5) {
                console.log(`  ... and ${result.transactions.length - 5} more`);
            }
        }

        console.log(`\nOutput saved to: ${outputFile}`);

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly (not required as module)
if (require.main === module) {
    main();
}

// Export for use as module
module.exports = { parseTransactions };
