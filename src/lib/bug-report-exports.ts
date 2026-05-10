import type { SavedBugReportDto } from "@/types/api";

type BugReportLike = Pick<
  SavedBugReportDto,
  | "title"
  | "summary"
  | "severity"
  | "priority"
  | "rawInput"
  | "expectedResult"
  | "actualResult"
  | "environmentSummary"
  | "stepsToReproduce"
  | "assumptions"
>;

export function formatBugReportAsJson(report: BugReportLike) {
  return JSON.stringify(report, null, 2);
}

export function formatBugReportAsMarkdown(report: BugReportLike) {
  return [
    `# ${report.title}`,
    "",
    `- Severity: ${report.severity}`,
    `- Priority: ${report.priority ?? "Not set"}`,
    `- Environment: ${report.environmentSummary ?? "Not specified"}`,
    "",
    "## Summary",
    "",
    report.summary,
    "",
    "## Raw Notes",
    "",
    report.rawInput,
    "",
    "## Steps To Reproduce",
    "",
    ...report.stepsToReproduce.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## Expected Result",
    "",
    report.expectedResult,
    "",
    "## Actual Result",
    "",
    report.actualResult,
    "",
    "## Assumptions",
    "",
    ...(report.assumptions.length ? report.assumptions.map((item) => `- ${item}`) : ["- None"]),
  ].join("\n");
}

export function formatBugReportAsCsv(report: BugReportLike) {
  const headers = [
    "Title",
    "Severity",
    "Priority",
    "Environment",
    "Summary",
    "Raw Notes",
    "Steps To Reproduce",
    "Expected Result",
    "Actual Result",
    "Assumptions",
  ];
  const row = [
    report.title,
    report.severity,
    report.priority ?? "",
    report.environmentSummary ?? "",
    report.summary,
    report.rawInput,
    report.stepsToReproduce.join(" | "),
    report.expectedResult,
    report.actualResult,
    report.assumptions.join(" | "),
  ];

  return [headers, row].map((line) => line.map(escapeCsvCell).join(",")).join("\n");
}

function escapeCsvCell(value: string) {
  const normalized = String(value ?? "");
  const escaped = normalized.replaceAll("\"", "\"\"");

  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}
