const fs = require('fs');
const pdf = require('pdf-parse');

async function extractPDF(filePath) {
    try {
        // Read the PDF file
        let dataBuffer = fs.readFileSync(filePath);
        
        // Parse it
        const data = await pdf(dataBuffer);
        
        // Output results
        console.log('=== PDF METADATA ===');
        console.log('Pages:', data.numpages);
        console.log('Text length:', data.text.length);
        console.log('\n=== RAW TEXT ===');
        console.log(data.text);
        
        // Save to file for easier review
        fs.writeFileSync('output.txt', data.text);
        console.log('\nText saved to output.txt');
        
    } catch (error) {
        console.error('Error parsing PDF:', error);
    }
}

// Run it - replace with your PDF path
extractPDF('/Users/emekeobuseh/Downloads/CIBC Statement - Nov 25.pdf');