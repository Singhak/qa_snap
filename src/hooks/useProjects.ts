"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { getApiErrorMessage } from "@/lib/api/client";
import type { CreateProjectRequest, ProjectDetailDto, ProjectDto } from "@/types/api";

export function useProjects(args: { defaultProjectDraft: CreateProjectRequest }) {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectDetail, setProjectDetail] = useState<ProjectDetailDto | null>(null);
  const [projectDraft, setProjectDraft] = useState<CreateProjectRequest>(args.defaultProjectDraft);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isBootstrapping, startBootstrapTransition] = useTransition();
  const [isProjectPending, startProjectTransition] = useTransition();

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

  async function refreshProjects(nextProjectId?: string) {
    const response = await fetch("/api/projects", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setProjectError(getApiErrorMessage(data, "Unable to load projects."));
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
      setProjectError(getApiErrorMessage(data, "Unable to load project details."));
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
          setProjectError(getApiErrorMessage(data, "Unable to create project."));
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

  return {
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
  };
}
