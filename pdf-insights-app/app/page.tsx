'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PDFInsightsAPI } from '@/lib/api';
import { SessionStorage } from '@/lib/storage';
import { UploadedFile } from '@/lib/types';
import { AppHeader } from '@/components/AppHeader';

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf'
      );
      addFiles(droppedFiles);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files]
  );

  const addFiles = (newFiles: File[]) => {
    setError(null);
    if (files.length + newFiles.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`);
      return;
    }
    const validFiles: UploadedFile[] = [];
    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} exceeds the 10 MB limit`);
        continue;
      }
      if (file.type !== 'application/pdf') {
        setError(`${file.name} is not a PDF`);
        continue;
      }
      if (files.some((f) => f.name === file.name && f.size === file.size)) {
        setError(`${file.name} is already added`);
        continue;
      }
      validFiles.push({ file, name: file.name, size: file.size, status: 'pending' });
    }
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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
      SessionStorage.clearSession();
      SessionStorage.createSession();
      const result = await PDFInsightsAPI.processFullPipeline(
        files.map((f) => f.file),
        (stage, progress) => {
          setProcessingStage(stage);
          setProcessingProgress(progress);
        }
      );
      SessionStorage.saveStatements(result.merged);
      SessionStorage.saveScoredData(result.scored);
      SessionStorage.saveInsights(result.insights);
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
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <AppHeader currentStep={1} />

      <main className="max-w-6xl mx-auto px-6 py-10 animate-in">
        <div className="grid lg:grid-cols-[1fr_420px] gap-10 items-start">

          {/* ── Left: hero + value props + instructions ── */}
          <div>
            <h1 className="font-display text-4xl font-bold text-[hsl(var(--foreground))] tracking-tight leading-tight mb-3">
              Understand where<br />your money goes
            </h1>
            <p className="text-lg text-[hsl(var(--muted-foreground))] mb-8 leading-relaxed">
              Upload your PDF bank statements and get instant, private spending insights — no account required.
            </p>

            {/* Value props */}
            <div className="space-y-4 mb-8">
              {[
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ),
                  title: '100% Private',
                  body: 'All processing happens locally in your browser. Nothing is uploaded to any server.',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                  title: 'Instant Analysis',
                  body: 'Spending insights in seconds — no complex setup, no configuration.',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                  title: 'Smart Grouping',
                  body: 'Transactions are automatically recognised and grouped by merchant for clear insights.',
                },
              ].map(({ icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <div className="w-9 h-9 bg-[hsl(var(--primary))]/10 rounded-lg flex items-center justify-center text-[hsl(var(--primary))] shrink-0 mt-0.5">
                    {icon}
                  </div>
                  <div>
                    <p className="font-semibold text-[hsl(var(--foreground))] text-sm">{title}</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Collapsible instructions */}
            <details className="group bg-[hsl(var(--card))] border border-[hsl(var(--border))]/60 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/30 transition-colors select-none list-none">
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How to download your bank statement
                </div>
                <svg className="w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>

              <div className="px-5 pb-5 pt-1 animate-slide-in">
                <div className="grid sm:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Online Banking</p>
                    </div>
                    {["Log in to your bank's website", 'Go to "Statements" or "Documents"', 'Select the month(s) you want', 'Download as PDF'].map((step, i) => (
                      <div key={i} className="flex gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="font-bold text-[hsl(var(--primary))] shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Mobile App</p>
                    </div>
                    {["Open your bank's app", 'Tap "Statements" or "Documents"', 'Choose your statement period', 'Share / Download to your device'].map((step, i) => (
                      <div key={i} className="flex gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="font-bold text-[hsl(var(--primary))] shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4 pt-4 border-t border-[hsl(var(--border))]/60">
                  <span className="font-semibold text-[hsl(var(--primary))]">Tip:</span> Upload multiple months for deeper trends (up to {MAX_FILES} statements).
                </p>
              </div>
            </details>
          </div>

          {/* ── Right: upload zone ── */}
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]/60 shadow-sm overflow-hidden">

            {/* Drop zone */}
            <div
              className={`relative p-8 border-b border-[hsl(var(--border))]/60 transition-all ${
                isDragging
                  ? 'bg-[hsl(var(--primary))]/5'
                  : 'bg-transparent'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div
                className={`border-2 border-dashed rounded-xl px-6 py-10 text-center transition-colors ${
                  isDragging
                    ? 'border-[hsl(var(--primary))]'
                    : 'border-[hsl(var(--border))]'
                }`}
              >
                <div className="w-12 h-12 bg-[hsl(var(--primary))]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-[hsl(var(--primary))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="font-display font-semibold text-[hsl(var(--foreground))] mb-1">
                  Drop your statements here
                </p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">
                  PDF only · up to {MAX_FILES} files · max 10 MB each
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--primary))] text-white text-sm font-semibold rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Choose Files
                </label>
              </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Selected Files
                  </p>
                  <span className="text-xs font-semibold text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-2 py-0.5 rounded-full">
                    {files.length}/{MAX_FILES}
                  </span>
                </div>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-[hsl(var(--muted))]/30 rounded-lg border border-[hsl(var(--border))]/40 group"
                    >
                      <div className="p-1.5 bg-[hsl(var(--destructive))]/10 rounded-md shrink-0">
                        <svg className="w-4 h-4 text-[hsl(var(--destructive))]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{file.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{formatFileSize(file.size)}</p>
                      </div>
                      {!isProcessing && (
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          aria-label={`Remove ${file.name}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mx-5 mt-3 p-3 bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 rounded-lg">
                <p className="text-sm text-[hsl(var(--destructive))] font-medium">{error}</p>
              </div>
            )}

            {/* Processing bar */}
            {isProcessing && (
              <div className="mx-5 mt-4 p-4 bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{processingStage}</p>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{processingProgress}%</p>
                </div>
                <div className="w-full bg-[hsl(var(--border))] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[hsl(var(--primary))] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="p-5">
              {files.length > 0 && !isProcessing ? (
                <button
                  onClick={handleProcess}
                  className="w-full py-3 bg-[hsl(var(--success))] text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2"
                >
                  Analyse My Spending
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                !isProcessing && (
                  <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                    Add at least one PDF to get started
                  </p>
                )
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
