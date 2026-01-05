import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract transactions from uploaded PDFs via Railway Python API
 * POST /api/extract
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

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

    // Convert files to base64 for API transmission
    const filesData = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');

        return {
          name: file.name,
          data: base64,
        };
      })
    );

    // Call Railway Python API
    const apiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: filesData }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Extract API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Extraction failed' },
      { status: 500 }
    );
  }
}
