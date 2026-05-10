'use client';

import { useMemo, useState, useTransition } from 'react';

import { getApiErrorMessage } from '@/lib/api/client';
import type { AIProvider, SavedTestCaseBatchDto } from '@/types/api';
import type { TestCaseDraft, TestOutput } from '@/components/workspace-model';

export function useTestGenerator(args: {
  defaultTestCaseDraft: TestCaseDraft;
  selectedProjectId: string;
  selectedProvider: AIProvider | '';
  refreshProjectDetail: (projectId: string) => Promise<void>;
  setSelectedProjectId: (projectId: string) => void;
  setSelectedProvider: React.Dispatch<React.SetStateAction<AIProvider | ''>>;
  setSaveMessage: (message: string | null) => void;
}) {
  const [testCaseDraft, setTestCaseDraft] = useState<TestCaseDraft>(args.defaultTestCaseDraft);
  const [testOutput, setTestOutput] = useState<TestOutput>(null);
  const [generatedTestSnapshot, setGeneratedTestSnapshot] = useState<TestOutput>(null);
  const [editingTestCaseBatchId, setEditingTestCaseBatchId] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isTestPending, startTestTransition] = useTransition();
  const [isSavingCases, startSaveCasesTransition] = useTransition();

  const testDraftDirty = useMemo(
    () => JSON.stringify(testOutput) !== JSON.stringify(generatedTestSnapshot),
    [testOutput, generatedTestSnapshot]
  );

  async function submitTestCases() {
    if (!args.selectedProjectId) {
      setTestError('Create or select a project before generating.');
      return;
    }

    setTestError(null);
    args.setSaveMessage(null);

    return new Promise<void>((resolve) => {
      startTestTransition(async () => {
        const response = await fetch('/api/test-cases/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...testCaseDraft,
            projectId: args.selectedProjectId,
            provider: args.selectedProvider || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setTestOutput(null);
          setGeneratedTestSnapshot(null);
          setTestError(getApiErrorMessage(data, 'Test case generation failed.'));
          resolve();
          return;
        }

        setTestOutput(data);
        setGeneratedTestSnapshot(data);
        setEditingTestCaseBatchId(null);
        resolve();
      });
    });
  }

  async function saveTestCases() {
    if (!args.selectedProjectId || !testOutput) {
      setTestError('Generate test cases before saving.');
      return;
    }

    setTestError(null);
    args.setSaveMessage(null);

    return new Promise<void>((resolve) => {
      startSaveCasesTransition(async () => {
        const response = await fetch(
          editingTestCaseBatchId ? `/api/test-cases/${editingTestCaseBatchId}` : '/api/test-cases',
          {
            method: editingTestCaseBatchId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...testCaseDraft,
              projectId: args.selectedProjectId,
              provider: args.selectedProvider || undefined,
              cases: testOutput.cases,
            }),
          }
        );
        const data = await response.json();

        if (!response.ok) {
          setTestError(getApiErrorMessage(data, 'Unable to save test cases.'));
          resolve();
          return;
        }

        await args.refreshProjectDetail(args.selectedProjectId);
        const batch = data as SavedTestCaseBatchDto;
        setEditingTestCaseBatchId(batch.id);
        setGeneratedTestSnapshot({ cases: batch.cases });
        args.setSaveMessage(
          `${editingTestCaseBatchId ? 'Updated' : 'Saved'} ${batch.cases.length} test cases for "${batch.featureTitle}".`
        );
        resolve();
      });
    });
  }

  function loadSavedTestCaseBatch(batch: SavedTestCaseBatchDto) {
    args.setSelectedProjectId(batch.projectId);
    if (batch.provider) {
      args.setSelectedProvider(batch.provider);
    }

    setTestCaseDraft({
      featureTitle: batch.featureTitle,
      sourceRequirement: batch.sourceRequirement,
      acceptanceCriteria: batch.acceptanceCriteria ?? '',
      contextNotes: batch.contextNotes ?? '',
      generationMode: batch.generationMode,
      attachments: batch.sourceMaterials ?? [],
    });

    const output = { cases: batch.cases };
    setTestOutput(output);
    setGeneratedTestSnapshot(output);
    setEditingTestCaseBatchId(batch.id);
  }

  return {
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
    regenerateTestCases: submitTestCases,
    resetTestOutput: () => setTestOutput(generatedTestSnapshot),
    loadSavedTestCaseBatch,
    saveTestCases,
  };
}
