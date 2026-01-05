import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Learn from user merchant corrections
 * POST /api/learn-merchant
 *
 * Request body:
 * {
 *   normalized_merchant: string;
 *   canonical_name: string;
 *   category?: string;
 *   transaction?: object;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { normalized_merchant, canonical_name, category, transaction } = body;

    // Validate required fields
    if (!normalized_merchant || !canonical_name) {
      return NextResponse.json(
        { error: 'Missing required fields: normalized_merchant and canonical_name' },
        { status: 400 }
      );
    }

    // Create Python command to learn from user edit
    // We'll create a simple Python script that calls merchant_dictionary.learn_from_user_edit()
    const pythonScript = `
import sys
import os
import json

# Add project root to Python path
project_root = sys.argv[1]
sys.path.insert(0, project_root)
os.chdir(project_root)

from merchant_dictionary import MerchantDictionary

# Load arguments (offset by 1 since argv[1] is now project_root)
normalized_merchant = sys.argv[2]
canonical_name = sys.argv[3]
category = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != 'null' else None
transaction_json = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != 'null' else None

transaction = json.loads(transaction_json) if transaction_json else None

# Load dictionary
dictionary = MerchantDictionary('merchant_dictionary.json')

# Learn from user edit
success, message = dictionary.learn_from_user_edit(
    normalized_merchant=normalized_merchant,
    canonical_name=canonical_name,
    category=category,
    transaction=transaction
)

# Save dictionary if successful
if success:
    dictionary.save()

# Output result
result = {
    'success': success,
    'message': message
}
print(json.dumps(result))
`;

    // Save Python script to temp file
    const { writeFile, unlink } = await import('fs/promises');
    const os = await import('os');
    const tempScriptPath = path.join(os.tmpdir(), `learn_merchant_${Date.now()}.py`);
    await writeFile(tempScriptPath, pythonScript);

    try {
      const projectRoot = path.join(process.cwd(), '..');

      // Build command arguments (now includes projectRoot as first arg)
      const args = [
        `"${projectRoot}"`,
        `"${normalized_merchant}"`,
        `"${canonical_name}"`,
        category ? `"${category}"` : 'null',
        transaction ? `'${JSON.stringify(transaction)}'` : 'null'
      ];

      const command = `python3 "${tempScriptPath}" ${args.join(' ')}`;

      console.log('Executing learn merchant command...');

      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000, // 10 second timeout
      });

      if (stderr) {
        console.error('Python stderr:', stderr);
      }

      console.log('Python stdout:', stdout);

      // Parse Python output
      const lastLine = stdout.trim().split('\n').pop();
      const result = lastLine ? JSON.parse(lastLine) : { success: false, message: 'No output from script' };

      // Cleanup temp script
      await unlink(tempScriptPath).catch(err => console.warn('Failed to delete temp script:', err));

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message
        });
      } else {
        return NextResponse.json({
          success: false,
          message: result.message
        }, { status: 400 });
      }
    } catch (error) {
      // Cleanup on error
      await unlink(tempScriptPath).catch(() => {});

      console.error('Python execution error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to learn merchant' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Learn merchant API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
