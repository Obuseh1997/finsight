// Type definitions for PDF Insights App

export interface Transaction {
  date: string;
  description: string;
  merchant?: string;
  merchant_display?: string;
  normalized_merchant?: string;
  amount: number;
  type: 'debit' | 'credit';
  withdrawal?: number | null;
  deposit?: number | null;
  balance?: number | null;
  merchant_id?: string;
  canonical_name?: string;
  category?: string;
  matched?: boolean;
  confidence?: ConfidenceData;
}

export interface ConfidenceData {
  confidence_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  in_dictionary: boolean;
  dictionary_score: number;
  pattern_score: number;
  merchant_data?: MerchantData | null;
}

export interface MerchantData {
  merchant_id: string;
  canonical_name: string;
  category: string;
  aliases: string[];
  created_at: string;
  transaction_count: number;
  total_spend: number;
}

export interface StatementData {
  extracted_at?: string;
  merged_at?: string;
  source_file?: string;
  extraction_method?: string;
  statements_processed?: StatementMetadata[];
  period?: {
    start: string;
    end: string;
    days?: number;
    months?: number;
  };
  deduplication_stats?: DeduplicationStats;
  confidence_stats?: ConfidenceStats;
  transactions: Transaction[];
  fuzzy_matches?: FuzzyMatch[];
  low_confidence_transactions?: Transaction[];
}

export interface StatementMetadata {
  source_file: string;
  extracted_at: string;
  transaction_count: number;
  duplicates_removed?: number;
}

export interface DeduplicationStats {
  total_input_transactions: number;
  exact_duplicates_removed: number;
  fuzzy_matches_flagged: number;
  unique_transactions: number;
}

export interface FuzzyMatch {
  date: string;
  merchant: string;
  transactions: Transaction[];
  amount_variance: number;
}

export interface ConfidenceStats {
  threshold: number;
  high_confidence_count: number;
  low_confidence_count: number;
  confidence_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  needs_review: number;
}

export interface InsightsData {
  generated_at: string;
  summary: SpendingSummary;
  top_merchants: MerchantInsight[];
  recurring_charges: RecurringCharge[];
  recurring_summary: {
    count: number;
    total_annual_cost: number;
    total_monthly_cost: number;
  };
  spending_by_category?: CategorySpending[];
}

export interface CategorySpending {
  category: string;
  total_spend: number;
  transaction_count: number;
  average_transaction: number;
  transactions: {
    date: string;
    amount: number;
    merchant: string;
  }[];
}

export interface SpendingSummary {
  total_spent: number;
  total_received: number;
  net_change: number;
  debit_count: number;
  credit_count: number;
  total_transactions: number;
  period: {
    start: string;
    end: string;
    days: number;
    months: number;
  };
  average_per_month: number;
}

export interface MerchantInsight {
  merchant: string;
  merchant_display: string;
  total_spend: number;
  transaction_count: number;
  average_transaction: number;
  transactions: {
    date: string;
    amount: number;
    description: string;
  }[];
}

export interface RecurringCharge {
  merchant: string;
  merchant_display: string;
  amount: number;
  frequency: 'monthly' | 'bi-weekly';
  occurrences: number;
  dates: string[];
  estimated_annual_cost: number;
}

export interface ProcessingStatus {
  stage: 'uploading' | 'extracting' | 'merging' | 'scoring' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
  error?: string;
}

export interface UploadedFile {
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  extractedData?: StatementData;
  error?: string;
}
