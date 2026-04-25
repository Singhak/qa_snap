"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import type {
  CreateProjectRequest,
  GeneratedTestCase,
  GenerateBugReportResponse,
  GenerateTestCasesResponse,
  ProjectDetailDto,
  ProjectDto,
  SavedBugReportDto,
  SavedTestCaseBatchDto,
} from "@/types/api";

const defaultBugDraft = {
  rawInput:
    "After resetting password, the login spinner keeps running in Chrome and the user never reaches the dashboard.",
  expectedInput: "User should log in successfully after password reset.",
  actualInput: "The login button shows a spinner forever and no redirect happens.",
  environmentInput: "Chrome 124 on Windows 11, staging environment",
  logsInput: "Console shows a 401 response from /api/session/refresh",
};

const defaultTestCaseDraft = {
  featureTitle: "Password Reset with OTP",
  sourceRequirement:
    "As a user, I want to reset my password using an OTP sent to my email so I can regain account access securely.",
  acceptanceCriteria:
    "OTP expires in 5 minutes, users can resend OTP after 30 seconds, and password must meet complexity rules.",
  generationMode: "REGRESSION",
};

const defaultProjectDraft: CreateProjectRequest = {
  name: "Checkout Revamp",
  description: "QA workspace for exploratory bugs and regression coverage.",
};

