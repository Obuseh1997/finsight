const fs = require('fs');
const { detectBank } = require('./utils/detectBank');

/**
 * Multi-bank PII scrubber
 * Automatically detects bank and applies appropriate scrubbing rules
 *
 * Usage: node scrubPII-v2.js [input-file] [output-file]
 * Example: node scrubPII-v2.js output.txt output-scrubbed.txt
 */

function scrubPII(text) {
    try {
        // Auto-detect which bank issued the statement
        const bank = detectBank(text);
        console.log(`✓ Detected bank: ${bank.toUpperCase()}`);

        // Load bank-specific scrubber
        const scrubber = require(`./scrubbers/${bank}`);

        // Apply bank-specific scrubbing
        const scrubbedText = scrubber.scrub(text);

        return scrubbedText;
    } catch (error) {
        if (error.message.includes('Unable to detect bank')) {
            throw new Error('Cannot scrub PII: ' + error.message);
        }
        throw error;
    }
}

// Main execution
function main() {
    try {
        // Get file paths from command line args or use defaults
        const inputFile = process.argv[2] || './output.txt';
        const outputFile = process.argv[3] || './output-scrubbed.txt';

        console.log('Reading from:', inputFile);

        if (!fs.existsSync(inputFile)) {
            console.error(`Error: Input file "${inputFile}" not found`);
            console.log('\nUsage: node scrubPII-v2.js [input-file] [output-file]');
            console.log('Example: node scrubPII-v2.js output.txt output-scrubbed.txt');
            process.exit(1);
        }

        const rawText = fs.readFileSync(inputFile, 'utf8');

        console.log('Detecting bank and scrubbing PII...');
        const scrubbedText = scrubPII(rawText);

        console.log('Writing to:', outputFile);
        fs.writeFileSync(outputFile, scrubbedText, 'utf8');

        console.log('\n✓ PII scrubbing complete!');
        console.log(`Original length: ${rawText.length} characters`);
        console.log(`Scrubbed length: ${scrubbedText.length} characters`);
        console.log(`\nNext step: Run 'node parseTransactions.js' to extract transaction data`);

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        process.exit(1);
    }
}

// Run if called directly (not required as module)
if (require.main === module) {
    main();
}

// Export for use as module
module.exports = { scrubPII };
