'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from 'react';

import { BugReportExportActions } from '@/components/bug-report-export-actions';
import { TestCaseExportActions } from '@/components/test-case-export-actions';
import {
  defaultBugDraft,
  defaultProjectDraft,
  defaultSettingsDraft,
  defaultTestCaseDraft,
  type BugDraft,
  type SettingsDraft,
  type TestCaseDraft,
} from '@/components/workspace-model';
import { useBugGenerator } from '@/hooks/useBugGenerator';
import { useProjects } from '@/hooks/useProjects';
import { useTestGenerator } from '@/hooks/useTestGenerator';
import { getApiErrorMessage } from '@/lib/api/client';
import type {
  AIProvider,
  AIProviderOption,
  CreateProjectRequest,
  GeneratedTestCase,
  GenerateBugReportResponse,
  GenerateTestCasesResponse,
  ProjectDetailDto,
  ProjectDto,
  SavedBugReportDto,
  SavedTestCaseBatchDto,
  TestCaseSourceAttachment,
  UserSettingsDto,
} from '@/types/api';

type WorkspaceContextValue = {
  availableProviders: AIProviderOption[];
  selectedProvider: AIProvider | '';
  setSelectedProvider: React.Dispatch<React.SetStateAction<AIProvider | ''>>;
  userSettings: UserSettingsDto | null;
  settingsDraft: SettingsDraft;
  setSettingsDraft: React.Dispatch<React.SetStateAction<SettingsDraft>>;
  projects: ProjectDto[];
  selectedProjectId: string;
  projectDetail: ProjectDetailDto | null;
  projectDraft: CreateProjectRequest;
  setProjectDraft: React.Dispatch<React.SetStateAction<CreateProjectRequest>>;
  bugDraft: BugDraft;
  setBugDraft: React.Dispatch<React.SetStateAction<BugDraft>>;
  testCaseDraft: TestCaseDraft;
  setTestCaseDraft: React.Dispatch<React.SetStateAction<TestCaseDraft>>;
  bugOutput: GenerateBugReportResponse | null;
  setBugOutput: React.Dispatch<React.SetStateAction<GenerateBugReportResponse | null>>;
  bugDraftDirty: boolean;
  editingBugReportId: string | null;
  testOutput: GenerateTestCasesResponse | null;
  setTestOutput: React.Dispatch<React.SetStateAction<GenerateTestCasesResponse | null>>;
  testDraftDirty: boolean;
  editingTestCaseBatchId: string | null;
  bugError: string | null;
  testError: string | null;
  projectError: string | null;
  saveMessage: string | null;
  isBootstrapping: boolean;
  isProjectPending: boolean;
  isBugPending: boolean;
  isTestPending: boolean;
  isSavingBug: boolean;
  isSavingCases: boolean;
  isSavingSettings: boolean;
  metrics: {
    totalProjects: number;
    totalBugReports: number;
    totalTestCases: number;
    releaseSignal: string;
  };
  setSelectedProjectId: (projectId: string) => void;
  createProject: () => Promise<void>;
  submitBugReport: () => Promise<void>;
  regenerateBugReport: () => Promise<void>;
  resetBugOutput: () => void;
  loadSavedBugReport: (report: SavedBugReportDto) => void;
  saveBugReport: () => Promise<void>;
  submitTestCases: () => Promise<void>;
  regenerateTestCases: () => Promise<void>;
  resetTestOutput: () => void;
  loadSavedTestCaseBatch: (batch: SavedTestCaseBatchDto) => void;
  saveTestCases: () => Promise<void>;
  saveSettings: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [availableProviders, setAvailableProviders] = useState<AIProviderOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | ''>('');
  const [userSettings, setUserSettings] = useState<UserSettingsDto | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(defaultSettingsDraft);
  const [isSavingSettings, startSaveSettingsTransition] = useTransition();

  const {
    projects,
    selectedProjectId,
    projectDetail,
    projectDraft,
    setProjectDraft,
    projectError,
    setProjectError,
    saveMessage,
    setSaveMessage,
    isBootstrapping,
    startBootstrapTransition,
    isProjectPending,
    metrics,
    setSelectedProjectId,
    refreshProjects,
    refreshProjectDetail,
    createProject,
  } = useProjects({
    defaultProjectDraft,
  });

  const {
    bugDraft,
    setBugDraft,
    bugOutput,
    setBugOutput,
    bugDraftDirty,
    editingBugReportId,
    bugError,
    isBugPending,
    isSavingBug,
    submitBugReport,
    regenerateBugReport,
    resetBugOutput,
    loadSavedBugReport,
    saveBugReport,
  } = useBugGenerator({
    defaultBugDraft,
    selectedProjectId,
    selectedProvider,
    refreshProjectDetail,
    setSelectedProjectId,
    setSaveMessage,
  });

  const {
    testCaseDraft,
    setTestCaseDraft,
    testOutput,
    setTestOutput,
    testDraftDirty,
    editingTestCaseBatchId,
    testError,
    isTestPending,
    isSavingCases,
    submitTestCases,
    regenerateTestCases,
    resetTestOutput,
    loadSavedTestCaseBatch,
    saveTestCases,
  } = useTestGenerator({
    defaultTestCaseDraft,
    selectedProjectId,
    selectedProvider,
    refreshProjectDetail,
    setSelectedProjectId,
    setSelectedProvider,
    setSaveMessage,
  });

  useEffect(() => {
    startBootstrapTransition(async () => {
      await refreshUserSettings();
      await refreshProviders();
      await refreshProjects();
    });
  }, []);

  useEffect(() => {
    if (!availableProviders.length) {
      return;
    }

    setSelectedProvider((current) =>
      current && availableProviders.some((provider) => provider.id === current)
        ? current
        : userSettings?.preferredProvider &&
            availableProviders.some((provider) => provider.id === userSettings.preferredProvider)
          ? userSettings.preferredProvider
          : (availableProviders[0]?.id ?? '')
    );
  }, [availableProviders, userSettings?.preferredProvider]);

  async function refreshProviders() {
    const response = await fetch('/api/ai/providers', { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok) {
      return;
    }

    const providers = data as AIProviderOption[];
    setAvailableProviders(providers);
  }

  async function refreshUserSettings() {
    const response = await fetch('/api/settings/profile', { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok) {
      return;
    }

    const profile = data as UserSettingsDto;
    setUserSettings(profile);
    setSettingsDraft({
      name: profile.name ?? '',
      preferredProvider: profile.preferredProvider ?? '',
    });
  }

  async function saveSettings() {
    setSaveMessage(null);
    setProjectError(null);

    return new Promise<void>((resolve) => {
      startSaveSettingsTransition(async () => {
        const response = await fetch('/api/settings/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsDraft),
        });
        const data = await response.json();

        if (!response.ok) {
          setProjectError(getApiErrorMessage(data, 'Unable to save settings.'));
          resolve();
          return;
        }

        const profile = data as UserSettingsDto;
        setUserSettings(profile);
        setSelectedProvider(profile.preferredProvider ?? selectedProvider);
        setSaveMessage('Settings saved.');
        resolve();
      });
    });
  }

  return (
    <WorkspaceContext.Provider
      value={{
        availableProviders,
        selectedProvider,
        setSelectedProvider,
        userSettings,
        settingsDraft,
        setSettingsDraft,
        projects,
        selectedProjectId,
        projectDetail,
        projectDraft,
        setProjectDraft,
        bugDraft,
        setBugDraft,
        testCaseDraft,
        setTestCaseDraft,
        bugOutput,
        setBugOutput,
        bugDraftDirty,
        editingBugReportId,
        testOutput,
        setTestOutput,
        testDraftDirty,
        editingTestCaseBatchId,
        bugError,
        testError,
        projectError,
        saveMessage,
        isBootstrapping,
        isProjectPending,
        isBugPending,
        isTestPending,
        isSavingBug,
        isSavingCases,
        isSavingSettings,
        metrics,
        setSelectedProjectId,
        createProject,
        submitBugReport,
        regenerateBugReport,
        resetBugOutput,
        loadSavedBugReport,
        saveBugReport,
        submitTestCases,
        regenerateTestCases,
        resetTestOutput,
        loadSavedTestCaseBatch,
        saveTestCases,
        saveSettings,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function WorkspaceShell({
  children,
  userLabel,
  signOutAction,
}: {
  children: ReactNode;
  userLabel: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const workspace = useWorkspace();
  const activeProvider =
    workspace.availableProviders.find((provider) => provider.id === workspace.selectedProvider) ??
    null;

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar">
        <div>
          <p className="eyebrow">QA Copilot</p>
          <h1>AI workspace for bug reports and test design</h1>
        </div>
        <div className="topbar-actions">
          <div className="provider-strip">
            <div className="field compact-field">
              <label htmlFor="workspace-provider">AI provider</label>
              <select
                id="workspace-provider"
                value={workspace.selectedProvider}
                onChange={(event) =>
                  workspace.setSelectedProvider(event.target.value as AIProvider | '')
                }
              >
                {workspace.availableProviders.length ? (
                  workspace.availableProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label} · {provider.model}
                    </option>
                  ))
                ) : (
                  <option value="">No provider configured</option>
                )}
              </select>
            </div>
            <p className="meta-line">
              {activeProvider
                ? `Using ${activeProvider.label} with ${activeProvider.model}`
                : 'Add an AI provider key in .env.local to enable generation.'}
            </p>
          </div>
          <div className="topbar-status">
            <span className="signal-dot" />
            <span>{workspace.isBootstrapping ? 'Syncing workspace' : 'Workspace live'}</span>
          </div>
          <form action={signOutAction}>
            <div className="topbar-user">
              <span>{userLabel}</span>
              <button className="button ghost" type="submit">
                Sign Out
              </button>
            </div>
          </form>
        </div>
      </header>

      <section className="hero-surface">
        <div className="hero-copy">
          <div className="hero-badges">
            <span className="badge">Manual QA</span>
            <span className="badge">Structured Outputs</span>
            <span className="badge">Project Memory</span>
          </div>
          <h2>Move from rough notes to saved QA assets in one flow.</h2>
          <p>
            Route by route, this now behaves like a real product workspace: projects on the left,
            focused pages in the center, and saved QA memory always close by.
          </p>
        </div>

        <div className="hero-stats">
          <MetricCard label="Projects" value={String(workspace.metrics.totalProjects)} />
          <MetricCard label="Saved Bugs" value={String(workspace.metrics.totalBugReports)} />
          <MetricCard label="Saved Cases" value={String(workspace.metrics.totalTestCases)} />
          <MetricCard
            label="Release Signal"
            value={workspace.metrics.releaseSignal}
            tone="accent"
          />
        </div>
      </section>

      <nav className="app-nav">
        <NavLink href="/dashboard" active={pathname === '/dashboard'}>
          Dashboard
        </NavLink>
        <NavLink href="/projects" active={pathname === '/projects'}>
          Projects
        </NavLink>
        <NavLink href="/bug-reports" active={pathname === '/bug-reports'}>
          Bug Reports
        </NavLink>
        <NavLink href="/test-cases" active={pathname === '/test-cases'}>
          Test Cases
        </NavLink>
        <NavLink href="/settings" active={pathname === '/settings'}>
          Settings
        </NavLink>
      </nav>

      <div className="workspace-grid">
        <aside className="sidebar">
          <ProjectsSidebar />
        </aside>
        <main className="workspace-main">{children}</main>
      </div>
    </div>
  );
}

export function ProjectsSidebar() {
  const { projects, selectedProjectId, setSelectedProjectId, projectError, saveMessage } =
    useWorkspace();

  return (
    <section className="panel sidebar-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Projects</p>
          <h3>Workspace switcher</h3>
        </div>
        <span className="meta-chip">{projects.length} total</span>
      </div>

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

      <div className="project-list">
        {projects.length ? (
          projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={`project-row ${selectedProjectId === project.id ? 'active' : ''}`}
              onClick={() => setSelectedProjectId(project.id)}
            >
              <span>{project.name}</span>
              <small>{formatShortDate(project.updatedAt)}</small>
            </button>
          ))
        ) : (
          <p className="meta">No projects yet. Create one to unlock the workspace.</p>
        )}
      </div>

      {projectError ? <p className="meta error-text">{projectError}</p> : null}
      {saveMessage ? <p className="meta success-text">{saveMessage}</p> : null}
    </section>
  );
}