type WorkspaceContextValue = {
  projects: ProjectDto[];
  selectedProjectId: string;
  projectDetail: ProjectDetailDto | null;
  projectDraft: CreateProjectRequest;
  setProjectDraft: React.Dispatch<React.SetStateAction<CreateProjectRequest>>;
  bugDraft: typeof defaultBugDraft;
  setBugDraft: React.Dispatch<React.SetStateAction<typeof defaultBugDraft>>;
  testCaseDraft: typeof defaultTestCaseDraft;
  setTestCaseDraft: React.Dispatch<React.SetStateAction<typeof defaultTestCaseDraft>>;
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
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectDetail, setProjectDetail] = useState<ProjectDetailDto | null>(null);
  const [projectDraft, setProjectDraft] = useState<CreateProjectRequest>(defaultProjectDraft);
  const [bugDraft, setBugDraft] = useState(defaultBugDraft);
  const [testCaseDraft, setTestCaseDraft] = useState(defaultTestCaseDraft);
  const [bugOutput, setBugOutput] = useState<GenerateBugReportResponse | null>(null);
  const [generatedBugSnapshot, setGeneratedBugSnapshot] = useState<GenerateBugReportResponse | null>(null);
  const [editingBugReportId, setEditingBugReportId] = useState<string | null>(null);
  const [testOutput, setTestOutput] = useState<GenerateTestCasesResponse | null>(null);
  const [generatedTestSnapshot, setGeneratedTestSnapshot] = useState<GenerateTestCasesResponse | null>(null);
  const [editingTestCaseBatchId, setEditingTestCaseBatchId] = useState<string | null>(null);
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

  const metrics = useMemo(() => {
    const totalProjects = projects.length;
    const totalBugReports = projectDetail?.bugReports.length ?? 0;
    const totalTestCases =
      projectDetail?.testCaseBatches.reduce((sum, batch) => sum + batch.cases.length, 0) ?? 0;
    const releaseSignal =
      totalBugReports === 0 ? "Quiet build" : totalBugReports <= 2 ? "Watchlist" : "Needs review";

    return { totalProjects, totalBugReports, totalTestCases, releaseSignal };
  }, [projectDetail, projects]);

  const bugDraftDirty = useMemo(
    () => JSON.stringify(bugOutput) !== JSON.stringify(generatedBugSnapshot),
    [bugOutput, generatedBugSnapshot],
  );

  const testDraftDirty = useMemo(
    () => JSON.stringify(testOutput) !== JSON.stringify(generatedTestSnapshot),
    [testOutput, generatedTestSnapshot],
  );

  async function refreshProjects(nextProjectId?: string) {
    const response = await fetch("/api/projects", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setProjectError(data?.error?.message ?? "Unable to load projects.");
      return;
    }

    const projectList = data as ProjectDto[];
    setProjects(projectList);

    const preferredProjectId =
      nextProjectId ??
      (projectList.some((project) => project.id === selectedProjectId)
        ? selectedProjectId
        : projectList[0]?.id ?? "");

    setSelectedProjectId(preferredProjectId);
    setProjectError(null);
  }

  async function refreshProjectDetail(projectId: string) {
    const response = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setProjectError(data?.error?.message ?? "Unable to load project details.");
      return;
    }

    setProjectDetail(data as ProjectDetailDto);
    setProjectError(null);
  }

  async function createProject() {
    setProjectError(null);
    setSaveMessage(null);

    return new Promise<void>((resolve) => {
      startProjectTransition(async () => {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectDraft),
        });
        const data = await response.json();

        if (!response.ok) {
          setProjectError(data?.error?.message ?? "Unable to create project.");
          resolve();
          return;
        }

        const project = data as ProjectDto;
        await refreshProjects(project.id);
        await refreshProjectDetail(project.id);
        setSaveMessage(`Project "${project.name}" created.`);
        resolve();
      });
    });
  }

  async function submitBugReport() {
    if (!selectedProjectId) {
      setBugError("Create or select a project before generating.");
      return;
    }

    setBugError(null);
    setSaveMessage(null);

    return new Promise<void>((resolve) => {
      startBugTransition(async () => {
        const response = await fetch("/api/bug-reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...bugDraft, projectId: selectedProjectId }),
        });

        const data = await response.json();

        if (!response.ok) {
          setBugOutput(null);
          setGeneratedBugSnapshot(null);
          setBugError(data?.error?.message ?? "Bug report generation failed.");
          resolve();
          return;
        }

        setBugOutput(data);
        setGeneratedBugSnapshot(data);
        setEditingBugReportId(null);
        resolve();
      });
    });
  }

  async function regenerateBugReport() {
    await submitBugReport();
  }

  function resetBugOutput() {
    setBugOutput(generatedBugSnapshot);
  }

  function loadSavedBugReport(report: SavedBugReportDto) {
    setSelectedProjectId(report.projectId);
    setBugDraft({
      rawInput: report.rawInput,
      expectedInput: report.expectedInput ?? "",
      actualInput: report.actualInput ?? "",
      environmentInput: report.environmentInput ?? "",
      logsInput: report.logsInput ?? "",
    });

    const output: GenerateBugReportResponse = {
      title: report.title,
      summary: report.summary,
      stepsToReproduce: report.stepsToReproduce,
      expectedResult: report.expectedResult,
      actualResult: report.actualResult,
      severity: report.severity,
      priority: report.priority ?? undefined,
      environmentSummary: report.environmentSummary ?? undefined,
      assumptions: report.assumptions,
      confidenceScore: report.confidenceScore,
    };

    setBugOutput(output);
    setGeneratedBugSnapshot(output);
    setEditingBugReportId(report.id);
  }

  async function saveBugReport() {
    if (!selectedProjectId || !bugOutput) {
      setBugError("Generate a bug report before saving.");
      return;
    }

    setBugError(null);
    setSaveMessage(null);

    return new Promise<void>((resolve) => {
      startSaveBugTransition(async () => {
        const response = await fetch(editingBugReportId ? `/api/bug-reports/${editingBugReportId}` : "/api/bug-reports", {
          method: editingBugReportId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...bugDraft,
            ...bugOutput,
            projectId: selectedProjectId,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          setBugError(data?.error?.message ?? "Unable to save bug report.");
          resolve();
          return;
        }

        await refreshProjectDetail(selectedProjectId);
        setEditingBugReportId((data as SavedBugReportDto).id);
        setGeneratedBugSnapshot({
          title: (data as SavedBugReportDto).title,
          summary: (data as SavedBugReportDto).summary,
          stepsToReproduce: (data as SavedBugReportDto).stepsToReproduce,
          expectedResult: (data as SavedBugReportDto).expectedResult,
          actualResult: (data as SavedBugReportDto).actualResult,
          severity: (data as SavedBugReportDto).severity,
          priority: (data as SavedBugReportDto).priority ?? undefined,
          environmentSummary: (data as SavedBugReportDto).environmentSummary ?? undefined,
          assumptions: (data as SavedBugReportDto).assumptions,
          confidenceScore: (data as SavedBugReportDto).confidenceScore,
        });
        setSaveMessage(
          `${editingBugReportId ? "Updated" : "Saved"} bug report "${(data as SavedBugReportDto).title}".`,
        );
        resolve();
      });
    });
  }

  async function submitTestCases() {
    if (!selectedProjectId) {
      setTestError("Create or select a project before generating.");
      return;
    }

    setTestError(null);
    setSaveMessage(null);

    return new Promise<void>((resolve) => {
      startTestTransition(async () => {
        const response = await fetch("/api/test-cases/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...testCaseDraft, projectId: selectedProjectId }),
        });

        const data = await response.json();

        if (!response.ok) {
          setTestOutput(null);
          setGeneratedTestSnapshot(null);
          setTestError(data?.error?.message ?? "Test case generation failed.");
          resolve();
          return;
        }

        setTestOutput(data);
        setGeneratedTestSnapshot(data);
        setEditingTestCaseBatchId(null);
        resolve();
      });
    });
  }

  async function regenerateTestCases() {
    await submitTestCases();
  }

  function resetTestOutput() {
    setTestOutput(generatedTestSnapshot);
  }

  function loadSavedTestCaseBatch(batch: SavedTestCaseBatchDto) {
    setSelectedProjectId(batch.projectId);
    setTestCaseDraft({
      featureTitle: batch.featureTitle,
      sourceRequirement: batch.sourceRequirement,
      acceptanceCriteria: batch.acceptanceCriteria ?? "",
      generationMode: batch.generationMode,
    });

    const output: GenerateTestCasesResponse = {
      cases: batch.cases,
    };

    setTestOutput(output);
    setGeneratedTestSnapshot(output);
    setEditingTestCaseBatchId(batch.id);
  }

  async function saveTestCases() {
    if (!selectedProjectId || !testOutput) {
      setTestError("Generate test cases before saving.");
      return;
    }

    setTestError(null);
    setSaveMessage(null);

    return new Promise<void>((resolve) => {
      startSaveCasesTransition(async () => {
        const response = await fetch(
          editingTestCaseBatchId ? `/api/test-cases/${editingTestCaseBatchId}` : "/api/test-cases",
          {
          method: editingTestCaseBatchId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...testCaseDraft,
            projectId: selectedProjectId,
            cases: testOutput.cases,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          setTestError(data?.error?.message ?? "Unable to save test cases.");
          resolve();
          return;
        }

        await refreshProjectDetail(selectedProjectId);
        setEditingTestCaseBatchId((data as SavedTestCaseBatchDto).id);
        setGeneratedTestSnapshot({
          cases: (data as SavedTestCaseBatchDto).cases,
        });
        setSaveMessage(
          `${editingTestCaseBatchId ? "Updated" : "Saved"} ${(data as SavedTestCaseBatchDto).cases.length} test cases for "${(data as SavedTestCaseBatchDto).featureTitle}".`,
        );
        resolve();
      });
    });
  }

  return (
    <WorkspaceContext.Provider
      value={{
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
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const workspace = useWorkspace();

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar">
        <div>
          <p className="eyebrow">QA Copilot</p>
          <h1>AI workspace for bug reports and test design</h1>
        </div>
        <div className="topbar-status">
          <span className="signal-dot" />
          <span>{workspace.isBootstrapping ? "Syncing workspace" : "Workspace live"}</span>
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
            Route by route, this now behaves like a real product workspace:
            projects on the left, focused pages in the center, and saved QA memory
            always close by.
          </p>
        </div>

        <div className="hero-stats">
          <MetricCard label="Projects" value={String(workspace.metrics.totalProjects)} />
          <MetricCard label="Saved Bugs" value={String(workspace.metrics.totalBugReports)} />
          <MetricCard label="Saved Cases" value={String(workspace.metrics.totalTestCases)} />
          <MetricCard label="Release Signal" value={workspace.metrics.releaseSignal} tone="accent" />
        </div>
      </section>

      <nav className="app-nav">
        <NavLink href="/dashboard" active={pathname === "/dashboard"}>
          Dashboard
        </NavLink>
        <NavLink href="/projects" active={pathname === "/projects"}>
          Projects
        </NavLink>
        <NavLink href="/bug-reports" active={pathname === "/bug-reports"}>
          Bug Reports
        </NavLink>
        <NavLink href="/test-cases" active={pathname === "/test-cases"}>
          Test Cases
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

export function DashboardPage() {
  const { projectDetail } = useWorkspace();

  return (
    <>
      <ActiveWorkspacePanel />
      <section className="content-grid">
        <section className="panel">
          <SectionHeader eyebrow="Recent Bugs" title="Saved defect trail" />
          {projectDetail?.bugReports.length ? (
            <div className="stack">
              {projectDetail.bugReports.slice(0, 4).map((report) => (
                <BugReportCard key={report.id} report={report} compact />
              ))}
            </div>
          ) : (
            <EmptyState text="No saved bug reports yet for this project." />
          )}
        </section>

        <section className="panel">
          <SectionHeader eyebrow="Recent Cases" title="Coverage snapshots" />
          {projectDetail?.testCaseBatches.length ? (
            <div className="stack">
              {projectDetail.testCaseBatches.slice(0, 4).map((batch) => (
                <TestCaseBatchCard key={batch.id} batch={batch} compact />
              ))}
            </div>
          ) : (
            <EmptyState text="No saved test-case batches yet for this project." />
          )}
        </section>
      </section>
    </>
  );
}

export function ProjectsPage() {
  const {
    projects,
    projectDetail,
    projectDraft,
    setProjectDraft,
    createProject,
    isProjectPending,
    projectError,
    saveMessage,
  } = useWorkspace();

  return (
    <section className="content-grid">
      <section className="panel">
        <SectionHeader eyebrow="Project Control" title="Create and manage workspaces" />
        <div className="stack">
          <Field
            label="Project name"
            value={projectDraft.name}
            onChange={(value) => setProjectDraft((current) => ({ ...current, name: value }))}
          />
          <TextAreaField
            label="Project description"
            value={projectDraft.description}
            onChange={(value) => setProjectDraft((current) => ({ ...current, description: value }))}
          />
          <div className="button-row">
            <button className="button" type="button" onClick={createProject} disabled={isProjectPending}>
              {isProjectPending ? "Creating..." : "Create Project"}
            </button>
            <span className="meta">{projects.length} project(s) available</span>
          </div>
          {projectError ? <p className="meta error-text">{projectError}</p> : null}
          {saveMessage ? <p className="meta success-text">{saveMessage}</p> : null}
        </div>
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Selected Project" title={projectDetail?.name ?? "No project selected"} />
        <p className="panel-lead">
          {projectDetail?.description ??
            "Pick a project from the sidebar to review its saved bug reports and test-case batches."}
        </p>
        <div className="overview-grid">
          <SummaryTile
            label="Saved bugs"
            value={String(projectDetail?.bugReports.length ?? 0)}
            helper="Structured defect records stored here"
          />
          <SummaryTile
            label="Saved batches"
            value={String(projectDetail?.testCaseBatches.length ?? 0)}
            helper="Grouped test-case generation runs"
          />
          <SummaryTile
            label="Coverage volume"
            value={String(
              projectDetail?.testCaseBatches.reduce((sum, batch) => sum + batch.cases.length, 0) ?? 0,
            )}
            helper="Total generated cases in this workspace"
          />
        </div>
      </section>
    </section>
  );
}

export function BugReportsPage() {
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
    projectDetail,
  } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | GenerateBugReportResponse["severity"]>("ALL");

  const filteredBugReports = useMemo(() => {
    const reports = projectDetail?.bugReports ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSeverity = severityFilter === "ALL" || report.severity === severityFilter;
      const matchesQuery =
        !normalizedQuery ||
        report.title.toLowerCase().includes(normalizedQuery) ||
        report.summary.toLowerCase().includes(normalizedQuery) ||
        report.actualResult.toLowerCase().includes(normalizedQuery) ||
        report.expectedResult.toLowerCase().includes(normalizedQuery);

      return matchesSeverity && matchesQuery;
    });
  }, [projectDetail?.bugReports, searchQuery, severityFilter]);

  return (
    <>
      <ActiveWorkspacePanel />
      <section className="content-grid">
        <section className="panel">
          <SectionHeader eyebrow="Generator" title="Compose bug input" />
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
              <button className="button" type="button" onClick={submitBugReport} disabled={isBugPending}>
                {isBugPending ? "Generating..." : "Generate Bug Report"}
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={regenerateBugReport}
                disabled={isBugPending}
              >
                {isBugPending ? "Refreshing..." : "Regenerate"}
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={resetBugOutput}
                disabled={!bugOutput || !bugDraftDirty}
              >
                Reset To AI Draft
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={saveBugReport}
                disabled={isSavingBug || !bugOutput}
              >
                {isSavingBug ? "Saving..." : editingBugReportId ? "Update Bug Report" : "Save Bug Report"}
              </button>
            </div>
            {bugOutput ? (
              <p className={`meta ${bugDraftDirty ? "warning-text" : "success-text"}`}>
                {editingBugReportId
                  ? bugDraftDirty
                    ? "Editing a saved bug report with unsaved changes."
                    : "Loaded saved bug report is in sync."
                  : bugDraftDirty
                    ? "Unsaved edits in current bug report draft."
                    : "Draft matches last AI generation."}
              </p>
            ) : null}
            {bugError ? <p className="meta error-text">{bugError}</p> : null}
          </div>
        </section>

        <section className="panel">
          <SectionHeader eyebrow="Output" title="Structured bug report" />
          {bugOutput ? (
            <EditableBugReport report={bugOutput} onChange={setBugOutput} />
          ) : (
            <EmptyState text="Generate a bug report to see a structured, readable draft here." />
          )}
        </section>
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Saved Bug Reports" title="Project memory" />
        <div className="toolbar-row">
          <div className="field search-field">
            <label htmlFor="bug-search">Search saved bug reports</label>
            <input
              id="bug-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title, summary, expected, actual..."
            />
          </div>
          <div className="field filter-field">
            <label htmlFor="bug-severity-filter">Severity</label>
            <select
              id="bug-severity-filter"
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(event.target.value as "ALL" | GenerateBugReportResponse["severity"])
              }
            >
              <option value="ALL">All severities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>
        {filteredBugReports.length ? (
          <div className="stack">
            {filteredBugReports.map((report) => (
              <BugReportCard key={report.id} report={report} onEdit={() => loadSavedBugReport(report)} />
            ))}
          </div>
        ) : projectDetail?.bugReports.length ? (
          <EmptyState text="No saved bug reports match the current search or severity filter." />
        ) : (
          <EmptyState text="Saved bug reports will appear here after you persist them." />
        )}
      </section>
    </>
  );
}

