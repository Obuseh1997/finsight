import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

/**
 * Merge multiple statement JSONs with deduplication
 * POST /api/merge
 */
export async function POST(request: NextRequest) {
  const tempFiles: string[] = [];

  try {
    const body = await request.json();
    const { statements } = body;

    if (!statements || !Array.isArray(statements) || statements.length === 0) {
      return NextResponse.json(
        { error: 'No statements provided' },
        { status: 400 }
      );
    }

    // Save each statement to temp JSON file
    const tempInputPaths: string[] = [];
    for (let i = 0; i < statements.length; i++) {
      const tempPath = path.join(os.tmpdir(), `statement_${Date.now()}_${i}.json`);
      await writeFile(tempPath, JSON.stringify(statements[i], null, 2));
      tempInputPaths.push(tempPath);
      tempFiles.push(tempPath);
    }

    // Output path for merged result
    const tempOutputPath = path.join(os.tmpdir(), `merged_${Date.now()}.json`);
    tempFiles.push(tempOutputPath);

    // Call Python merge script
    const pythonScriptPath = path.join(process.cwd(), '..', 'merge_statements.py');
    const inputArgs = tempInputPaths.map(p => `"${p}"`).join(' ');
    const command = `python3 ${pythonScriptPath} ${inputArgs} --output "${tempOutputPath}"`;

    console.log(`Executing: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
      });

      if (stderr) {
        console.error('Python stderr:', stderr);
      }

      console.log('Python stdout:', stdout);

      // Read the merged JSON
      const { readFile } = await import('fs/promises');
      const mergedData = await readFile(tempOutputPath, 'utf-8');
      const parsedData = JSON.parse(mergedData);

      // Cleanup temp files
      await Promise.all(
        tempFiles.map(f => unlink(f).catch(err => console.warn(`Failed to delete ${f}:`, err)))
      );

      return NextResponse.json(parsedData);
    } catch (error) {
      console.error('Python execution error:', error);
      throw new Error(`Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    // Cleanup on error
    await Promise.all(
      tempFiles.map(f => unlink(f).catch(() => {}))
    );

    console.error('Merge API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Merge failed' },
      { status: 500 }
    );
  }
}
