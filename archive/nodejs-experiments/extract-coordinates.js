const fs = require('fs');
const { PdfReader } = require('pdfreader');

/**
 * Extract PDF with X/Y coordinates to detect columns
 * 100% LOCAL - no data sent anywhere
 */

function extractWithCoordinates(pdfPath) {
    return new Promise((resolve, reject) => {
        const items = [];

        new PdfReader().parseFileItems(pdfPath, (err, item) => {
            if (err) {
                reject(err);
            } else if (!item) {
                // End of file
                resolve(items);
            } else if (item.text) {
                // Text item with coordinates
                items.push({
                    page: item.page || 0,  // Default to 0 if undefined
                    x: item.x,
                    y: item.y,
                    text: item.text,
                    width: item.w,
                    height: item.h
                });
            }
        });
    });
}

async function main() {
    try {
        const pdfPath = process.argv[2] || '/Users/emekeobuseh/Downloads/CIBC Statement - Nov 25.pdf';

        console.log('Extracting PDF with coordinates:', pdfPath);
        const items = await extractWithCoordinates(pdfPath);

        console.log(`\nExtracted ${items.length} text items with coordinates`);

        // Analyze X positions to detect columns
        console.log('\n--- Analyzing X positions (columns) ---');
        const xPositions = {};
        items.forEach(item => {
            const x = Math.round(item.x * 10) / 10; // Round to 1 decimal
            xPositions[x] = (xPositions[x] || 0) + 1;
        });

        // Find most common X positions (those are column starts)
        const commonX = Object.entries(xPositions)
            .filter(([x, count]) => count > 10)
            .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
            .slice(0, 10);

        console.log('Most common X positions (columns):');
        commonX.forEach(([x, count]) => {
            console.log(`  X=${x}: ${count} items`);
        });

        // Show sample data from first page
        console.log('\n--- Sample data from page 1 ---');
        items.filter(item => item.page === 0)
            .slice(0, 30)
            .forEach(item => {
                console.log(`X=${item.x.toFixed(1).padStart(5)} Y=${item.y.toFixed(1).padStart(5)} | ${item.text}`);
            });

        // Save to JSON for analysis
        fs.writeFileSync('coordinates.json', JSON.stringify(items, null, 2));
        console.log('\n✓ Full coordinate data saved to coordinates.json');

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