export function TestCasesPage() {
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
    projectDetail,
  } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<"ALL" | SavedTestCaseBatchDto["generationMode"]>("ALL");

  const filteredBatches = useMemo(() => {
    const batches = projectDetail?.testCaseBatches ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesMode = modeFilter === "ALL" || batch.generationMode === modeFilter;
      const matchesQuery =
        !normalizedQuery ||
        batch.featureTitle.toLowerCase().includes(normalizedQuery) ||
        batch.sourceRequirement.toLowerCase().includes(normalizedQuery) ||
        batch.cases.some(
          (testCase) =>
            testCase.title.toLowerCase().includes(normalizedQuery) ||
            testCase.expectedResult.toLowerCase().includes(normalizedQuery),
        );

      return matchesMode && matchesQuery;
    });
  }, [projectDetail?.testCaseBatches, searchQuery, modeFilter]);

  return (
    <>
      <ActiveWorkspacePanel />
      <section className="content-grid">
        <section className="panel">
          <SectionHeader eyebrow="Generator" title="Design coverage input" />
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
              <button className="button" type="button" onClick={submitTestCases} disabled={isTestPending}>
                {isTestPending ? "Generating..." : "Generate Test Cases"}
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={regenerateTestCases}
                disabled={isTestPending}
              >
                {isTestPending ? "Refreshing..." : "Regenerate"}
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={resetTestOutput}
                disabled={!testOutput || !testDraftDirty}
              >
                Reset To AI Draft
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={saveTestCases}
                disabled={isSavingCases || !testOutput}
              >
                {isSavingCases ? "Saving..." : editingTestCaseBatchId ? "Update Test Cases" : "Save Test Cases"}
              </button>
            </div>
            {testOutput ? (
              <p className={`meta ${testDraftDirty ? "warning-text" : "success-text"}`}>
                {editingTestCaseBatchId
                  ? testDraftDirty
                    ? "Editing a saved test case batch with unsaved changes."
                    : "Loaded saved test case batch is in sync."
                  : testDraftDirty
                    ? "Unsaved edits in current test case draft."
                    : "Draft matches last AI generation."}
              </p>
            ) : null}
            {testError ? <p className="meta error-text">{testError}</p> : null}
          </div>
        </section>

        <section className="panel">
          <SectionHeader eyebrow="Output" title="Generated coverage pack" />
          {testOutput ? (
            <EditableTestCases output={testOutput} onChange={setTestOutput} />
          ) : (
            <EmptyState text="Generate test cases to see a coverage-oriented batch here." />
          )}
        </section>
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Saved Test Batches" title="Reusable coverage history" />
        <div className="toolbar-row">
          <div className="field search-field">
            <label htmlFor="test-case-search">Search saved test batches</label>
            <input
              id="test-case-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search feature, requirement, or case title..."
            />
          </div>
          <div className="field filter-field">
            <label htmlFor="test-case-mode-filter">Generation mode</label>
            <select
              id="test-case-mode-filter"
              value={modeFilter}
              onChange={(event) =>
                setModeFilter(event.target.value as "ALL" | SavedTestCaseBatchDto["generationMode"])
              }
            >
              <option value="ALL">All modes</option>
              <option value="SMOKE">SMOKE</option>
              <option value="REGRESSION">REGRESSION</option>
              <option value="EDGE_HEAVY">EDGE_HEAVY</option>
            </select>
          </div>
        </div>
        {filteredBatches.length ? (
          <div className="stack">
            {filteredBatches.map((batch) => (
              <TestCaseBatchCard key={batch.id} batch={batch} onEdit={() => loadSavedTestCaseBatch(batch)} />
            ))}
          </div>
        ) : projectDetail?.testCaseBatches.length ? (
          <EmptyState text="No saved test case batches match the current search or mode filter." />
        ) : (
          <EmptyState text="Saved test-case batches will appear here after you persist them." />
        )}
      </section>
    </>
  );
}

