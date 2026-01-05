// Netlify Function to handle PDF extraction with Python
// This runs as a Netlify Function (not Next.js API route) to support Python runtime

import { spawn } from 'child_process';
import { writeFile, unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export const handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const tempFiles = [];

  try {
    // Parse multipart form data (simplified - Netlify provides body)
    const body = JSON.parse(event.body);
    const { pdfData, filename } = body;

    if (!pdfData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No PDF data provided' }),
      };
    }

    // Decode base64 PDF data
    const buffer = Buffer.from(pdfData, 'base64');

    // Save to temp file
    const tempPdfPath = join(tmpdir(), `upload_${Date.now()}_${filename || 'statement.pdf'}`);
    const tempJsonPath = join(tmpdir(), `extract_${Date.now()}.json`);

    tempFiles.push(tempPdfPath, tempJsonPath);

    await writeFile(tempPdfPath, buffer);

    // Call Python extraction script
    const pythonScriptPath = join(process.cwd(), '..', 'extract-pdfplumber.py');

    // Execute Python script
    const pythonProcess = spawn('python3', [
      pythonScriptPath,
      tempPdfPath,
      tempJsonPath,
      '--scrub',
    ]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Wait for Python process to complete
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        } else {
          resolve();
        }
      });
    });

    console.log('Python stdout:', stdout);
    if (stderr) {
      console.error('Python stderr:', stderr);
    }

    // Read the extracted JSON
    const extractedData = await readFile(tempJsonPath, 'utf-8');
    const parsedData = JSON.parse(extractedData);

    // Build merchant dictionary
    const buildDictScriptPath = join(process.cwd(), '..', 'build_dictionary.py');
    const dictPath = join(process.cwd(), '..', 'merchant_dictionary.json');

    const dictProcess = spawn('python3', [
      buildDictScriptPath,
      tempJsonPath,
      dictPath,
    ]);

    await new Promise((resolve) => {
      dictProcess.on('close', () => resolve());
    });

    // Match merchants
    const matchScriptPath = join(process.cwd(), '..', 'match_merchants.py');

    const matchProcess = spawn('python3', [
      matchScriptPath,
      tempJsonPath,
      tempJsonPath,
      dictPath,
    ]);

    await new Promise((resolve) => {
      matchProcess.on('close', () => resolve());
    });

    // Re-read the matched transactions
    const matchedData = await readFile(tempJsonPath, 'utf-8');
    const matchedParsed = JSON.parse(matchedData);

    // Cleanup temp files
    await Promise.all(
      tempFiles.map((f) => unlink(f).catch((err) => console.warn(`Failed to delete ${f}:`, err)))
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ results: [matchedParsed] }),
    };
  } catch (error) {
    // Cleanup on error
    await Promise.all(tempFiles.map((f) => unlink(f).catch(() => {})));

    console.error('Extract function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Extraction failed',
      }),
    };
  }
};
