'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { fetchJson, getApiErrorMessage } from '@/lib/api/client';
import type { CreateProjectRequest, ProjectDetailDto, ProjectDto } from '@/types/api';

export function useProjects(args: { defaultProjectDraft: CreateProjectRequest }) {
  const queryClient = useQueryClient();
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectDetail, setProjectDetail] = useState<ProjectDetailDto | null>(null);
  const [projectDraft, setProjectDraft] = useState<CreateProjectRequest>(args.defaultProjectDraft);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isBootstrapping, startBootstrapTransition] = useTransition();
  const [isProjectPending, startProjectTransition] = useTransition();
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchJson<ProjectDto[]>('/api/projects', { cache: 'no-store' }),
  });
  const projectDetailQuery = useQuery({
    queryKey: ['project-detail', selectedProjectId],
    queryFn: () =>
      fetchJson<ProjectDetailDto>(`/api/projects/${selectedProjectId}`, { cache: 'no-store' }),
    enabled: Boolean(selectedProjectId),
  });

  useEffect(() => {
    if (!projectsQuery.data) {
      return;
    }

    setProjects(projectsQuery.data);
    setSelectedProjectId((current) =>
      current && projectsQuery.data.some((project) => project.id === current)
        ? current
        : (projectsQuery.data[0]?.id ?? '')
    );
    setProjectError(null);
  }, [projectsQuery.data]);

  useEffect(() => {
    if (projectsQuery.error instanceof Error) {
      setProjectError(projectsQuery.error.message);
    }
  }, [projectsQuery.error]);

  useEffect(() => {
    if (projectDetailQuery.data) {
      setProjectDetail(projectDetailQuery.data);
      setProjectError(null);
      return;
    }

    if (!selectedProjectId) {
      setProjectDetail(null);
    }
  }, [projectDetailQuery.data, selectedProjectId]);

  useEffect(() => {
    if (projectDetailQuery.error instanceof Error) {
      setProjectError(projectDetailQuery.error.message);
    }
  }, [projectDetailQuery.error]);

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
      totalBugReports === 0 ? 'Quiet build' : totalBugReports <= 2 ? 'Watchlist' : 'Needs review';

    return { totalProjects, totalBugReports, totalTestCases, releaseSignal };
  }, [projectDetail, projects]);

  async function refreshProjects(nextProjectId?: string) {
    const projectList = await queryClient.fetchQuery({
      queryKey: ['projects'],
      queryFn: () => fetchJson<ProjectDto[]>('/api/projects', { cache: 'no-store' }),
    });
    setProjects(projectList);

    const preferredProjectId =
      nextProjectId ??
      (projectList.some((project) => project.id === selectedProjectId)
        ? selectedProjectId
        : (projectList[0]?.id ?? ''));

    setSelectedProjectId(preferredProjectId);
    setProjectError(null);
  }

  async function refreshProjectDetail(projectId: string) {
    const detail = await queryClient.fetchQuery({
      queryKey: ['project-detail', projectId],
      queryFn: () => fetchJson<ProjectDetailDto>(`/api/projects/${projectId}`, { cache: 'no-store' }),
    });
    setProjectDetail(detail);
    setProjectError(null);
  }

  async function createProject() {
    setProjectError(null);
    setSaveMessage(null);

    return new Promise<void>((resolve) => {
      startProjectTransition(async () => {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectDraft),
        });
        const data = await response.json();

        if (!response.ok) {
          setProjectError(getApiErrorMessage(data, 'Unable to create project.'));
          resolve();
          return;
        }

        const project = data as ProjectDto;
        await queryClient.invalidateQueries({ queryKey: ['projects'] });
        await refreshProjects(project.id);
        await queryClient.invalidateQueries({ queryKey: ['project-detail', project.id] });
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
