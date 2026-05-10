import Link from "next/link";

import { BugReportExportActions } from "@/components/bug-report-export-actions";
import { TestCaseExportActions } from "@/components/test-case-export-actions";
import type { SavedBugReportDto, SavedTestCaseBatchDto } from "@/types/api";

export function BugReportDetailView({ report }: { report: SavedBugReportDto }) {
  return (
    <div className="workspace-stack">
      <section className="panel detail-hero">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Saved Bug Report</p>
            <h2>{report.title}</h2>
          </div>
          <span className="severity-pill">{report.severity}</span>
        </div>
        <p className="panel-lead">{report.summary}</p>
        <div className="button-row">
          <Link href="/bug-reports" className="button secondary">
            Back To Bug Reports
          </Link>
          <Link href={`/projects`} className="button ghost">
            Open Projects
          </Link>
        </div>
        <BugReportExportActions report={report} fileStem={report.title} />
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Expected Vs Actual</p>
              <h3>Behavior summary</h3>
            </div>
          </div>
          <div className="detail-grid">
            <InfoBlock title="Expected Result" body={report.expectedResult} />
            <InfoBlock title="Actual Result" body={report.actualResult} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Context</p>
              <h3>Environment and notes</h3>
            </div>
          </div>
          <div className="detail-grid">
            <InfoBlock title="Environment" body={report.environmentSummary ?? "Not specified"} />
            <InfoBlock title="Raw Notes" body={report.rawInput} />
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Reproduction</p>
            <h3>Steps to reproduce</h3>
          </div>
        </div>
        <ol className="ordered-list">
          {report.stepsToReproduce.map((step, index) => (
            <li key={`${step}-${index}`}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Assumptions</p>
            <h3>AI and tester caveats</h3>
          </div>
        </div>
        {report.assumptions.length ? (
          <ul className="plain-list">
            {report.assumptions.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="meta">No assumptions were stored for this bug report.</p>
        )}
      </section>
    </div>
  );
}

export function TestCaseBatchDetailView({ batch }: { batch: SavedTestCaseBatchDto }) {
  return (
    <div className="workspace-stack">
      <section className="panel detail-hero">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Saved Test Case Batch</p>
            <h2>{batch.featureTitle}</h2>
          </div>
          <span className="meta-chip">{batch.generationMode}</span>
        </div>
        <p className="panel-lead">{batch.sourceRequirement}</p>
        <div className="button-row">
          <Link href="/test-cases" className="button secondary">
            Back To Test Cases
          </Link>
          <Link href="/projects" className="button ghost">
            Open Projects
          </Link>
        </div>
        <TestCaseExportActions batch={batch} fileStem={batch.featureTitle} />
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Requirement</p>
              <h3>Coverage source</h3>
            </div>
          </div>
          <InfoBlock title="Requirement" body={batch.sourceRequirement} />
          <InfoBlock title="Acceptance Criteria" body={batch.acceptanceCriteria ?? "Not specified"} />
          <InfoBlock title="QA Context Notes" body={batch.contextNotes ?? "Not specified"} />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Batch Facts</p>
              <h3>Execution snapshot</h3>
            </div>
          </div>
          <div className="detail-grid">
            <InfoBlock title="Generation Mode" body={batch.generationMode} />
            <InfoBlock title="Case Count" body={String(batch.cases.length)} />
            <InfoBlock title="AI Provider" body={batch.provider ?? "Not captured"} />
          </div>
        </section>
      </section>

      {batch.sourceMaterials?.length ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Source Material</p>
              <h3>Saved requirement inputs</h3>
            </div>
          </div>
          <div className="stack">
            {batch.sourceMaterials.map((attachment) => (
              <article key={attachment.id} className="feature-card compact">
                <div className="card-header-inline">
                  <h4>{attachment.name}</h4>
                  <span className="meta-chip">{attachment.kind}</span>
                </div>
                <p className="meta-line">{attachment.mimeType}</p>
                <p className="meta-line">
                  {attachment.kind === "TEXT"
                    ? truncateSourcePreview(attachment.textContent ?? "")
                    : "Image reference saved with this batch."}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Cases</p>
            <h3>Saved manual coverage</h3>
          </div>
        </div>
        <div className="stack">
          {batch.cases.map((testCase, index) => (
            <article key={`${testCase.title}-${index}`} className="feature-card">
              <div className="card-header-inline">
                <h4>{testCase.title}</h4>
                <div className="button-row">
                  <span className="meta-chip">{testCase.caseType}</span>
                  <span className="severity-pill">{testCase.priority}</span>
                </div>
              </div>
              <div className="detail-grid">
                <InfoBlock
                  title="Preconditions"
                  body={testCase.preconditions.length ? testCase.preconditions.join("\n") : "No special preconditions"}
                />
                <InfoBlock title="Expected Result" body={testCase.expectedResult} />
              </div>
              <div className="checklist-card muted">
                <h4>Execution Steps</h4>
                <ol className="ordered-list">
                  {testCase.steps.map((step, stepIndex) => (
                    <li key={`${step}-${stepIndex}`}>{step}</li>
                  ))}
                </ol>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="info-card">
      <span>{title}</span>
      <p>{body}</p>
    </div>
  );
}

function truncateSourcePreview(value: string) {
  return value.length > 220 ? `${value.slice(0, 220)}...` : value || "No preview available.";
}
