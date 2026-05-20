'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useTransition } from 'react';

import { fetchJson, getApiErrorMessage } from '@/lib/api/client';
import type { AIProvider, QaIntelligenceRunDto } from '@/types/api';

export function useQaIntelligence({
  selectedProjectId,
  selectedProvider,
}: {
  selectedProjectId: string;
  selectedProvider: AIProvider | '';
}) {
  const queryClient = useQueryClient();
  const [intelligenceRuns, setIntelligenceRuns] = useState<QaIntelligenceRunDto[]>([]);
  const [selectedRun, setSelectedRun] = useState<QaIntelligenceRunDto | null>(null);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);
  const [isAnalyzing, startAnalyzeTransition] = useTransition();
  const [isLoadingRuns, startLoadTransition] = useTransition();
  const intelligenceRunsQuery = useQuery({
    queryKey: ['qa-intelligence-runs', selectedProjectId],
    queryFn: () =>
      fetchJson<QaIntelligenceRunDto[]>(`/api/projects/${selectedProjectId}/intelligence`, {
        cache: 'no-store',
      }),
    enabled: Boolean(selectedProjectId),
  });

  useEffect(() => {
    if (!intelligenceRunsQuery.data) {
      return;
    }

    const runs = intelligenceRunsQuery.data;
    setIntelligenceRuns(runs);
    setSelectedRun((current) =>
      current && runs.some((run) => run.id === current.id) ? current : (runs[0] ?? null)
    );
    setIntelligenceError(null);
  }, [intelligenceRunsQuery.data]);

  useEffect(() => {
    if (intelligenceRunsQuery.error instanceof Error) {
      setIntelligenceError(intelligenceRunsQuery.error.message);
    }
  }, [intelligenceRunsQuery.error]);

  useEffect(() => {
    if (!selectedProjectId) {
      setIntelligenceRuns([]);
      setSelectedRun(null);
      return;
    }

    startLoadTransition(async () => {
      await refreshIntelligenceRuns(selectedProjectId);
    });
  }, [selectedProjectId]);

  async function refreshIntelligenceRuns(projectId = selectedProjectId) {
    if (!projectId) {
      return;
    }

    const runs = await queryClient.fetchQuery({
      queryKey: ['qa-intelligence-runs', projectId],
      queryFn: () =>
        fetchJson<QaIntelligenceRunDto[]>(`/api/projects/${projectId}/intelligence`, {
          cache: 'no-store',
        }),
    });
    setIntelligenceRuns(runs);
    setSelectedRun((current) =>
      current && runs.some((run) => run.id === current.id) ? current : (runs[0] ?? null)
    );
    setIntelligenceError(null);
  }

  async function analyzeProject() {
    setIntelligenceError(null);

    return new Promise<void>((resolve) => {
      startAnalyzeTransition(async () => {
        if (!selectedProjectId) {
          setIntelligenceError('Select a project before running QA intelligence.');
          resolve();
          return;
        }

        const response = await fetch(`/api/projects/${selectedProjectId}/intelligence/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: selectedProvider || undefined,
            mode: 'FULL_PROJECT',
            useAiEnrichment: false,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          setIntelligenceError(getApiErrorMessage(data, 'Unable to analyze QA intelligence.'));
          resolve();
          return;
        }

        const run = data as QaIntelligenceRunDto;
        queryClient.setQueryData<QaIntelligenceRunDto[]>(
          ['qa-intelligence-runs', selectedProjectId],
          (current) => [run, ...(current ?? []).filter((item) => item.id !== run.id)]
        );
        setSelectedRun(run);
        setIntelligenceRuns((current) => [run, ...current.filter((item) => item.id !== run.id)]);
        resolve();
      });
    });
  }

  return {
    intelligenceRuns,
    selectedRun,
    setSelectedRun,
    intelligenceError,
    isAnalyzing,
    isLoadingRuns,
    analyzeProject,
    refreshIntelligenceRuns,
  };
}
