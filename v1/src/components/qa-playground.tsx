'use client';

import { useEffect, useState, useTransition } from 'react';

import type {
  CreateProjectRequest,
  GenerateBugReportResponse,
  GenerateTestCasesResponse,
  ProjectDetailDto,
  ProjectDto,
  SavedBugReportDto,
  SavedTestCaseBatchDto,
} from '@/types/api';

const defaultBugDraft = {
  rawInput:
    'After resetting password, the login spinner keeps running in Chrome and the user never reaches the dashboard.',
  expectedInput: 'User should log in successfully after password reset.',
  actualInput: 'The login button shows a spinner forever and no redirect happens.',
  environmentInput: 'Chrome 124 on Windows 11, staging environment',
  logsInput: 'Console shows a 401 response from /api/session/refresh',
};

const defaultTestCaseDraft = {
  featureTitle: 'Password Reset with OTP',
  sourceRequirement:
    'As a user, I want to reset my password using an OTP sent to my email so I can regain account access securely.',
  acceptanceCriteria:
    'OTP expires in 5 minutes, users can resend OTP after 30 seconds, and password must meet complexity rules.',
  generationMode: 'REGRESSION',
};

const defaultProjectDraft: CreateProjectRequest = {
  name: 'Checkout Revamp',
  description: 'QA workspace for exploratory bugs and regression coverage.',
};

