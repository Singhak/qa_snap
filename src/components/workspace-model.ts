import type {
  CreateProjectRequest,
  GenerateBugReportResponse,
  GenerateTestCasesResponse,
  TestCaseSourceAttachment,
} from '@/types/api';

export type BugDraft = {
  rawInput: string;
  expectedInput: string;
  actualInput: string;
  environmentInput: string;
  logsInput: string;
};

export type TestCaseDraft = {
  featureTitle: string;
  sourceRequirement: string;
  acceptanceCriteria: string;
  contextNotes: string;
  generationMode: 'REGRESSION' | 'SMOKE' | 'EDGE_HEAVY';
  attachments: TestCaseSourceAttachment[];
};

export type SettingsDraft = {
  name: string;
  preferredProvider: '' | 'OPENAI' | 'OPENROUTER' | 'GEMINI' | 'ANTHROPIC';
};

export const defaultBugDraft: BugDraft = {
  rawInput:
    'After resetting password, the login spinner keeps running in Chrome and the user never reaches the dashboard.',
  expectedInput: 'User should log in successfully after password reset.',
  actualInput: 'The login button shows a spinner forever and no redirect happens.',
  environmentInput: 'Chrome 124 on Windows 11, staging environment',
  logsInput: 'Console shows a 401 response from /api/session/refresh',
};

export const defaultTestCaseDraft: TestCaseDraft = {
  featureTitle: 'Password Reset with OTP',
  sourceRequirement:
    'As a user, I want to reset my password using an OTP sent to my email so I can regain account access securely.',
  acceptanceCriteria:
    'OTP expires in 5 minutes, users can resend OTP after 30 seconds, and password must meet complexity rules.',
  contextNotes:
    'Cover desktop and mobile flows, validation states, and user feedback after invalid OTP attempts.',
  generationMode: 'REGRESSION',
  attachments: [] as TestCaseSourceAttachment[],
};

export const defaultProjectDraft: CreateProjectRequest = {
  name: 'Checkout Revamp',
  description: 'QA workspace for exploratory bugs and regression coverage.',
};

export const defaultSettingsDraft: SettingsDraft = {
  name: '',
  preferredProvider: '',
};

export type BugOutput = GenerateBugReportResponse | null;
export type TestOutput = GenerateTestCasesResponse | null;