function ProjectsSidebar() {
  const { projects, selectedProjectId, setSelectedProjectId, projectError, saveMessage } = useWorkspace();

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
              className={`project-row ${selectedProjectId === project.id ? "active" : ""}`}
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

function ActiveWorkspacePanel() {
  const { projectDetail } = useWorkspace();

  return (
    <section className="panel active-project-panel">
      <SectionHeader
        eyebrow="Active Workspace"
        title={projectDetail?.name ?? "Choose a project to begin"}
        trailing={<div className="status-pill">{projectDetail ? "Project selected" : "No project selected"}</div>}
      />

      <p className="panel-lead">
        {projectDetail?.description ??
          "Your selected project will show recent saved QA assets, trend hints, and quick actions here."}
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
            projectDetail?.testCaseBatches.reduce((sum, batch) => sum + batch.cases.length, 0) ?? 0,
          )}
          helper="Total generated cases attached to this workspace"
        />
      </div>
    </section>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={`nav-link ${active ? "active" : ""}`}>
      {children}
    </Link>
  );
}

function SectionHeader({
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

function MetricCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" }) {
  return (
    <div className={`metric-card ${tone === "accent" ? "accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </div>
  );
}

function EditableBugReport({
  report,
  onChange,
}: {
  report: GenerateBugReportResponse;
  onChange: React.Dispatch<React.SetStateAction<GenerateBugReportResponse | null>>;
}) {
  const updateField = <K extends keyof GenerateBugReportResponse>(
    key: K,
    value: GenerateBugReportResponse[K],
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
            onChange={(event) => updateField("severity", event.target.value as GenerateBugReportResponse["severity"])}
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
          onChange={(value) => updateField("title", value)}
        />
        <InlineArea
          label="Summary"
          value={report.summary}
          onChange={(value) => updateField("summary", value)}
          rows={4}
        />
      </div>
      <div className="checklist-card">
        <h4>Steps to reproduce</h4>
        <EditableStringList
          items={report.stepsToReproduce}
          onChange={(stepsToReproduce) => updateField("stepsToReproduce", stepsToReproduce)}
        />
      </div>
      <div className="detail-grid">
        <InlineArea
          label="Expected Result"
          value={report.expectedResult}
          onChange={(value) => updateField("expectedResult", value)}
          rows={4}
        />
        <InlineArea
          label="Actual Result"
          value={report.actualResult}
          onChange={(value) => updateField("actualResult", value)}
          rows={4}
        />
      </div>
      <div className="detail-grid">
        <InlineArea
          label="Environment"
          value={report.environmentSummary ?? ""}
          onChange={(value) => updateField("environmentSummary", value)}
          placeholder="Not specified"
          rows={3}
        />
        <EditableStringList
          label="Assumptions"
          items={report.assumptions}
          onChange={(assumptions) => updateField("assumptions", assumptions)}
        />
      </div>
    </div>
  );
}

function EditableTestCases({
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
              caseIndex === index ? updater(testCase) : testCase,
            ),
          }
        : current,
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
                  caseType: event.target.value as GeneratedTestCase["caseType"],
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
                  priority: event.target.value as GeneratedTestCase["priority"],
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
                  onChange(items.map((existing, itemIndex) => (itemIndex === index ? event.target.value : existing)))
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
        <button className="button ghost" type="button" onClick={() => onChange([...items, ""])}>
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
      <input className="inline-input" value={value} onChange={(event) => onChange(event.target.value)} />
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

function BugReportCard({
  report,
  compact = false,
  onEdit,
}: {
  report: SavedBugReportDto;
  compact?: boolean;
  onEdit?: () => void;
}) {
  return (
    <article className={`feature-card ${compact ? "compact" : ""}`}>
      <div className="card-header-inline">
        <h4>{report.title}</h4>
        <span className="severity-pill">{report.severity}</span>
      </div>
      <p>{report.summary}</p>
      <div className="detail-grid">
        <InfoCard title="Expected" body={report.expectedResult} />
        <InfoCard title="Actual" body={report.actualResult} />
      </div>
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

function TestCaseBatchCard({
  batch,
  compact = false,
  onEdit,
}: {
  batch: SavedTestCaseBatchDto;
  compact?: boolean;
  onEdit?: () => void;
}) {
  return (
    <article className={`feature-card ${compact ? "compact" : ""}`}>
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

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
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
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider.");
  }

  return context;
}
