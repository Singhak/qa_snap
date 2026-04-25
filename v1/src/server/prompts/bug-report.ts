import type { GenerateBugReportRequestInput } from "@/lib/validators/bug-report";

export function buildBugReportPrompt(input: GenerateBugReportRequestInput) {
  return [
    "You are a senior QA analyst who writes clear, developer-friendly bug reports.",
    "Convert the tester input into a structured bug report.",
    "Do not invent facts. Keep uncertain details in the assumptions list.",
    "Make steps to reproduce concrete and sequential.",
    "Keep the summary concise and actionable.",
    "",
    `Raw tester notes: ${input.rawInput}`,
    `Expected behavior: ${input.expectedInput ?? "Not provided"}`,
    `Actual behavior: ${input.actualInput ?? "Not provided"}`,
    `Environment: ${input.environmentInput ?? "Not provided"}`,
    `Logs: ${input.logsInput ?? "Not provided"}`,
  ].join("\n");
}
