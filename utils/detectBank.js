/**
 * Detects which bank issued the statement based on text content
 * @param {string} text - Raw statement text
 * @returns {string} - Bank identifier ('cibc', 'rbc', etc.)
 * @throws {Error} - If bank cannot be identified
 */
function detectBank(text) {
    // Check first 500 characters for bank identifiers (headers usually appear early)
    const header = text.substring(0, 500);

    // RBC detection
    if (header.includes('Royal Bank of Canada') ||
        header.includes('RBC') && header.includes('account statement') ||
        header.includes('www.rbcroyalbank.com')) {
        return 'rbc';
    }

    // CIBC detection
    if (header.includes('CIBC Account Statement') ||
        header.includes('CIBC') && header.includes('Account Statement')) {
        return 'cibc';
    }

    // TD detection (future)
    if (header.includes('TD Canada Trust')) {
        return 'td';
    }

    // Scotiabank detection (future)
    if (header.includes('Scotiabank') || header.includes('Scotia')) {
        return 'scotiabank';
    }

    // BMO detection (future)
    if (header.includes('BMO') || header.includes('Bank of Montreal')) {
        return 'bmo';
    }

    throw new Error('Unable to detect bank from statement. Supported banks: CIBC, RBC');
}

module.exports = { detectBank };
