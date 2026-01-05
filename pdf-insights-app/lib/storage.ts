// LocalStorage utilities for session data

import { StatementData, InsightsData } from './types';

const STORAGE_KEYS = {
  STATEMENTS: 'pdf_insights_statements',
  SCORED_DATA: 'pdf_insights_scored',
  INSIGHTS: 'pdf_insights_insights',
  SESSION_ID: 'pdf_insights_session',
} as const;

export class SessionStorage {
  /**
   * Generate a new session ID
   */
  static createSession(): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
    return sessionId;
  }

  /**
   * Get current session ID
   */
  static getSessionId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.SESSION_ID);
  }

  /**
   * Save merged statement data
   */
  static saveStatements(data: StatementData): void {
    localStorage.setItem(STORAGE_KEYS.STATEMENTS, JSON.stringify(data));
  }

  /**
   * Get merged statement data
   */
  static getStatements(): StatementData | null {
    const data = localStorage.getItem(STORAGE_KEYS.STATEMENTS);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Save scored transaction data
   */
  static saveScoredData(data: StatementData): void {
    localStorage.setItem(STORAGE_KEYS.SCORED_DATA, JSON.stringify(data));
  }

  /**
   * Get scored transaction data
   */
  static getScoredData(): StatementData | null {
    const data = localStorage.getItem(STORAGE_KEYS.SCORED_DATA);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Save insights data
   */
  static saveInsights(data: InsightsData): void {
    localStorage.setItem(STORAGE_KEYS.INSIGHTS, JSON.stringify(data));
  }

  /**
   * Get insights data
   */
  static getInsights(): InsightsData | null {
    const data = localStorage.getItem(STORAGE_KEYS.INSIGHTS);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Clear all session data (start fresh)
   */
  static clearSession(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Check if session has data
   */
  static hasSession(): boolean {
    return !!this.getSessionId() && !!this.getStatements();
  }

  /**
   * Get session age in minutes
   */
  static getSessionAge(): number | null {
    const sessionId = this.getSessionId();
    if (!sessionId) return null;

    const timestamp = parseInt(sessionId.split('_')[1]);
    return (Date.now() - timestamp) / 1000 / 60; // minutes
  }
}
