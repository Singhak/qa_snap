import { formatBugReportAsMarkdown } from '@/lib/bug-report-exports';
import type { SavedBugReportDto } from '@/types/api';

export interface JiraIssueResponse {
  id: string;
  key: string;
  self: string;
}

export async function createJiraIssue({
  domain,
  email,
  token,
  projectKey,
  summary,
  description,
}: {
  domain: string;
  email?: string | null;
  token: string;
  projectKey: string;
  summary: string;
  description: string;
}): Promise<JiraIssueResponse> {
  const host = domain.includes('://') ? domain : `https://${domain}`;
  const url = `${host.replace(/\/$/, '')}/rest/api/2/issue`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (email && email.trim() !== '') {
    // Jira Cloud / Managed: Basic auth (email + API token)
    const credentials = btoa(`${email.trim()}:${token.trim()}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else {
    // Jira Server / On-Premise: Bearer auth (Personal Access Token PAT)
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fields: {
        project: {
          key: projectKey.trim().toUpperCase(),
        },
        summary,
        description,
        issuetype: {
          name: 'Bug',
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const jiraErrorMessage =
      data?.errors && Object.keys(data.errors).length > 0
        ? JSON.stringify(data.errors)
        : data?.errorMessages?.join(', ') || `Jira API returned error code ${response.status}`;
    throw new Error(jiraErrorMessage);
  }

  // Construct standard issue view url
  const baseUrl = host.replace(/\/$/, '');
  const htmlUrl = `${baseUrl}/browse/${data.key}`;

  return {
    id: data.id,
    key: data.key,
    self: htmlUrl, // Store browsable url in self property for convenient client navigation
  };
}

export async function exportBugReportToJira({
  domain,
  email,
  token,
  projectKey,
  bugReport,
}: {
  domain: string;
  email?: string | null;
  token: string;
  projectKey: string;
  bugReport: SavedBugReportDto;
}): Promise<JiraIssueResponse> {
  const summary = `[BUG] ${bugReport.title}`;
  const description = [
    `QA Copilot Defect Report`,
    `Generated automatically on ${new Date(bugReport.createdAt).toLocaleDateString()}`,
    `--------------------------------------------------------------------------------`,
    formatBugReportAsMarkdown(bugReport),
  ].join('\n');

  return createJiraIssue({
    domain,
    email,
    token,
    projectKey,
    summary,
    description,
  });
}

export interface FetchJiraIssueResponse {
  key: string;
  summary: string;
  description: string;
}

export async function fetchJiraIssue({
  domain,
  email,
  token,
  issueKey,
}: {
  domain: string;
  email?: string | null;
  token: string;
  issueKey: string;
}): Promise<FetchJiraIssueResponse> {
  const host = domain.includes('://') ? domain : `https://${domain}`;
  const url = `${host.replace(/\/$/, '')}/rest/api/2/issue/${issueKey.trim()}?fields=summary,description`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (email && email.trim() !== '') {
    const credentials = btoa(`${email.trim()}:${token.trim()}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    let data;
    try {
      data = await response.json();
    } catch {
      // not JSON
    }
    const jiraErrorMessage =
      data?.errors && Object.keys(data.errors).length > 0
        ? JSON.stringify(data.errors)
        : data?.errorMessages?.join(', ') || `Jira API returned error code ${response.status}`;
    throw new Error(jiraErrorMessage);
  }

  const data = await response.json();
  let description = '';
  if (data.fields?.description) {
    if (typeof data.fields.description === 'string') {
      description = data.fields.description;
    } else {
      description = JSON.stringify(data.fields.description);
    }
  }

  return {
    key: data.key,
    summary: data.fields?.summary || '',
    description,
  };
}
