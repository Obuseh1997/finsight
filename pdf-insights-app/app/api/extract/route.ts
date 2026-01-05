import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

/**
 * Extract transactions from uploaded PDFs using Python script
 * POST /api/extract
 */
export async function POST(request: NextRequest) {
  const tempFiles: string[] = [];

  try {
    const formData = await request.formData();
    const results = [];

    // Get all PDF files from form data
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('pdf_') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No PDF files provided' },
        { status: 400 }
      );
    }

    // Process each PDF
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Save to temp file
      const tempPdfPath = path.join(os.tmpdir(), `upload_${Date.now()}_${file.name}`);
      const tempJsonPath = path.join(os.tmpdir(), `extract_${Date.now()}.json`);

      tempFiles.push(tempPdfPath, tempJsonPath);

      await writeFile(tempPdfPath, buffer);

      // Call Python extraction script
      const pythonScriptPath = path.join(process.cwd(), '..', 'extract-pdfplumber.py');
      const command = `python3 ${pythonScriptPath} "${tempPdfPath}" "${tempJsonPath}" --scrub`;

      console.log(`Executing: ${command}`);

      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 60000, // 60 second timeout
        });

        if (stderr) {
          console.error('Python stderr:', stderr);
        }

        console.log('Python stdout:', stdout);

        // Read the extracted JSON
        const { readFile } = await import('fs/promises');
        const extractedData = await readFile(tempJsonPath, 'utf-8');
        const parsedData = JSON.parse(extractedData);

        // NEW: Build merchant dictionary from extracted transactions
        const buildDictScriptPath = path.join(process.cwd(), '..', 'build_dictionary.py');
        const dictPath = path.join(process.cwd(), '..', 'merchant_dictionary.json');
        const buildDictCommand = `python3 ${buildDictScriptPath} "${tempJsonPath}" "${dictPath}"`;

        console.log(`Building dictionary: ${buildDictCommand}`);

        try {
          const { stdout: dictStdout, stderr: dictStderr } = await execAsync(buildDictCommand, {
            timeout: 30000, // 30 second timeout
          });

          if (dictStdout) {
            console.log('Dictionary build stdout:', dictStdout);
          }
          if (dictStderr) {
            console.error('Dictionary build stderr:', dictStderr);
          }

          // NEW: Match merchants to assign categories
          const matchScriptPath = path.join(process.cwd(), '..', 'match_merchants.py');
          const matchCommand = `python3 ${matchScriptPath} "${tempJsonPath}" "${tempJsonPath}" "${dictPath}"`;

          console.log(`Matching merchants: ${matchCommand}`);

          const { stdout: matchStdout, stderr: matchStderr } = await execAsync(matchCommand, {
            timeout: 30000,
          });

          if (matchStdout) {
            console.log('Merchant matching stdout:', matchStdout);
          }
          if (matchStderr) {
            console.error('Merchant matching stderr:', matchStderr);
          }

          // Re-read the matched transactions with categories
          const matchedData = await readFile(tempJsonPath, 'utf-8');
          const matchedParsed = JSON.parse(matchedData);
          results.push(matchedParsed); // Use matched version with categories

        } catch (dictError) {
          // Don't fail extraction if dictionary building/matching fails - use original
          console.warn('Dictionary/matching failed (non-fatal):', dictError);
          results.push(parsedData); // Fallback to original data
        }
      } catch (error) {
        console.error('Python execution error:', error);
        throw new Error(`Failed to extract ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Cleanup temp files
    await Promise.all(
      tempFiles.map(f => unlink(f).catch(err => console.warn(`Failed to delete ${f}:`, err)))
    );

    return NextResponse.json({ results });
  } catch (error) {
    // Cleanup on error
    await Promise.all(
      tempFiles.map(f => unlink(f).catch(() => {}))
    );

    console.error('Extract API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Extraction failed' },
      { status: 500 }
    );
  }
}
