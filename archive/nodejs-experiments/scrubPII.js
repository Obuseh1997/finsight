const fs = require('fs');

/**
 * Scrubs personally identifiable information (PII) from bank statement text
 * Keeps: merchant names, dates, amounts, transaction types
 * Removes: account numbers, names, reference numbers
 */
function scrubPII(text) {
    let scrubbed = text;

    // 1. Remove account holder names (already done in your case, but keeping for future)
    // This is a generic pattern - might need adjustment per bank
    scrubbed = scrubbed.replace(/^[A-Z][A-Z\s]+$/gm, (match) => {
        // Keep known merchant/bank names, scrub personal names
        const keepPatterns = ['CIBC', 'VISA', 'ACCOUNT', 'STATEMENT', 'TRANSACTION', 'SERVICE', 'DEPOSIT', 'BALANCE'];
        if (keepPatterns.some(pattern => match.includes(pattern))) {
            return match;
        }
        return '[NAME REDACTED]';
    });

    // 2. Remove account numbers
    scrubbed = scrubbed.replace(/Account number[:\s]+[\d-]+/gi, 'Account number: [REDACTED]');

    // 3. Remove branch transit numbers
    scrubbed = scrubbed.replace(/Branch transit number[:\s]+\d+/gi, 'Branch transit number: [REDACTED]');

    // 4. Remove e-transfer recipient names
    // Pattern: E-TRANSFER followed by reference number, then name on next line
    scrubbed = scrubbed.replace(/(E-TRANSFER\s+)(\d+)\s*\n\s*([^\n]+)/g, '$1[REF]\n[RECIPIENT]');

    // 5. Remove transaction reference numbers after merchant names
    // Keep merchant name, remove long numeric codes
    scrubbed = scrubbed.replace(/([A-Z\/\*\s\.]+)\s{2,}(\d{10,})/g, '$1');

    // 6. Remove CAD conversion details (contains no useful info for insights)
    scrubbed = scrubbed.replace(/\d+\.\d{2} CAD @ [\d\.]+/g, '');

    // 7. Remove CIBC-specific IDs that appear in preauthorized debits
    scrubbed = scrubbed.replace(/^\d{10}\s*$/gm, '[REF]');

    // 8. Clean up multiple blank lines created by removals
    scrubbed = scrubbed.replace(/\n{3,}/g, '\n\n');

    return scrubbed;
}

// Main execution
try {
    const inputFile = './output.txt';
    const outputFile = './output-scrubbed.txt';

    console.log('Reading from:', inputFile);
    const rawText = fs.readFileSync(inputFile, 'utf8');

    console.log('Scrubbing PII...');
    const scrubbedText = scrubPII(rawText);

    console.log('Writing to:', outputFile);
    fs.writeFileSync(outputFile, scrubbedText, 'utf8');

    console.log('\n✓ PII scrubbing complete!');
    console.log(`Original length: ${rawText.length} characters`);
    console.log(`Scrubbed length: ${scrubbedText.length} characters`);
    console.log(`\nNext step: Run 'node parseTransactions.js' to extract transaction data`);

} catch (error) {
    console.error('Error scrubbing PII:', error.message);
    process.exit(1);
}
