import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

/**
 * Generate spending insights from transactions
 * POST /api/insights
 */
export async function POST(request: NextRequest) {
  const tempFiles: string[] = [];

  try {
    const body = await request.json();
    const { statement } = body;

    if (!statement) {
      return NextResponse.json(
        { error: 'No statement data provided' },
        { status: 400 }
      );
    }

    // Save statement to temp JSON file
    const tempInputPath = path.join(os.tmpdir(), `statement_${Date.now()}.json`);
    const tempOutputPath = path.join(os.tmpdir(), `insights_${Date.now()}.json`);

    tempFiles.push(tempInputPath, tempOutputPath);

    await writeFile(tempInputPath, JSON.stringify(statement, null, 2));

    // Call Python insights generation script
    const pythonScriptPath = path.join(process.cwd(), '..', 'generate_insights.py');
    const command = `python3 ${pythonScriptPath} "${tempInputPath}" --output "${tempOutputPath}"`;

    console.log(`Executing: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
      });

      if (stderr) {
        console.error('Python stderr:', stderr);
      }

      console.log('Python stdout:', stdout);

      // Read the insights JSON
      const { readFile } = await import('fs/promises');
      const insightsData = await readFile(tempOutputPath, 'utf-8');
      const parsedData = JSON.parse(insightsData);

      // Cleanup temp files
      await Promise.all(
        tempFiles.map(f => unlink(f).catch(err => console.warn(`Failed to delete ${f}:`, err)))
      );

      return NextResponse.json(parsedData);
    } catch (error) {
      console.error('Python execution error:', error);
      throw new Error(`Insights generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    // Cleanup on error
    await Promise.all(
      tempFiles.map(f => unlink(f).catch(() => {}))
    );

    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Insights generation failed' },
      { status: 500 }
    );
  }
}
