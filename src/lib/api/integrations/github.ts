import { formatBugReportAsMarkdown } from '@/lib/bug-report-exports';
import type { SavedBugReportDto } from '@/types/api';

export interface GitHubIssueResponse {
  id: number;
  number: number;
  html_url: string;
}

export async function createGitHubIssue({
  repo,
  token,
  title,
  body,
}: {
  repo: string;
  token: string;
  title: string;
  body: string;
}): Promise<GitHubIssueResponse> {
  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'QA-Copilot-App',
    },
    body: JSON.stringify({
      title,
      body,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || `GitHub API returned error code ${response.status}`);
  }

  return {
    id: data.id,
    number: data.number,
    html_url: data.html_url,
  };
}

export async function exportBugReportToGitHub({
  repo,
  token,
  bugReport,
}: {
  repo: string;
  token: string;
  bugReport: SavedBugReportDto;
}): Promise<GitHubIssueResponse> {
  const title = `[BUG] ${bugReport.title}`;
  const markdownBody = [
    `## QA Copilot Defect Report`,
    `> Generated automatically on ${new Date(bugReport.createdAt).toLocaleDateString()}`,
    '',
    formatBugReportAsMarkdown(bugReport),
  ].join('\n');

  return createGitHubIssue({
    repo,
    token,
    title,
    body: markdownBody,
  });
}
