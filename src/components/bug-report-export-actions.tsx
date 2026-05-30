'use client';

import { useState, useTransition } from 'react';

import {
  formatBugReportAsCsv,
  formatBugReportAsJson,
  formatBugReportAsMarkdown,
} from '@/lib/bug-report-exports';
import type { SavedBugReportDto } from '@/types/api';

type BugReportLike = Pick<
  SavedBugReportDto,
  | 'title'
  | 'summary'
  | 'severity'
  | 'priority'
  | 'rawInput'
  | 'expectedResult'
  | 'actualResult'
  | 'environmentSummary'
  | 'stepsToReproduce'
  | 'assumptions'
> & { id?: string };

export function BugReportExportActions({
  report,
  fileStem,
  reportId: propReportId,
}: {
  report: BugReportLike;
  fileStem?: string;
  reportId?: string;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExportingGitHub, setIsExportingGitHub] = useState(false);
  const [isExportingJira, setIsExportingJira] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const reportId = report.id || propReportId;
  const normalizedStem = sanitizeFileStem(fileStem ?? report.title ?? 'bug-report');

  async function copyMarkdown() {
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(formatBugReportAsMarkdown(report));
        setFeedback('Markdown copied to clipboard.');
      } catch {
        setFeedback('Clipboard copy failed in this browser.');
      }
    });
  }

  function downloadFile(kind: 'csv' | 'json' | 'md') {
    const content =
      kind === 'csv'
        ? formatBugReportAsCsv(report)
        : kind === 'json'
          ? formatBugReportAsJson(report)
          : formatBugReportAsMarkdown(report);
    const mimeType =
      kind === 'csv'
        ? 'text/csv;charset=utf-8'
        : kind === 'json'
          ? 'application/json;charset=utf-8'
          : 'text/markdown;charset=utf-8';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${normalizedStem}.${kind}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setFeedback(`Downloaded ${kind.toUpperCase()} export.`);
  }

  async function handleGitHubExport() {
    if (!reportId) return;
    setIsExportingGitHub(true);
    setExportStatus(null);
    setExportUrl(null);
    setExportError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/bug-reports/${reportId}/export/github`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to export to GitHub.');
      }
      setExportUrl(data.url);
      setExportStatus('Successfully pushed to GitHub!');
    } catch (err: any) {
      setExportError(err.message || 'Failed to export to GitHub.');
    } finally {
      setIsExportingGitHub(false);
    }
  }

  async function handleJiraExport() {
    if (!reportId) return;
    setIsExportingJira(true);
    setExportStatus(null);
    setExportUrl(null);
    setExportError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/bug-reports/${reportId}/export/jira`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to export to Jira.');
      }
      setExportUrl(data.url);
      setExportStatus('Successfully pushed to Jira!');
    } catch (err: any) {
      setExportError(err.message || 'Failed to export to Jira.');
    } finally {
      setIsExportingJira(false);
    }
  }

  const isBusy = isPending || isExportingGitHub || isExportingJira;

  return (
    <div className="export-actions stack" style={{ gap: '0.75rem' }}>
      <div className="button-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          className="button secondary"
          type="button"
          onClick={() => downloadFile('csv')}
          disabled={isBusy}
        >
          Download CSV
        </button>
        <button
          className="button ghost"
          type="button"
          onClick={() => downloadFile('json')}
          disabled={isBusy}
        >
          Download JSON
        </button>
        <button
          className="button ghost"
          type="button"
          onClick={() => downloadFile('md')}
          disabled={isBusy}
        >
          Download Markdown
        </button>
        <button className="button ghost" type="button" onClick={copyMarkdown} disabled={isBusy}>
          {isPending ? 'Copying...' : 'Copy Markdown'}
        </button>

        {reportId ? (
          <>
            <button
              className="button secondary"
              type="button"
              onClick={handleGitHubExport}
              disabled={isBusy}
            >
              {isExportingGitHub ? 'Pushing to GitHub...' : 'Push to GitHub'}
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={handleJiraExport}
              disabled={isBusy}
            >
              {isExportingJira ? 'Pushing to Jira...' : 'Push to Jira'}
            </button>
          </>
        ) : null}
      </div>

      {feedback ? <p className="meta success-text">{feedback}</p> : null}
      {exportStatus ? (
        <p className="meta success-text">
          {exportStatus}{' '}
          {exportUrl ? (
            <a
              href={exportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link"
              style={{
                textDecoration: 'underline',
                color: 'var(--color-primary, inherit)',
                fontWeight: '600',
              }}
            >
              View Ticket/Issue
            </a>
          ) : null}
        </p>
      ) : null}
      {exportError ? <p className="meta error-text">{exportError}</p> : null}
    </div>
  );
}

function sanitizeFileStem(value: string) {
  const stem = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return stem || 'bug-report';
}
