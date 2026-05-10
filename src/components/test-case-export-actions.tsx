"use client";

import { useState, useTransition } from "react";

import {
  formatTestCaseBatchAsCsv,
  formatTestCaseBatchAsJson,
  formatTestCaseBatchAsMarkdown,
} from "@/lib/test-case-exports";
import type { GeneratedTestCase } from "@/types/api";

type ExportBatchLike = {
  featureTitle: string;
  sourceRequirement: string;
  acceptanceCriteria?: string | null;
  generationMode: string;
  cases: GeneratedTestCase[];
};

export function TestCaseExportActions({
  batch,
  fileStem,
}: {
  batch: ExportBatchLike;
  fileStem?: string;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const normalizedStem = sanitizeFileStem(fileStem ?? batch.featureTitle ?? "test-cases");

  async function copyMarkdown() {
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(formatTestCaseBatchAsMarkdown(batch));
        setFeedback("Markdown copied to clipboard.");
      } catch {
        setFeedback("Clipboard copy failed in this browser.");
      }
    });
  }

  function downloadFile(kind: "csv" | "json" | "md") {
    const content =
      kind === "csv"
        ? formatTestCaseBatchAsCsv(batch)
        : kind === "json"
          ? formatTestCaseBatchAsJson(batch)
          : formatTestCaseBatchAsMarkdown(batch);

    const mimeType =
      kind === "csv" ? "text/csv;charset=utf-8" : kind === "json" ? "application/json;charset=utf-8" : "text/markdown;charset=utf-8";

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${normalizedStem}.${kind}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setFeedback(`Downloaded ${kind.toUpperCase()} export.`);
  }

  return (
    <div className="export-actions">
      <div className="button-row">
        <button className="button secondary" type="button" onClick={() => downloadFile("csv")}>
          Download CSV
        </button>
        <button className="button ghost" type="button" onClick={() => downloadFile("json")}>
          Download JSON
        </button>
        <button className="button ghost" type="button" onClick={() => downloadFile("md")}>
          Download Markdown
        </button>
        <button className="button ghost" type="button" onClick={copyMarkdown} disabled={isPending}>
          {isPending ? "Copying..." : "Copy Markdown"}
        </button>
      </div>
      {feedback ? <p className="meta success-text">{feedback}</p> : null}
    </div>
  );
}

function sanitizeFileStem(value: string) {
  const stem = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return stem || "test-cases";
}
