"use client";

import { useMemo, useState, useTransition } from "react";

import { getApiErrorMessage } from "@/lib/api/client";
import type { AIProvider, SavedBugReportDto } from "@/types/api";
import type { BugDraft, BugOutput } from "@/components/workspace-model";

export function useBugGenerator(args: {
  defaultBugDraft: BugDraft;
  selectedProjectId: string;
  selectedProvider: AIProvider | "";
  refreshProjectDetail: (projectId: string) => Promise<void>;
  setSelectedProjectId: (projectId: string) => void;
  setSaveMessage: (message: string | null) => void;
}) {
  const [bugDraft, setBugDraft] = useState<BugDraft>(args.defaultBugDraft);
  const [bugOutput, setBugOutput] = useState<BugOutput>(null);
  const [generatedBugSnapshot, setGeneratedBugSnapshot] = useState<BugOutput>(null);
  const [editingBugReportId, setEditingBugReportId] = useState<string | null>(null);
  const [bugError, setBugError] = useState<string | null>(null);
  const [isBugPending, startBugTransition] = useTransition();
  const [isSavingBug, startSaveBugTransition] = useTransition();

  const bugDraftDirty = useMemo(
    () => JSON.stringify(bugOutput) !== JSON.stringify(generatedBugSnapshot),
    [bugOutput, generatedBugSnapshot],
  );

  async function submitBugReport() {
    if (!args.selectedProjectId) {
      setBugError("Create or select a project before generating.");
      return;
    }

    setBugError(null);
    args.setSaveMessage(null);

    return new Promise<void>((resolve) => {
      startBugTransition(async () => {
        const response = await fetch("/api/bug-reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...bugDraft,
            projectId: args.selectedProjectId,
            provider: args.selectedProvider || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setBugOutput(null);
          setGeneratedBugSnapshot(null);
          setBugError(getApiErrorMessage(data, "Bug report generation failed."));
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

  async function saveBugReport() {
    if (!args.selectedProjectId || !bugOutput) {
      setBugError("Generate a bug report before saving.");
      return;
    }

    setBugError(null);
    args.setSaveMessage(null);

    return new Promise<void>((resolve) => {
      startSaveBugTransition(async () => {
        const response = await fetch(
          editingBugReportId ? `/api/bug-reports/${editingBugReportId}` : "/api/bug-reports",
          {
            method: editingBugReportId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...bugDraft,
              ...bugOutput,
              projectId: args.selectedProjectId,
            }),
          },
        );
        const data = await response.json();

        if (!response.ok) {
          setBugError(getApiErrorMessage(data, "Unable to save bug report."));
          resolve();
          return;
        }

        await args.refreshProjectDetail(args.selectedProjectId);
        const report = data as SavedBugReportDto;
        setEditingBugReportId(report.id);
        setGeneratedBugSnapshot({
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
        });
        args.setSaveMessage(`${editingBugReportId ? "Updated" : "Saved"} bug report "${report.title}".`);
        resolve();
      });
    });
  }

  function loadSavedBugReport(report: SavedBugReportDto) {
    args.setSelectedProjectId(report.projectId);
    setBugDraft({
      rawInput: report.rawInput,
      expectedInput: report.expectedInput ?? "",
      actualInput: report.actualInput ?? "",
      environmentInput: report.environmentInput ?? "",
      logsInput: report.logsInput ?? "",
    });

    const output = {
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

  return {
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
    regenerateBugReport: submitBugReport,
    resetBugOutput: () => setBugOutput(generatedBugSnapshot),
    loadSavedBugReport,
    saveBugReport,
  };
}
