import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate spending insights from transactions via Railway Python API
 * POST /api/insights
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { statement } = body;

    if (!statement) {
      return NextResponse.json(
        { error: 'No statement data provided' },
        { status: 400 }
      );
    }

    // Call Railway Python API
    const apiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(statement),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data.insights || data);

  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Insights generation failed' },
      { status: 500 }
    );
  }
}