export function ActiveWorkspacePanel() {
  const { projectDetail } = useWorkspace();

  return (
    <section className="panel active-project-panel">
      <SectionHeader
        eyebrow="Active Workspace"
        title={projectDetail?.name ?? 'Choose a project to begin'}
        trailing={
          <div className="status-pill">
            {projectDetail ? 'Project selected' : 'No project selected'}
          </div>
        }
      />

      <p className="panel-lead">
        {projectDetail?.description ??
          'Your selected project will show recent saved QA assets, trend hints, and quick actions here.'}
      </p>

      <div className="overview-grid">
        <SummaryTile
          label="Bug reports"
          value={String(projectDetail?.bugReports.length ?? 0)}
          helper="Structured defects saved in this workspace"
        />
        <SummaryTile
          label="Test batches"
          value={String(projectDetail?.testCaseBatches.length ?? 0)}
          helper="Saved generation runs for manual coverage"
        />
        <SummaryTile
          label="Coverage volume"
          value={String(
            projectDetail?.testCaseBatches.reduce((sum, batch) => sum + batch.cases.length, 0) ?? 0
          )}
          helper="Total generated cases attached to this workspace"
        />
      </div>
    </section>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`nav-link ${active ? 'active' : ''}`}>
      {children}
    </Link>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  trailing,
}: {
  eyebrow: string;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
      </div>
      {trailing}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'accent';
}) {
  return (
    <div className={`metric-card ${tone === 'accent' ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function SummaryTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </div>
  );
}

export function EditableBugReport({
  report,
  onChange,
}: {
  report: GenerateBugReportResponse;
  onChange: React.Dispatch<React.SetStateAction<GenerateBugReportResponse | null>>;
}) {
  const updateField = <K extends keyof GenerateBugReportResponse>(
    key: K,
    value: GenerateBugReportResponse[K]
  ) => {
    onChange((current) => (current ? { ...current, [key]: value } : current));
  };

  return (
    <div className="stack">
      <div className="feature-card feature-highlight">
        <div className="card-header-inline">
          <span className="severity-pill">{report.severity}</span>
          <select
            className="inline-select"
            value={report.severity}
            onChange={(event) =>
              updateField('severity', event.target.value as GenerateBugReportResponse['severity'])
            }
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
        <InlineField
          label="Title"
          value={report.title}
          onChange={(value) => updateField('title', value)}
        />
        <InlineArea
          label="Summary"
          value={report.summary}
          onChange={(value) => updateField('summary', value)}
          rows={4}
        />
      </div>
      <div className="checklist-card">
        <h4>Steps to reproduce</h4>
        <EditableStringList
          items={report.stepsToReproduce}
          onChange={(stepsToReproduce) => updateField('stepsToReproduce', stepsToReproduce)}
        />
      </div>
      <div className="detail-grid">
        <InlineArea
          label="Expected Result"
          value={report.expectedResult}
          onChange={(value) => updateField('expectedResult', value)}
          rows={4}
        />
        <InlineArea
          label="Actual Result"
          value={report.actualResult}
          onChange={(value) => updateField('actualResult', value)}
          rows={4}
        />
      </div>
      <div className="detail-grid">
        <InlineArea
          label="Environment"
          value={report.environmentSummary ?? ''}
          onChange={(value) => updateField('environmentSummary', value)}
          placeholder="Not specified"
          rows={3}
        />
        <EditableStringList
          label="Assumptions"
          items={report.assumptions}
          onChange={(assumptions) => updateField('assumptions', assumptions)}
        />
      </div>
    </div>
  );
}

export function EditableTestCases({
  output,
  onChange,
}: {
  output: GenerateTestCasesResponse;
  onChange: React.Dispatch<React.SetStateAction<GenerateTestCasesResponse | null>>;
}) {
  function updateCase(index: number, updater: (current: GeneratedTestCase) => GeneratedTestCase) {
    onChange((current) =>
      current
        ? {
            ...current,
            cases: current.cases.map((testCase, caseIndex) =>
              caseIndex === index ? updater(testCase) : testCase
            ),
          }
        : current
    );
  }

  return (
    <div className="stack">
      {output.cases.map((testCase, index) => (
        <div key={`${testCase.title}-${index}`} className="feature-card">
          <div className="card-header-inline">
            <InlineField
              label={`Case ${index + 1} title`}
              value={testCase.title}
              onChange={(value) => updateCase(index, (current) => ({ ...current, title: value }))}
            />
            <select
              className="inline-select"
              value={testCase.caseType}
              onChange={(event) =>
                updateCase(index, (current) => ({
                  ...current,
                  caseType: event.target.value as GeneratedTestCase['caseType'],
                }))
              }
            >
              <option value="POSITIVE">POSITIVE</option>
              <option value="NEGATIVE">NEGATIVE</option>
              <option value="EDGE">EDGE</option>
              <option value="BOUNDARY">BOUNDARY</option>
            </select>
          </div>
          <div className="card-header-inline">
            <p className="meta-line">Editable test case</p>
            <select
              className="inline-select"
              value={testCase.priority}
              onChange={(event) =>
                updateCase(index, (current) => ({
                  ...current,
                  priority: event.target.value as GeneratedTestCase['priority'],
                }))
              }
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>
          <div className="detail-grid">
            <EditableStringList
              label="Preconditions"
              items={testCase.preconditions}
              onChange={(preconditions) =>
                updateCase(index, (current) => ({ ...current, preconditions }))
              }
            />
            <InlineArea
              label="Expected Result"
              value={testCase.expectedResult}
              onChange={(value) =>
                updateCase(index, (current) => ({ ...current, expectedResult: value }))
              }
              rows={4}
            />
          </div>
          <div className="checklist-card muted">
            <h4>Execution Steps</h4>
            <EditableStringList
              items={testCase.steps}
              onChange={(steps) => updateCase(index, (current) => ({ ...current, steps }))}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EditableStringList({
  items,
  onChange,
  label,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  label?: string;
}) {
  return (
    <div className="editable-list">
      {label ? <span className="info-label">{label}</span> : null}
      <div className="stack">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${item}-${index}`} className="editable-list-row">
              <textarea
                className="inline-textarea"
                value={item}
                rows={2}
                onChange={(event) =>
                  onChange(
                    items.map((existing, itemIndex) =>
                      itemIndex === index ? event.target.value : existing
                    )
                  )
                }
              />
              <button
                className="icon-button"
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <p className="meta">No items yet.</p>
        )}
        <button className="button ghost" type="button" onClick={() => onChange([...items, ''])}>
          Add Line
        </button>
      </div>
    </div>
  );
}