export function QAPlayground() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectDetail, setProjectDetail] = useState<ProjectDetailDto | null>(null);
  const [projectDraft, setProjectDraft] = useState<CreateProjectRequest>(defaultProjectDraft);
  const [bugDraft, setBugDraft] = useState(defaultBugDraft);
  const [testCaseDraft, setTestCaseDraft] = useState(defaultTestCaseDraft);
  const [bugOutput, setBugOutput] = useState<GenerateBugReportResponse | null>(null);
  const [testOutput, setTestOutput] = useState<GenerateTestCasesResponse | null>(null);
  const [bugError, setBugError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isBootstrapping, startBootstrapTransition] = useTransition();
  const [isProjectPending, startProjectTransition] = useTransition();
  const [isBugPending, startBugTransition] = useTransition();
  const [isTestPending, startTestTransition] = useTransition();
  const [isSavingBug, startSaveBugTransition] = useTransition();
  const [isSavingCases, startSaveCasesTransition] = useTransition();

  useEffect(() => {
    startBootstrapTransition(async () => {
      await refreshProjects();
    });
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectDetail(null);
      return;
    }

    startBootstrapTransition(async () => {
      await refreshProjectDetail(selectedProjectId);
    });
  }, [selectedProjectId]);

  async function refreshProjects(nextProjectId?: string) {
    const response = await fetch('/api/projects', {
      cache: 'no-store',
    });
    const data = await response.json();

    if (!response.ok) {
      setProjectError(data?.error?.message ?? 'Unable to load projects.');
      return;
    }

    const projectList = data as ProjectDto[];
    setProjects(projectList);

    const preferredProjectId =
      nextProjectId ??
      (projectList.some((project) => project.id === selectedProjectId)
        ? selectedProjectId
        : (projectList[0]?.id ?? ''));

    setSelectedProjectId(preferredProjectId);
    setProjectError(null);
  }

  async function refreshProjectDetail(projectId: string) {
    const response = await fetch(`/api/projects/${projectId}`, {
      cache: 'no-store',
    });
    const data = await response.json();

    if (!response.ok) {
      setProjectError(data?.error?.message ?? 'Unable to load project details.');
      return;
    }

    setProjectDetail(data as ProjectDetailDto);
    setProjectError(null);
  }

  async function createProject() {
    setProjectError(null);
    setSaveMessage(null);

    startProjectTransition(async () => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectDraft),
      });
      const data = await response.json();

      if (!response.ok) {
        setProjectError(data?.error?.message ?? 'Unable to create project.');
        return;
      }

      const project = data as ProjectDto;
      await refreshProjects(project.id);
      await refreshProjectDetail(project.id);
      setSaveMessage(`Project "${project.name}" created.`);
    });
  }

  async function submitBugReport() {
    if (!selectedProjectId) {
      setBugError('Create or select a project before generating.');
      return;
    }

    setBugError(null);
    setSaveMessage(null);

    startBugTransition(async () => {
      const response = await fetch('/api/bug-reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bugDraft,
          projectId: selectedProjectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setBugOutput(null);
        setBugError(data?.error?.message ?? 'Bug report generation failed.');
        return;
      }

      setBugOutput(data);
    });
  }

  async function saveBugReport() {
    if (!selectedProjectId || !bugOutput) {
      setBugError('Generate a bug report before saving.');
      return;
    }

    setBugError(null);
    setSaveMessage(null);

    startSaveBugTransition(async () => {
      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bugDraft,
          ...bugOutput,
          projectId: selectedProjectId,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setBugError(data?.error?.message ?? 'Unable to save bug report.');
        return;
      }

      await refreshProjectDetail(selectedProjectId);
      setSaveMessage(`Saved bug report "${(data as SavedBugReportDto).title}".`);
    });
  }

  async function submitTestCases() {
    if (!selectedProjectId) {
      setTestError('Create or select a project before generating.');
      return;
    }

    setTestError(null);
    setSaveMessage(null);

    startTestTransition(async () => {
      const response = await fetch('/api/test-cases/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testCaseDraft,
          projectId: selectedProjectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setTestOutput(null);
        setTestError(data?.error?.message ?? 'Test case generation failed.');
        return;
      }

      setTestOutput(data);
    });
  }

  async function saveTestCases() {
    if (!selectedProjectId || !testOutput) {
      setTestError('Generate test cases before saving.');
      return;
    }

    setTestError(null);
    setSaveMessage(null);

    startSaveCasesTransition(async () => {
      const response = await fetch('/api/test-cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testCaseDraft,
          projectId: selectedProjectId,
          cases: testOutput.cases,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setTestError(data?.error?.message ?? 'Unable to save test cases.');
        return;
      }

      await refreshProjectDetail(selectedProjectId);
      setSaveMessage(
        `Saved ${(data as SavedTestCaseBatchDto).cases.length} test cases for "${(data as SavedTestCaseBatchDto).featureTitle}".`
      );
    });
  }

  return (
    <div className="page-shell">
      <section className="hero">
        <div className="stack">
          <div className="hero-badges">
            <span className="badge">OpenAI Structured Outputs</span>
            <span className="badge">Project CRUD</span>
            <span className="badge">Database Save Flows</span>
          </div>
          <h1>QA writing, without the repetitive drag.</h1>
          <p>
            Create a project, generate structured QA assets, and save bug reports plus test-case
            batches into the database from one working surface.
          </p>
        </div>

        <div className="panel">
          <h2>Project Workspace</h2>
          <div className="stack">
            <div className="field">
              <label htmlFor="project-picker">Active project</label>
              <select
                id="project-picker"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="New project name"
              value={projectDraft.name}
              onChange={(value) => setProjectDraft((current) => ({ ...current, name: value }))}
            />
            <TextAreaField
              label="Project description"
              value={projectDraft.description}
              onChange={(value) =>
                setProjectDraft((current) => ({ ...current, description: value }))
              }
            />
            <div className="button-row">
              <button
                className="button"
                type="button"
                onClick={createProject}
                disabled={isProjectPending}
              >
                {isProjectPending ? 'Creating...' : 'Create Project'}
              </button>
              <span className="meta">
                {isBootstrapping
                  ? 'Refreshing workspace...'
                  : `${projects.length} project(s) loaded`}
              </span>
            </div>
            {projectError ? <p className="meta error-text">{projectError}</p> : null}
            {saveMessage ? <p className="meta">{saveMessage}</p> : null}
            {projectDetail ? (
              <div className="output-card">
                <h3>{projectDetail.name}</h3>
                <p className="meta">{projectDetail.description || 'No description yet.'}</p>
                <p className="meta">
                  {projectDetail.bugReports.length} saved bug report(s) and{' '}
                  {projectDetail.testCaseBatches.length} saved batch(es)
                </p>
              </div>
            ) : (
              <p className="meta">Create your first project to start persisting QA assets.</p>
            )}
          </div>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <h2>Bug Report Generator</h2>
          <p>Generate, then save the result into the selected project.</p>
          <div className="stack">
            <TextAreaField
              label="Raw tester notes"
              value={bugDraft.rawInput}
              onChange={(value) => setBugDraft((current) => ({ ...current, rawInput: value }))}
            />
            <Field
              label="Expected behavior"
              value={bugDraft.expectedInput}
              onChange={(value) => setBugDraft((current) => ({ ...current, expectedInput: value }))}
            />
            <Field
              label="Actual behavior"
              value={bugDraft.actualInput}
              onChange={(value) => setBugDraft((current) => ({ ...current, actualInput: value }))}
            />
            <Field
              label="Environment"
              value={bugDraft.environmentInput}
              onChange={(value) =>
                setBugDraft((current) => ({ ...current, environmentInput: value }))
              }
            />
            <TextAreaField
              label="Logs or console output"
              value={bugDraft.logsInput}
              onChange={(value) => setBugDraft((current) => ({ ...current, logsInput: value }))}
            />
            <div className="button-row">
              <button
                className="button"
                type="button"
                onClick={submitBugReport}
                disabled={isBugPending}
              >
                {isBugPending ? 'Generating...' : 'Generate Bug Report'}
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={saveBugReport}
                disabled={isSavingBug || !bugOutput}
              >
                {isSavingBug ? 'Saving...' : 'Save Bug Report'}
              </button>
            </div>
            {bugError ? <p className="meta error-text">{bugError}</p> : null}
            {bugOutput ? (
              <div className="output-card">
                <h3>{bugOutput.title}</h3>
                <pre>{JSON.stringify(bugOutput, null, 2)}</pre>
              </div>
            ) : (
              <p className="meta">Generated bug report will appear here.</p>
            )}
          </div>
        </div>

        <div className="panel">
          <h2>Test Case Generator</h2>
          <p>Generate test cases for the selected project and persist the batch.</p>
          <div className="stack">
            <Field
              label="Feature title"
              value={testCaseDraft.featureTitle}
              onChange={(value) =>
                setTestCaseDraft((current) => ({ ...current, featureTitle: value }))
              }
            />
            <TextAreaField
              label="Requirement"
              value={testCaseDraft.sourceRequirement}
              onChange={(value) =>
                setTestCaseDraft((current) => ({ ...current, sourceRequirement: value }))
              }
            />
            <TextAreaField
              label="Acceptance criteria"
              value={testCaseDraft.acceptanceCriteria}
              onChange={(value) =>
                setTestCaseDraft((current) => ({ ...current, acceptanceCriteria: value }))
              }
            />
            <div className="field">
              <label htmlFor="generationMode">Generation mode</label>
              <select
                id="generationMode"
                value={testCaseDraft.generationMode}
                onChange={(event) =>
                  setTestCaseDraft((current) => ({
                    ...current,
                    generationMode: event.target.value,
                  }))
                }
              >
                <option value="SMOKE">Smoke</option>
                <option value="REGRESSION">Regression</option>
                <option value="EDGE_HEAVY">Edge Heavy</option>
              </select>
            </div>
            <div className="button-row">
              <button
                className="button"
                type="button"
                onClick={submitTestCases}
                disabled={isTestPending}
              >
                {isTestPending ? 'Generating...' : 'Generate Test Cases'}
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={saveTestCases}
                disabled={isSavingCases || !testOutput}
              >
                {isSavingCases ? 'Saving...' : 'Save Test Cases'}
              </button>
            </div>
            {testError ? <p className="meta error-text">{testError}</p> : null}
            {testOutput ? (
              <div className="output-card">
                <h3>Generated Cases</h3>
                <pre>{JSON.stringify(testOutput, null, 2)}</pre>
              </div>
            ) : (
              <p className="meta">Generated test cases will appear here.</p>
            )}
          </div>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <h2>Recent Bug Reports</h2>
          {projectDetail?.bugReports.length ? (
            <div className="stack">
              {projectDetail.bugReports.map((report) => (
                <div key={report.id} className="output-card">
                  <h3>{report.title}</h3>
                  <p className="meta">{report.summary}</p>
                  <p className="meta">
                    Severity {report.severity} | {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="meta">No saved bug reports yet for this project.</p>
          )}
        </div>

        <div className="panel">
          <h2>Recent Test Case Batches</h2>
          {projectDetail?.testCaseBatches.length ? (
            <div className="stack">
              {projectDetail.testCaseBatches.map((batch) => (
                <div key={batch.id} className="output-card">
                  <h3>{batch.featureTitle}</h3>
                  <p className="meta">
                    {batch.cases.length} case(s) | {batch.generationMode} |{' '}
                    {new Date(batch.createdAt).toLocaleString()}
                  </p>
                  <pre>{JSON.stringify(batch.cases.slice(0, 2), null, 2)}</pre>
                </div>
              ))}
            </div>
          ) : (
            <p className="meta">No saved test-case batches yet for this project.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
