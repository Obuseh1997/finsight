'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PDFInsightsAPI } from '@/lib/api';
import { SessionStorage } from '@/lib/storage';
import { UploadedFile } from '@/lib/types';

// ── Icons ──────────────────────────────────────────────────────────────────
const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const BoltIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const RepeatIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);
const UploadIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

// ── Nav ────────────────────────────────────────────────────────────────────
function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-[hsl(var(--border))]/20 shadow-ambient">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg btn-primary-gradient flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="font-display font-bold text-[hsl(var(--foreground))] text-lg tracking-tight">FinSight</span>
        </a>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-7">
          {['Features', 'How it Works', 'Privacy'].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/\s/g, '-')}`}
              className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <a
          href="#upload"
          className="inline-flex items-center gap-2 px-4 py-2 btn-primary-gradient text-sm font-semibold rounded-lg shadow-sm hover:opacity-90 transition-opacity"
        >
          Start Analysis
          <ArrowRightIcon />
        </a>
      </div>
    </header>
  );
}

// ── Main page component ────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const MAX_FILES = 6;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type === 'application/pdf');
      addFiles(dropped);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(Array.from(e.target.files));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files]
  );

  const addFiles = (newFiles: File[]) => {
    setError(null);
    if (files.length + newFiles.length > MAX_FILES) { setError(`Maximum ${MAX_FILES} files allowed`); return; }
    const valid: UploadedFile[] = [];
    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) { setError(`${file.name} exceeds the 10 MB limit`); continue; }
      if (file.type !== 'application/pdf') { setError(`${file.name} is not a PDF`); continue; }
      if (files.some((f) => f.name === file.name && f.size === file.size)) { setError(`${file.name} is already added`); continue; }
      valid.push({ file, name: file.name, size: file.size, status: 'pending' });
    }
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (i: number) => { setFiles((prev) => prev.filter((_, idx) => idx !== i)); setError(null); };

  const handleProcess = async () => {
    if (files.length === 0) { setError('Please upload at least one PDF'); return; }
    setIsProcessing(true);
    setError(null);
    try {
      SessionStorage.clearSession();
      SessionStorage.createSession();
      const result = await PDFInsightsAPI.processFullPipeline(
        files.map((f) => f.file),
        (stage, progress) => { setProcessingStage(stage); setProcessingProgress(progress); }
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <MarketingNav />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{
        background: 'linear-gradient(160deg, hsl(243 47% 53% / 0.07) 0%, hsl(var(--background)) 60%)'
      }}>
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 animate-in">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--primary))]/10 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse-dot" />
              <span className="text-xs font-semibold text-[hsl(var(--primary))] uppercase tracking-wider">100% Private · No account required</span>
            </div>

            <h1 className="font-display text-5xl font-bold text-[hsl(var(--foreground))] tracking-tight leading-[1.1] mb-5">
              Your finances,<br />
              <span style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dim)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                finally clear.
              </span>
            </h1>

            <p className="text-xl text-[hsl(var(--muted-foreground))] mb-8 leading-relaxed">
              Upload your PDF bank statements and get instant spending insights — grouped by merchant, categorised automatically, completely private.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#upload"
                className="inline-flex items-center gap-2.5 px-6 py-3 btn-primary-gradient font-semibold rounded-xl shadow-ambient hover:opacity-90 transition-opacity"
              >
                Start Your Analysis
                <ArrowRightIcon />
              </a>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                See how it works ↓
              </a>
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap gap-8 mt-14 pt-8 border-t border-[hsl(var(--border))]/30">
            {[
              { value: 'CIBC · RBC · TD', label: 'Supported banks' },
              { value: '< 60s', label: 'Analysis time' },
              { value: '0 bytes', label: 'Data ever stored' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="font-display font-bold text-2xl text-[hsl(var(--foreground))]">{value}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-[hsl(var(--surface-low))]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--primary))] mb-3">What you get</p>
          <h2 className="font-display text-3xl font-bold text-[hsl(var(--foreground))] mb-12">Built for the privacy-conscious</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <LockIcon />,
                title: '100% Private',
                body: 'All PDF parsing runs locally. Nothing leaves your device — no cloud, no signup, no tracking.',
              },
              {
                icon: <BoltIcon />,
                title: 'Instant Insights',
                body: 'Full spending breakdown in under a minute. Category totals, top merchants, recurring charges.',
              },
              {
                icon: <ChartIcon />,
                title: 'Smart Grouping',
                body: 'Merchants are automatically recognised and normalised. "MCDONALD\'S #1234" becomes "McDonald\'s".',
              },
              {
                icon: <RepeatIcon />,
                title: 'Gets Smarter',
                body: 'Every correction you make is remembered for the session. The more you review, the sharper it gets.',
              },
            ].map(({ icon, title, body }) => (
              <div
                key={title}
                className="bg-[hsl(var(--surface-card))] rounded-2xl p-6 shadow-ambient"
              >
                <div className="w-10 h-10 bg-[hsl(var(--primary))]/10 rounded-xl flex items-center justify-center text-[hsl(var(--primary))] mb-4">
                  {icon}
                </div>
                <h3 className="font-display font-semibold text-[hsl(var(--foreground))] mb-2">{title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-[hsl(var(--background))]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--primary))] mb-3">The process</p>
          <h2 className="font-display text-3xl font-bold text-[hsl(var(--foreground))] mb-12">Three steps, then done</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Upload your PDFs', body: 'Drop up to 6 bank statements directly in your browser. CIBC, RBC, and TD supported.' },
              { step: '02', title: 'Review & confirm', body: 'Quickly confirm any low-confidence merchant matches. Takes 30 seconds for most statements.' },
              { step: '03', title: 'See your insights', body: 'Full breakdown by category and merchant, recurring charge detection, and CSV export.' },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 btn-primary-gradient"
                >
                  {step}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-[hsl(var(--foreground))] mb-1.5">{title}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Instructions accordion */}
          <details className="mt-10 group bg-[hsl(var(--surface-card))] rounded-2xl overflow-hidden shadow-ambient">
            <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-sm font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-low))] transition-colors select-none list-none">
              <span>How to download your bank statement PDF</span>
              <svg className="w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-6 pb-6 pt-1 animate-slide-in">
              <div className="grid sm:grid-cols-2 gap-6 mt-4">
                {[
                  { label: 'Online Banking', steps: ["Log in to your bank's website", 'Go to "Statements" or "Documents"', 'Select month(s)', 'Download as PDF'] },
                  { label: 'Mobile App', steps: ["Open your bank's app", 'Tap "Statements" or "Documents"', 'Choose statement period', 'Share / Download to device'] },
                ].map(({ label, steps }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">{label}</p>
                    <div className="space-y-2">
                      {steps.map((step, i) => (
                        <div key={i} className="flex gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                          <span className="font-bold text-[hsl(var(--primary))] shrink-0">{i + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* ── Upload zone ── */}
      <section id="upload" className="bg-[hsl(var(--surface-low))]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--primary))] mb-3 text-center">Ready?</p>
            <h2 className="font-display text-3xl font-bold text-[hsl(var(--foreground))] mb-2 text-center">Start your analysis</h2>
            <p className="text-[hsl(var(--muted-foreground))] text-center mb-8">Drop your PDFs below. No account, no upload to any server.</p>

            <div className="bg-[hsl(var(--surface-card))] rounded-2xl shadow-ambient overflow-hidden">
              {/* Drop zone */}
              <div
                className={`p-8 transition-colors ${isDragging ? 'bg-[hsl(var(--primary))]/5' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className={`border-2 border-dashed rounded-xl px-6 py-10 text-center transition-colors ${isDragging ? 'border-[hsl(var(--primary))]' : 'border-[hsl(var(--border))]'}`}>
                  <div className="w-12 h-12 bg-[hsl(var(--primary))]/10 rounded-xl flex items-center justify-center text-[hsl(var(--primary))] mx-auto mb-4">
                    <UploadIcon />
                  </div>
                  <p className="font-display font-semibold text-[hsl(var(--foreground))] mb-1">Drop your statements here</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">PDF only · up to {MAX_FILES} files · max 10 MB each</p>

                  <input type="file" multiple accept="application/pdf" onChange={handleFileInput} className="hidden" id="file-input" disabled={isProcessing} />
                  <label htmlFor="file-input" className="inline-flex items-center gap-2 px-5 py-2.5 btn-primary-gradient text-sm font-semibold rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Choose Files
                  </label>
                </div>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="px-6 pt-2 pb-2 bg-[hsl(var(--surface-low))]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Selected</p>
                    <span className="text-xs font-semibold text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-2 py-0.5 rounded-full">{files.length}/{MAX_FILES}</span>
                  </div>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-[hsl(var(--surface-card))] rounded-xl shadow-ambient group">
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
                          <button onClick={() => removeFile(index)} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100" aria-label={`Remove ${file.name}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mx-6 mt-3 p-3 bg-[hsl(var(--destructive))]/10 rounded-xl">
                  <p className="text-sm text-[hsl(var(--destructive))] font-medium">{error}</p>
                </div>
              )}

              {/* Progress */}
              {isProcessing && (
                <div className="mx-6 mt-4 p-4 bg-[hsl(var(--primary))]/5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{processingStage}</p>
                    <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{processingProgress}%</p>
                  </div>
                  <div className="w-full bg-[hsl(var(--border))]/40 rounded-full h-1.5 overflow-hidden">
                    <div className="btn-primary-gradient h-1.5 rounded-full transition-all duration-300" style={{ width: `${processingProgress}%` }} />
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="p-6">
                {files.length > 0 && !isProcessing ? (
                  <button onClick={handleProcess} className="w-full py-3.5 btn-primary-gradient font-bold rounded-xl hover:opacity-90 transition-opacity shadow-ambient flex items-center justify-center gap-2">
                    Analyse My Spending
                    <ArrowRightIcon />
                  </button>
                ) : !isProcessing ? (
                  <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">Add at least one PDF to get started</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust / Privacy ── */}
      <section id="privacy" className="bg-[hsl(var(--background))]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--primary))] mb-3">Privacy</p>
            <h2 className="font-display text-3xl font-bold text-[hsl(var(--foreground))] mb-4">Built for people who don&apos;t want to share their finances</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-8 leading-relaxed">
              Most budgeting tools require connecting your bank or uploading to a cloud. FinSight runs entirely in your browser — your data never leaves your device.
            </p>
            <div className="space-y-3">
              {[
                'PDF parsing runs locally via Python — no cloud upload',
                'PII (account numbers, addresses) scrubbed before any processing',
                'Session storage only — cleared automatically when you close the tab',
                'No account, no email, no tracking',
                'No external AI APIs — all analysis is rule-based and local',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[hsl(var(--success))]/15 flex items-center justify-center text-[hsl(var(--success-bright))] shrink-0 mt-0.5">
                    <CheckIcon />
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[hsl(var(--border))]/30 bg-[hsl(var(--surface-low))]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md btn-primary-gradient flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="font-display font-semibold text-[hsl(var(--foreground))] text-sm">FinSight</span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Made for privacy-conscious Canadians · MIT License</p>
        </div>
      </footer>
    </div>
  );
}
