/**
 * CIBC-specific PII scrubbing patterns
 */

function scrub(text) {
    let scrubbed = text;

    // 1. Remove account holder names (generic pattern)
    scrubbed = scrubbed.replace(/^[A-Z][A-Z\s]+$/gm, (match) => {
        const keepPatterns = ['CIBC', 'VISA', 'ACCOUNT', 'STATEMENT', 'TRANSACTION', 'SERVICE', 'DEPOSIT', 'BALANCE'];
        if (keepPatterns.some(pattern => match.includes(pattern))) {
            return match;
        }
        return '[NAME REDACTED]';
    });

    // 2. Remove account numbers (CIBC format: ##-##### or similar)
    scrubbed = scrubbed.replace(/Account number[:\s]+[\d-]+/gi, 'Account number: [REDACTED]');

    // 3. Remove branch transit numbers
    scrubbed = scrubbed.replace(/Branch transit number[:\s]+\d+/gi, 'Branch transit number: [REDACTED]');

    // 4. Remove e-transfer recipient names (CIBC multi-line format)
    // Pattern: E-TRANSFER followed by reference number on one line, name on next line
    scrubbed = scrubbed.replace(/(E-TRANSFER\s+)(\d+)\s*\n\s*([^\n]+)/g, '$1[REF]\n[RECIPIENT]');

    // 5. Remove transaction reference numbers after merchant names (10+ digits)
    scrubbed = scrubbed.replace(/([A-Z\/\*\s\.]+)\s{2,}(\d{10,})/g, '$1');

    // 6. Remove CAD conversion details
    scrubbed = scrubbed.replace(/\d+\.\d{2} CAD @ [\d\.]+/g, '');

    // 7. Remove standalone long numeric IDs (CIBC preauth IDs)
    scrubbed = scrubbed.replace(/^\d{10}\s*$/gm, '[REF]');

    // 8. Clean up multiple blank lines
    scrubbed = scrubbed.replace(/\n{3,}/g, '\n\n');

    return scrubbed;
}

module.exports = { scrub };
