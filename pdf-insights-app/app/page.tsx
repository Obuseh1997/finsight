'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PDFInsightsAPI } from '@/lib/api';
import { SessionStorage } from '@/lib/storage';
import { UploadedFile } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const MAX_FILES = 6;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );

    addFiles(droppedFiles);
  }, [files]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  }, [files]);

  const addFiles = (newFiles: File[]) => {
    setError(null);

    // Check total file count
    if (files.length + newFiles.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    // Check file sizes and types
    const validFiles: UploadedFile[] = [];
    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File ${file.name} exceeds 10MB limit`);
        continue;
      }

      if (file.type !== 'application/pdf') {
        setError(`File ${file.name} is not a PDF`);
        continue;
      }

      // Check for duplicates
      if (files.some(f => f.name === file.name && f.size === file.size)) {
        setError(`File ${file.name} already added`);
        continue;
      }

      validFiles.push({
        file,
        name: file.name,
        size: file.size,
        status: 'pending',
      });
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      setError('Please upload at least one PDF');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create new session
      SessionStorage.clearSession();
      SessionStorage.createSession();

      // Process files through pipeline
      const fileObjects = files.map(f => f.file);
      const result = await PDFInsightsAPI.processFullPipeline(
        fileObjects,
        (stage, progress) => {
          setProcessingStage(stage);
          setProcessingProgress(progress);
        }
      );

      // Save to localStorage
      SessionStorage.saveStatements(result.merged);
      SessionStorage.saveScoredData(result.scored);
      SessionStorage.saveInsights(result.insights);

      // Navigate to review page
      router.push('/review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-8 animate-in">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-12 w-12 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <h1 className="font-display text-5xl font-bold text-[hsl(var(--foreground))] tracking-tight">
              FinSight
            </h1>
          </div>
          <p className="text-xl font-medium text-[hsl(var(--foreground))] mb-2">
            Understand Your Spending
          </p>
          <p className="text-base text-[hsl(var(--muted-foreground))]">
            Upload your bank statements and get instant insights
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-[hsl(var(--muted-foreground))]">
            <span>✓ 100% private</span>
            <span>✓ Processed locally</span>
            <span>✓ No signup required</span>
          </div>
        </div>

        {/* How to Get Your Bank Statement */}
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-[hsl(var(--primary))]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-xl">📄</span>
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold text-[hsl(var(--foreground))] mb-2">
                How to Download Your Bank Statement
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                Get your PDF bank statements from your bank's website or mobile app:
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Online Banking */}
            <div className="border border-[hsl(var(--border))] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💻</span>
                <h3 className="font-display font-semibold text-[hsl(var(--foreground))]">Online Banking</h3>
              </div>
              <ol className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                <li className="flex gap-2">
                  <span className="font-semibold text-[hsl(var(--primary))]">1.</span>
                  <span>Log in to your bank's website</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-[hsl(var(--primary))]">2.</span>
                  <span>Go to "Statements" or "Documents"</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-[hsl(var(--primary))]">3.</span>
                  <span>Select the month(s) you want</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-[hsl(var(--primary))]">4.</span>
                  <span>Download as PDF</span>
                </li>
              </ol>
            </div>

            {/* Mobile App */}
            <div className="border border-[hsl(var(--border))] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📱</span>
                <h3 className="font-display font-semibold text-[hsl(var(--foreground))]">Mobile App</h3>
              </div>
              <ol className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                <li className="flex gap-2">
                  <span className="font-semibold text-[hsl(var(--primary))]">1.</span>
                  <span>Open your bank's app</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-[hsl(var(--primary))]">2.</span>
                  <span>Tap "Statements" or "Documents"</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-[hsl(var(--primary))]">3.</span>
                  <span>Choose your statement period</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-[hsl(var(--primary))]">4.</span>
                  <span>Share/Download to your device</span>
                </li>
              </ol>
            </div>
          </div>

          <div className="mt-4 p-3 bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/20 rounded-lg">
            <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
              <span className="font-semibold text-[hsl(var(--primary))]">Tip:</span> Upload multiple months for better insights (up to 6 statements)
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm p-8 mb-6">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              isDragging
                ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5'
                : 'border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-6">
              <div className="relative z-10 bg-[hsl(var(--background))]/50 backdrop-blur-sm p-6 rounded-full inline-block mb-4">
                <svg
                  className="w-12 h-12 text-[hsl(var(--primary))]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="font-display text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
                Drop your bank statements here
              </p>
              <p className="text-[hsl(var(--muted-foreground))] mb-6">
                or click to browse (up to {MAX_FILES} PDFs, max 10MB each)
              </p>
              <input
                type="file"
                multiple
                accept="application/pdf"
                onChange={handleFileInput}
                className="hidden"
                id="file-input"
                disabled={isProcessing}
              />
              <label
                htmlFor="file-input"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium rounded-lg cursor-pointer hover:opacity-90 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Choose Files
              </label>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-[hsl(var(--foreground))] mb-3 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Selected Files
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                  {files.length}/{MAX_FILES}
                </span>
              </h3>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-[hsl(var(--muted))]/30 p-4 rounded-lg border border-[hsl(var(--border))]/40 hover:border-[hsl(var(--border))] transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="p-2 bg-[hsl(var(--destructive))]/10 rounded-lg">
                        <svg
                          className="w-6 h-6 text-[hsl(var(--destructive))]"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[hsl(var(--foreground))] truncate">
                          {file.name}
                        </p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    {!isProcessing && (
                      <button
                        onClick={() => removeFile(index)}
                        className="ml-4 p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 rounded-lg transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 rounded-lg">
              <p className="text-[hsl(var(--destructive))] font-medium">{error}</p>
            </div>
          )}

          {/* Process Button */}
          {files.length > 0 && !isProcessing && (
            <div className="mt-6">
              <button
                onClick={handleProcess}
                className="w-full px-6 py-4 bg-[hsl(var(--success))] text-white font-bold text-lg rounded-lg hover:opacity-90 transition-all shadow-sm"
              >
                Analyze My Spending →
              </button>
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div className="mt-6 p-6 bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <p className="font-display font-semibold text-[hsl(var(--foreground))]">{processingStage}</p>
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{processingProgress}%</p>
              </div>
              <div className="w-full bg-[hsl(var(--border))] rounded-full h-2">
                <div
                  className="bg-[hsl(var(--primary))] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]/60 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-[hsl(var(--primary))]/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="font-display font-semibold text-[hsl(var(--foreground))] mb-2">100% Private</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              All processing happens locally. No data leaves your device.
            </p>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]/60 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-[hsl(var(--primary))]/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="font-display font-semibold text-[hsl(var(--foreground))] mb-2">Instant Analysis</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Get insights in seconds without complex setup or configuration.
            </p>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]/60 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-[hsl(var(--primary))]/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-display font-semibold text-[hsl(var(--foreground))] mb-2">Smart Grouping</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Automatically groups transactions by merchant for clear insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
