// API client for calling backend routes

import { StatementData, InsightsData } from './types';

export class PDFInsightsAPI {
  /**
   * Extract transactions from uploaded PDFs
   */
  static async extractPDFs(files: File[]): Promise<{ results: StatementData[] }> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`pdf_${index}`, file);
    });

    const response = await fetch('/api/extract', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Extraction failed');
    }

    return response.json();
  }

  /**
   * Merge multiple statement JSONs
   */
  static async mergeStatements(statements: StatementData[]): Promise<StatementData> {
    const response = await fetch('/api/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ statements }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Merge failed');
    }

    return response.json();
  }

  /**
   * Calculate confidence scores for transactions
   */
  static async calculateConfidence(
    statementData: StatementData,
    threshold: number = 60
  ): Promise<StatementData> {
    const response = await fetch('/api/confidence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statement: statementData,
        threshold
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Confidence calculation failed');
    }

    return response.json();
  }

  /**
   * Generate insights from transactions
   */
  static async generateInsights(statementData: StatementData): Promise<InsightsData> {
    const response = await fetch('/api/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ statement: statementData }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Insights generation failed');
    }

    return response.json();
  }

  /**
   * Full pipeline: extract → merge → score → insights
   */
  static async processFullPipeline(
    files: File[],
    onProgress?: (stage: string, progress: number) => void
  ): Promise<{
    merged: StatementData;
    scored: StatementData;
    insights: InsightsData;
  }> {
    try {
      // Step 1: Extract PDFs
      onProgress?.('Extracting PDFs...', 20);
      const { results } = await this.extractPDFs(files);

      // Step 2: Merge statements
      onProgress?.('Merging statements...', 40);
      const merged = await this.mergeStatements(results);

      // Step 3: Calculate confidence
      onProgress?.('Calculating confidence scores...', 60);
      const scored = await this.calculateConfidence(merged);

      // Step 4: Generate insights
      onProgress?.('Generating insights...', 80);
      const insights = await this.generateInsights(scored);

      onProgress?.('Complete!', 100);

      return { merged, scored, insights };
    } catch (error) {
      throw error;
    }
  }
}
