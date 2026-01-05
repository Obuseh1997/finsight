/**
 * RBC-specific PII scrubbing patterns
 */

function scrub(text) {
    let scrubbed = text;

    // 1. Remove account numbers - RBC format: "Your account number:00776-5295423"
    scrubbed = scrubbed.replace(/(?:Your\s+)?account number[:\s]*(\d{5}-\d{7})/gi, 'Account number: [REDACTED]');

    // 2. Remove standalone account numbers (RBC repeats it without label)
    // Match 5-digit dash 7-digit pattern anywhere
    scrubbed = scrubbed.replace(/\b\d{5}-\d{7}\b/g, '[REDACTED]');

    // 3. Remove mailing address blocks (name + unit/apt + street + city/province/postal)
    // This is tricky - need to match multi-line address patterns

    // Match full name in all caps (at start of line, 2+ words)
    scrubbed = scrubbed.replace(/^([A-Z]+\s+[A-Z\-]+(?:\s+[A-Z\-]+)*)$/gm, (match) => {
        // Keep bank names, document labels, etc.
        const keepPatterns = [
            'ROYAL BANK', 'RBC', 'ACCOUNT', 'STATEMENT', 'TRANSACTION',
            'SERVICE', 'DEPOSIT', 'BALANCE', 'DETAILS', 'SUMMARY',
            'OPENING', 'CLOSING', 'WITHDRAWALS', 'DEPOSITS', 'CONTACT',
            'IMPORTANT', 'PROTECT', 'INFORMATION', 'CANADIAN'
        ];
        if (keepPatterns.some(pattern => match.includes(pattern))) {
            return match;
        }
        // If it's a person's name (2-3 words, all caps, reasonable length)
        const words = match.trim().split(/\s+/);
        if (words.length >= 2 && words.length <= 4 && match.length < 50) {
            return '[NAME REDACTED]';
        }
        return match;
    });

    // Match unit numbers (B206, APT 5, etc.)
    scrubbed = scrubbed.replace(/^[A-Z]?\d{1,4}[A-Z]?$/gm, '[UNIT]');

    // Match street addresses (number + street name)
    scrubbed = scrubbed.replace(/^\d{1,5}\s+[A-Z\s]+(?:STREET|ST|DRIVE|DR|AVENUE|AVE|ROAD|RD|BOULEVARD|BLVD|LANE|LN|COURT|CT|CRESCENT|CRES)$/gmi, '[ADDRESS]');

    // Match city/province/postal (OTTAWA ON K1V 2T7 format)
    scrubbed = scrubbed.replace(/^[A-Z\s]+\s+[A-Z]{2}\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d$/gm, '[CITY/POSTAL]');

    // 4. Remove branch addresses (similar pattern but keep "Royal Bank of Canada")
    scrubbed = scrubbed.replace(/^\d{1,5}\s+[A-Z\s]+(?:DR|ST|AVE|RD|BLVD),\s+[A-Z\s]+,\s+[A-Z]{2}\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d$/gm, '[BRANCH ADDRESS]');

    // 5. Remove e-transfer recipient names (RBC one-line format)
    // Pattern: "e-Transfer sent RecipientName REFCODE"
    scrubbed = scrubbed.replace(/(e-Transfer sent)\s+([A-Za-z\s]+?)\s+([A-Z0-9]{6})/g, '$1 [RECIPIENT] [REF]');

    // 6. Remove e-transfer reference codes (6-character alphanumeric, standalone)
    // These appear on separate lines sometimes
    scrubbed = scrubbed.replace(/\b[A-Z0-9]{6}\b(?=\d)/g, '[REF]');

    // 7. Remove transaction reference numbers (4-digit codes after purchase type)
    scrubbed = scrubbed.replace(/(Contactless Interac purchase|Online Banking payment|Telephone Bill Pmt)\s+-\s+\d{4}/g, '$1 - [REF]');

    // 8. Remove RBC internal document tracking codes
    scrubbed = scrubbed.replace(/RBPDA\d+_\d+_\d+[-\s\w]*/g, '[DOC-REF]');

    // 9. Remove barcode numbers and internal IDs
    scrubbed = scrubbed.replace(/\*\d{8}\*/g, '[BARCODE]');

    // 10. Remove phone numbers (1-800-XXX-XXXX format)
    scrubbed = scrubbed.replace(/\d-\d{3}-\d{3}-\d{4}/g, '[PHONE]');

    // 11. Clean up multiple blank lines
    scrubbed = scrubbed.replace(/\n{3,}/g, '\n\n');

    return scrubbed;
}

module.exports = { scrub };