function InlineField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="inline-editor">
      <span className="info-label">{label}</span>
      <input
        className="inline-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function InlineArea({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="info-card inline-editor-card">
      <span>{label}</span>
      <textarea
        className="inline-textarea"
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function BugReportCard({
  report,
  compact = false,
  onEdit,
}: {
  report: SavedBugReportDto;
  compact?: boolean;
  onEdit?: () => void;
}) {
  return (
    <article className={`feature-card ${compact ? 'compact' : ''}`}>
      <div className="card-header-inline">
        <h4>{report.title}</h4>
        <span className="severity-pill">{report.severity}</span>
      </div>
      <p>{report.summary}</p>
      <div className="detail-grid">
        <InfoCard title="Expected" body={report.expectedResult} />
        <InfoCard title="Actual" body={report.actualResult} />
      </div>
      <BugReportExportActions report={report} fileStem={report.title} />
      {onEdit ? (
        <div className="card-actions">
          <Link className="button secondary" href={`/bug-reports/${report.id}`}>
            View Details
          </Link>
          <button className="button ghost" type="button" onClick={onEdit}>
            Edit In Composer
          </button>
        </div>
      ) : null}
      <p className="meta-line">{formatLongDate(report.createdAt)}</p>
    </article>
  );
}

export function TestCaseBatchCard({
  batch,
  compact = false,
  onEdit,
}: {
  batch: SavedTestCaseBatchDto;
  compact?: boolean;
  onEdit?: () => void;
}) {
  return (
    <article className={`feature-card ${compact ? 'compact' : ''}`}>
      <div className="card-header-inline">
        <h4>{batch.featureTitle}</h4>
        <span className="meta-chip">{batch.generationMode}</span>
      </div>
      <p className="meta-line">
        {batch.cases.length} case(s) saved on {formatLongDate(batch.createdAt)}
      </p>
      <div className="case-preview-list">
        {batch.cases.slice(0, compact ? 2 : 3).map((testCase, index) => (
          <div key={`${testCase.title}-${index}`} className="case-preview-row">
            <span>{testCase.title}</span>
            <small>{testCase.caseType}</small>
          </div>
        ))}
      </div>
      <TestCaseExportActions batch={batch} fileStem={batch.featureTitle} />
      {onEdit ? (
        <div className="card-actions">
          <Link className="button secondary" href={`/test-cases/${batch.id}`}>
            View Details
          </Link>
          <button className="button ghost" type="button" onClick={onEdit}>
            Edit In Composer
          </button>
        </div>
      ) : null}
    </article>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="info-card">
      <span>{title}</span>
      <p>{body}</p>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

export function SourceMaterialList({
  attachments,
  onRemove,
}: {
  attachments: TestCaseSourceAttachment[];
  onRemove: (attachmentId: string) => void;
}) {
  return (
    <div className="stack">
      <span className="info-label">Attached source material</span>
      {attachments.map((attachment) => (
        <article key={attachment.id} className="feature-card compact">
          <div className="card-header-inline">
            <div>
              <h4>{attachment.name}</h4>
              <p className="meta-line">{attachment.mimeType}</p>
            </div>
            <span className="meta-chip">{attachment.kind}</span>
          </div>
          {attachment.kind === 'TEXT' ? (
            <p className="meta-line">{truncatePreview(attachment.textContent ?? '', 220)}</p>
          ) : (
            <p className="meta-line">Image reference ready for visual test generation.</p>
          )}
          <div className="card-actions">
            <button className="button ghost" type="button" onClick={() => onRemove(attachment.id)}>
              Remove
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value ?? ''}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function TextAreaField({
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

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export async function parseSourceAttachment(file: File): Promise<TestCaseSourceAttachment> {
  if (file.type.startsWith('image/')) {
    return {
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      mimeType: file.type || 'image/*',
      kind: 'IMAGE',
      imageDataUrl: await readFileAsDataUrl(file),
    };
  }

  if (isSupportedTextFile(file)) {
    const textContent = truncateTextContent(await file.text(), 20000);

    return {
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      mimeType: file.type || detectMimeFromName(file.name),
      kind: 'TEXT',
      textContent,
    };
  }

  throw new Error(
    `Unsupported file "${file.name}". Use an image or a text-based doc like TXT, MD, CSV, JSON, HTML, XML, LOG, or RTF.`
  );
}

function isSupportedTextFile(file: File) {
  const normalizedType = file.type.toLowerCase();
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';

  return (
    normalizedType.startsWith('text/') ||
    normalizedType.includes('json') ||
    normalizedType.includes('xml') ||
    normalizedType.includes('rtf') ||
    ['txt', 'md', 'csv', 'json', 'html', 'htm', 'xml', 'log', 'rtf'].includes(extension ?? '')
  );
}

function detectMimeFromName(name: string) {
  const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';

  switch (extension) {
    case 'md':
      return 'text/markdown';
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    case 'html':
    case 'htm':
      return 'text/html';
    case 'xml':
      return 'application/xml';
    case 'log':
      return 'text/plain';
    case 'rtf':
      return 'application/rtf';
    default:
      return 'text/plain';
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error(`Unable to read image "${file.name}".`));
    };

    reader.onerror = () => reject(new Error(`Unable to read image "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

function truncateTextContent(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit)}\n[truncated after ${limit} characters]`;
}

function truncatePreview(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit)}...`;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider.');
  }

  return context;
}
