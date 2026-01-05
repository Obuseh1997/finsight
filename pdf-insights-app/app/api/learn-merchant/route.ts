import { NextRequest, NextResponse } from 'next/server';

/**
 * Learn from user merchant corrections via Railway Python API
 * POST /api/learn-merchant
 *
 * Request body:
 * {
 *   normalized_merchant: string;
 *   canonical_name: string;
 *   category?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { normalized_merchant, canonical_name, category } = body;

    // Validate required fields
    if (!normalized_merchant || !canonical_name) {
      return NextResponse.json(
        { error: 'Missing required fields: normalized_merchant and canonical_name' },
        { status: 400 }
      );
    }

    // Call Railway Python API
    const apiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/learn-merchant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        normalized_merchant,
        canonical_name,
        category: category || 'Uncategorized',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Learn merchant API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
