import { NextRequest, NextResponse } from 'next/server';

/**
 * Calculate confidence scores for merchant normalization via Railway Python API
 * POST /api/confidence
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { statement, threshold = 60 } = body;

    if (!statement) {
      return NextResponse.json(
        { error: 'No statement data provided' },
        { status: 400 }
      );
    }

    // Call Railway Python API
    const apiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/confidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ statement, threshold }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Confidence API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Confidence calculation failed' },
      { status: 500 }
    );
  }
}
