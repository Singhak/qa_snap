import type { GeneratedTestCase, SavedTestCaseBatchDto } from "@/types/api";

type ExportBatchLike = {
  featureTitle: string;
  sourceRequirement: string;
  acceptanceCriteria?: string | null;
  generationMode: string;
  cases: GeneratedTestCase[];
};

export function buildExportBatch(batch: ExportBatchLike): SavedTestCaseBatchDto {
  return {
    id: "unsaved",
    projectId: "unsaved",
    featureTitle: batch.featureTitle,
    sourceRequirement: batch.sourceRequirement,
    acceptanceCriteria: batch.acceptanceCriteria ?? null,
    generationMode: batch.generationMode as SavedTestCaseBatchDto["generationMode"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cases: batch.cases,
  };
}

export function formatTestCaseBatchAsJson(batch: ExportBatchLike) {
  return JSON.stringify(batch, null, 2);
}

export function formatTestCaseBatchAsMarkdown(batch: ExportBatchLike) {
  const sections = [
    `# ${batch.featureTitle}`,
    "",
    `- Generation Mode: ${batch.generationMode}`,
    `- Case Count: ${batch.cases.length}`,
    "",
    "## Requirement",
    "",
    batch.sourceRequirement,
    "",
    "## Acceptance Criteria",
    "",
    batch.acceptanceCriteria?.trim() ? batch.acceptanceCriteria : "Not specified",
    "",
    "## Test Cases",
    "",
  ];

  const caseBlocks = batch.cases.flatMap((testCase, index) => [
    `### ${index + 1}. ${testCase.title}`,
    "",
    `- Type: ${testCase.caseType}`,
    `- Priority: ${testCase.priority}`,
    `- Tags: ${testCase.tags?.length ? testCase.tags.join(", ") : "None"}`,
    "",
    "Preconditions:",
    ...listOrFallback(testCase.preconditions),
    "",
    "Steps:",
    ...numberedListOrFallback(testCase.steps),
    "",
    "Expected Result:",
    testCase.expectedResult,
    "",
  ]);

  return [...sections, ...caseBlocks].join("\n");
}

export function formatTestCaseBatchAsCsv(batch: ExportBatchLike) {
  const rows = [
    [
      "Feature Title",
      "Generation Mode",
      "Requirement",
      "Acceptance Criteria",
      "Case Title",
      "Case Type",
      "Priority",
      "Preconditions",
      "Steps",
      "Expected Result",
      "Tags",
    ],
    ...batch.cases.map((testCase) => [
      batch.featureTitle,
      batch.generationMode,
      batch.sourceRequirement,
      batch.acceptanceCriteria ?? "",
      testCase.title,
      testCase.caseType,
      testCase.priority,
      testCase.preconditions.join(" | "),
      testCase.steps.join(" | "),
      testCase.expectedResult,
      testCase.tags?.join(" | ") ?? "",
    ]),
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function escapeCsvCell(value: string) {
  const normalized = String(value ?? "");
  const escaped = normalized.replaceAll("\"", "\"\"");

  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

function listOrFallback(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`) : ["- None"];
}

function numberedListOrFallback(items: string[]) {
  return items.length ? items.map((item, index) => `${index + 1}. ${item}`) : ["1. No steps provided"];
}
