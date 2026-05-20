'use client';

import { useMemo, useState } from 'react';

import { BugReportExportActions } from '@/components/bug-report-export-actions';
import { TestCaseExportActions } from '@/components/test-case-export-actions';
import { ServiceFailureNotice } from '@/components/service-failure-notice';
import type { TestCaseDraft } from '@/components/workspace-model';
import {
  ActiveWorkspacePanel,
  BugReportCard,
  EditableBugReport,
  EditableTestCases,
  EmptyState,
  Field,
  parseSourceAttachment,
  SectionHeader,
  SourceMaterialList,
  SummaryTile,
  TestCaseBatchCard,
  TextAreaField,
  useWorkspace,
} from '@/components/workspace';
import type {
  AIProvider,
  GenerateBugReportResponse,
  QaIntelligenceRunDto,
  SavedTestCaseBatchDto,
} from '@/types/api';

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
            <button
              className="button"
              type="button"
              onClick={createProject}
              disabled={isProjectPending}
            >
              {isProjectPending ? 'Creating...' : 'Create Project'}
            </button>
            <span className="meta">{projects.length} project(s) available</span>
          </div>
          {projectError ? <p className="meta error-text">{projectError}</p> : null}
          {saveMessage ? <p className="meta success-text">{saveMessage}</p> : null}
        </div>
      </section>

      <section className="panel">
        <SectionHeader
          eyebrow="Selected Project"
          title={projectDetail?.name ?? 'No project selected'}
        />
        <p className="panel-lead">
          {projectDetail?.description ??
            'Pick a project from the sidebar to review its saved bug reports and test-case batches.'}
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
              projectDetail?.testCaseBatches.reduce((sum, batch) => sum + batch.cases.length, 0) ??
                0
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
    selectedProvider,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<
    'ALL' | GenerateBugReportResponse['severity']
  >('ALL');

  const filteredBugReports = useMemo(() => {
    const reports = projectDetail?.bugReports ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSeverity = severityFilter === 'ALL' || report.severity === severityFilter;
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
              <button
                className="button"
                type="button"
                onClick={submitBugReport}
                disabled={isBugPending || !selectedProvider}
              >
                {isBugPending ? 'Generating...' : 'Generate Bug Report'}
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={regenerateBugReport}
                disabled={isBugPending || !selectedProvider}
              >
                {isBugPending ? 'Refreshing...' : 'Regenerate'}
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
                {isSavingBug
                  ? 'Saving...'
                  : editingBugReportId
                    ? 'Update Bug Report'
                    : 'Save Bug Report'}
              </button>
            </div>
            {bugOutput ? (
              <p className={`meta ${bugDraftDirty ? 'warning-text' : 'success-text'}`}>
                {editingBugReportId
                  ? bugDraftDirty
                    ? 'Editing a saved bug report with unsaved changes.'
                    : 'Loaded saved bug report is in sync.'
                  : bugDraftDirty
                    ? 'Unsaved edits in current bug report draft.'
                    : 'Draft matches last AI generation.'}
              </p>
            ) : null}
            {!selectedProvider ? (
              <p className="meta warning-text">
                Configure at least one AI provider in `.env.local`, then select it from the top bar.
              </p>
            ) : null}
            {bugError ? (
              <ServiceFailureNotice
                title="Bug generation failed"
                message={bugError}
                actionLabel="Retry"
                onAction={submitBugReport}
              />
            ) : null}
          </div>
        </section>

        <section className="panel">
          <SectionHeader eyebrow="Output" title="Structured bug report" />
          {bugOutput ? (
            <div className="stack">
              <BugReportExportActions
                report={{
                  title: bugOutput.title,
                  summary: bugOutput.summary,
                  severity: bugOutput.severity,
                  priority: bugOutput.priority,
                  rawInput: bugDraft.rawInput,
                  expectedResult: bugOutput.expectedResult,
                  actualResult: bugOutput.actualResult,
                  environmentSummary: bugOutput.environmentSummary,
                  stepsToReproduce: bugOutput.stepsToReproduce,
                  assumptions: bugOutput.assumptions,
                }}
                fileStem={`${bugOutput.title || 'bug-report'}-draft`}
              />
              <EditableBugReport report={bugOutput} onChange={setBugOutput} />
            </div>
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
                setSeverityFilter(
                  event.target.value as 'ALL' | GenerateBugReportResponse['severity']
                )
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
              <BugReportCard
                key={report.id}
                report={report}
                onEdit={() => loadSavedBugReport(report)}
              />
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
    selectedProvider,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | SavedTestCaseBatchDto['generationMode']>(
    'ALL'
  );
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [isMaterialPending, setIsMaterialPending] = useState(false);

  const filteredBatches = useMemo(() => {
    const batches = projectDetail?.testCaseBatches ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesMode = modeFilter === 'ALL' || batch.generationMode === modeFilter;
      const matchesQuery =
        !normalizedQuery ||
        batch.featureTitle.toLowerCase().includes(normalizedQuery) ||
        batch.sourceRequirement.toLowerCase().includes(normalizedQuery) ||
        batch.cases.some(
          (testCase) =>
            testCase.title.toLowerCase().includes(normalizedQuery) ||
            testCase.expectedResult.toLowerCase().includes(normalizedQuery)
        );

      return matchesMode && matchesQuery;
    });
  }, [projectDetail?.testCaseBatches, searchQuery, modeFilter]);

  async function handleMaterialUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    setIsMaterialPending(true);
    setMaterialError(null);

    try {
      const nextAttachments = await Promise.all(files.map(parseSourceAttachment));

      setTestCaseDraft((current) => ({
        ...current,
        attachments: [...current.attachments, ...nextAttachments].slice(0, 6),
      }));
    } catch (error) {
      setMaterialError(
        error instanceof Error ? error.message : 'Unable to read one or more files.'
      );
    } finally {
      setIsMaterialPending(false);
      event.target.value = '';
    }
  }

  function removeMaterial(attachmentId: string) {
    setTestCaseDraft((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== attachmentId),
    }));
  }

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
            <TextAreaField
              label="QA context notes"
              value={testCaseDraft.contextNotes}
              onChange={(value) =>
                setTestCaseDraft((current) => ({ ...current, contextNotes: value }))
              }
            />
            <div className="field">
              <label htmlFor="source-materials">Source material uploads</label>
              <input
                id="source-materials"
                type="file"
                multiple
                accept=".txt,.md,.csv,.json,.html,.htm,.xml,.log,.rtf,image/png,image/jpeg,image/webp,image/gif"
                onChange={handleMaterialUpload}
              />
              <p className="meta">
                Add design screenshots or text-based requirement docs. Supported today: PNG, JPG,
                WEBP, GIF, TXT, MD, CSV, JSON, HTML, XML, LOG, and RTF.
              </p>
              <p className="meta">
                {isMaterialPending
                  ? 'Reading uploaded material...'
                  : 'Up to 6 reference files per generation.'}
              </p>
            </div>
            {testCaseDraft.attachments.length ? (
              <SourceMaterialList
                attachments={testCaseDraft.attachments}
                onRemove={removeMaterial}
              />
            ) : null}
            <div className="field">
              <label htmlFor="generationMode">Generation mode</label>
              <select
                id="generationMode"
                value={testCaseDraft.generationMode}
                onChange={(event) =>
                  setTestCaseDraft((current) => ({
                    ...current,
                    generationMode: event.target.value as TestCaseDraft['generationMode'],
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
                disabled={isTestPending || !selectedProvider}
              >
                {isTestPending ? 'Generating...' : 'Generate Test Cases'}
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={regenerateTestCases}
                disabled={isTestPending || !selectedProvider}
              >
                {isTestPending ? 'Refreshing...' : 'Regenerate'}
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
                {isSavingCases
                  ? 'Saving...'
                  : editingTestCaseBatchId
                    ? 'Update Test Cases'
                    : 'Save Test Cases'}
              </button>
            </div>
            {testOutput ? (
              <p className={`meta ${testDraftDirty ? 'warning-text' : 'success-text'}`}>
                {editingTestCaseBatchId
                  ? testDraftDirty
                    ? 'Editing a saved test case batch with unsaved changes.'
                    : 'Loaded saved test case batch is in sync.'
                  : testDraftDirty
                    ? 'Unsaved edits in current test case draft.'
                    : 'Draft matches last AI generation.'}
              </p>
            ) : null}
            {!selectedProvider ? (
              <p className="meta warning-text">
                Configure at least one AI provider in `.env.local`, then select it from the top bar.
              </p>
            ) : null}
            {materialError ? <p className="meta error-text">{materialError}</p> : null}
            {testError ? (
              <ServiceFailureNotice
                title="Test generation failed"
                message={testError}
                actionLabel="Retry"
                onAction={submitTestCases}
              />
            ) : null}
          </div>
        </section>

        <section className="panel">
          <SectionHeader eyebrow="Output" title="Generated coverage pack" />
          {testOutput ? (
            <div className="stack">
              <TestCaseExportActions
                batch={{
                  featureTitle: testCaseDraft.featureTitle,
                  sourceRequirement: testCaseDraft.sourceRequirement,
                  acceptanceCriteria: testCaseDraft.acceptanceCriteria,
                  generationMode: testCaseDraft.generationMode,
                  cases: testOutput.cases,
                }}
                fileStem={`${testCaseDraft.featureTitle || 'generated'}-draft`}
              />
              <EditableTestCases output={testOutput} onChange={setTestOutput} />
            </div>
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
                setModeFilter(event.target.value as 'ALL' | SavedTestCaseBatchDto['generationMode'])
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
              <TestCaseBatchCard
                key={batch.id}
                batch={batch}
                onEdit={() => loadSavedTestCaseBatch(batch)}
              />
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

export function IntelligencePage() {
  const {
    projectDetail,
    intelligenceRuns,
    selectedRun,
    setSelectedRun,
    intelligenceError,
    isAnalyzing,
    isLoadingRuns,
    analyzeProject,
  } = useWorkspace();

  return (
    <>
      <ActiveWorkspacePanel />
      <section className="content-grid">
        <section className="panel">
          <SectionHeader
            eyebrow="QA Intelligence"
            title="Project analysis"
            trailing={
              <button className="button" type="button" onClick={analyzeProject} disabled={isAnalyzing}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze Project'}
              </button>
            }
          />
          <div className="overview-grid">
            <SummaryTile
              label="Bug inputs"
              value={String(projectDetail?.bugReports.length ?? 0)}
              helper="Saved bug reports included in analysis"
            />
            <SummaryTile
              label="Test cases"
              value={String(
                projectDetail?.testCaseBatches.reduce((sum, batch) => sum + batch.cases.length, 0) ??
                  0
              )}
              helper="Saved cases used for coverage matching"
            />
            <SummaryTile
              label="Saved runs"
              value={String(intelligenceRuns.length)}
              helper="Historical QA intelligence snapshots"
            />
          </div>
          {intelligenceError ? (
            <ServiceFailureNotice
              title="Analysis failed"
              message={intelligenceError}
              actionLabel="Retry"
              onAction={analyzeProject}
            />
          ) : null}
          {!projectDetail ? (
            <p className="meta warning-text">Select a project before running intelligence.</p>
          ) : null}
        </section>

        <section className="panel">
          <SectionHeader eyebrow="Latest Run" title="Release signal" />
          {selectedRun ? (
            <ReleaseRiskPanel run={selectedRun} />
          ) : (
            <EmptyState text="Run QA intelligence to see duplicate, gap, risk, and severity signals here." />
          )}
        </section>
      </section>

      {selectedRun ? <IntelligenceFindings run={selectedRun} /> : null}

      <section className="panel">
        <SectionHeader eyebrow="History" title="Saved analysis runs" />
        {isLoadingRuns ? <p className="meta">Loading intelligence history...</p> : null}
        {intelligenceRuns.length ? (
          <div className="stack">
            {intelligenceRuns.map((run) => (
              <button
                key={run.id}
                className={`project-row ${selectedRun?.id === run.id ? 'active' : ''}`}
                type="button"
                onClick={() => setSelectedRun(run)}
              >
                <span>
                  {run.releaseRisk.level} risk · {run.releaseRisk.score}/100
                </span>
                <small>{formatRunDate(run.createdAt)}</small>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState text="No saved QA intelligence runs yet." />
        )}
      </section>
    </>
  );
}

function ReleaseRiskPanel({ run }: { run: QaIntelligenceRunDto }) {
  return (
    <div className="stack">
      <div className="feature-card feature-highlight">
        <div className="card-header-inline">
          <div>
            <p className="eyebrow">Risk Score</p>
            <h4>
              {run.releaseRisk.score}/100 · {run.releaseRisk.level}
            </h4>
          </div>
          <span className="severity-pill">{run.releaseRisk.level}</span>
        </div>
        <p className="meta-line">
          Based on {run.inputSnapshot.bugReportCount} bug report(s),{' '}
          {run.inputSnapshot.testCaseBatchCount} test batch(es), and{' '}
          {run.inputSnapshot.testCaseCount} test case(s).
        </p>
      </div>
      <div className="detail-grid">
        <InfoList title="Top drivers" items={run.releaseRisk.drivers} />
        <InfoList title="Recommended actions" items={run.releaseRisk.recommendedActions} />
      </div>
    </div>
  );
}

function IntelligenceFindings({ run }: { run: QaIntelligenceRunDto }) {
  return (
    <section className="content-grid">
      <section className="panel">
        <SectionHeader eyebrow="Duplicates" title="Likely duplicate bugs" />
        {run.duplicateBugFindings.length ? (
          <div className="stack">
            {run.duplicateBugFindings.map((finding, index) => (
              <article key={`${finding.bugIds.join('-')}-${index}`} className="feature-card">
                <div className="card-header-inline">
                  <h4>{Math.round(finding.confidence * 100)}% confidence</h4>
                  <span className="meta-chip">{finding.matchingFields.join(', ')}</span>
                </div>
                <p>{finding.reason}</p>
                <p className="meta-line">Bug IDs: {finding.bugIds.join(', ')}</p>
                <p className="meta-line">Canonical: {finding.recommendedCanonicalBugId}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text="No likely duplicate bug reports were detected." />
        )}
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Coverage" title="Detected coverage gaps" />
        {run.coverageGapFindings.length ? (
          <div className="stack">
            {run.coverageGapFindings.map((finding, index) => (
              <article key={`${finding.title}-${index}`} className="feature-card">
                <div className="card-header-inline">
                  <h4>{finding.title}</h4>
                  <span className="meta-chip">{finding.affectedArea}</span>
                </div>
                <p>{finding.reason}</p>
                <InfoList title="Suggested tests" items={finding.suggestedTestCases} />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text="No obvious coverage gaps were detected." />
        )}
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Severity" title="Review suggestions" />
        {run.severitySuggestions.length ? (
          <div className="stack">
            {run.severitySuggestions.map((suggestion) => (
              <article key={suggestion.bugId} className="feature-card">
                <div className="card-header-inline">
                  <h4>{suggestion.title}</h4>
                  <span className="severity-pill">
                    {suggestion.currentSeverity} -&gt; {suggestion.suggestedSeverity}
                  </span>
                </div>
                <p>{suggestion.reason}</p>
                <p className="meta-line">{Math.round(suggestion.confidence * 100)}% confidence</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text="No severity changes were suggested." />
        )}
      </section>

      <section className="panel">
        <SectionHeader eyebrow="Snapshot" title="Analysis metadata" />
        <div className="overview-grid">
          <SummaryTile
            label="Duplicates"
            value={String(run.duplicateBugFindings.length)}
            helper="Likely duplicate bug pairs"
          />
          <SummaryTile
            label="Gaps"
            value={String(run.coverageGapFindings.length)}
            helper="Coverage concerns to review"
          />
          <SummaryTile
            label="Severity"
            value={String(run.severitySuggestions.length)}
            helper="Suggested severity reviews"
          />
        </div>
      </section>
    </section>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="info-card">
      <span>{title}</span>
      {items.length ? (
        <ul className="plain-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>No items.</p>
      )}
    </div>
  );
}

function formatRunDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function SettingsPage() {
  const {
    availableProviders,
    settingsDraft,
    setSettingsDraft,
    userSettings,
    isSavingSettings,
    saveSettings,
  } = useWorkspace();

  return (
    <>
      <section className="panel detail-hero">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Account and AI defaults</h2>
          </div>
          <span className="meta-chip">{userSettings?.email ?? 'Workspace account'}</span>
        </div>
        <p className="panel-lead">
          Set a friendly display name and choose the provider that should be selected by default
          whenever you open the workspace.
        </p>
      </section>

      <section className="content-grid">
        <section className="panel">
          <SectionHeader eyebrow="Profile" title="Workspace identity" />
          <div className="stack">
            <Field
              label="Display name"
              value={settingsDraft.name}
              onChange={(value) => setSettingsDraft((current) => ({ ...current, name: value }))}
            />
            <Field
              label="Email"
              value={userSettings?.email ?? ''}
              onChange={() => undefined}
              readOnly
            />
            <p className="meta">Email is currently read-only in this beta build.</p>
          </div>
        </section>

        <section className="panel">
          <SectionHeader eyebrow="AI Defaults" title="Provider preference" />
          <div className="stack">
            <div className="field">
              <label htmlFor="settings-provider">Preferred AI provider</label>
              <select
                id="settings-provider"
                value={settingsDraft.preferredProvider}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    preferredProvider: event.target.value as AIProvider | '',
                  }))
                }
              >
                <option value="">Use first configured provider</option>
                {availableProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label} · {provider.model}
                  </option>
                ))}
              </select>
            </div>
            <p className="meta">
              This only chooses the default selection. You can still switch providers anytime from
              the top bar.
            </p>
            <div className="button-row">
              <button
                className="button"
                type="button"
                onClick={saveSettings}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </section>
      </section>
    </>
  );
}
