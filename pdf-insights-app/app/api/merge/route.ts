import { NextRequest, NextResponse } from 'next/server';

/**
 * Merge multiple statement JSONs with deduplication via Railway Python API
 * POST /api/merge
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { statements } = body;

    if (!statements || !Array.isArray(statements) || statements.length === 0) {
      return NextResponse.json(
        { error: 'No statements provided' },
        { status: 400 }
      );
    }

    // Call Railway Python API
    const apiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ statements }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data.merged || data);

  } catch (error) {
    console.error('Merge API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Merge failed' },
      { status: 500 }
    );
  }
}
