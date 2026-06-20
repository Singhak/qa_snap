'use client';

import dynamic from 'next/dynamic';

import { EmptyState } from '@/components/workspace';

function PageLoading() {
  return <EmptyState text="Loading workspace view..." />;
}

export const LazyDashboardPage = dynamic(
  () => import('@/components/workspace-pages').then((module) => module.DashboardPage),
  { loading: PageLoading }
);

export const LazyProjectsPage = dynamic(
  () => import('@/components/workspace-pages').then((module) => module.ProjectsPage),
  { loading: PageLoading }
);

export const LazyBugReportsPage = dynamic(
  () => import('@/components/workspace-pages').then((module) => module.BugReportsPage),
  { loading: PageLoading }
);

export const LazyTestCasesPage = dynamic(
  () => import('@/components/workspace-pages').then((module) => module.TestCasesPage),
  { loading: PageLoading }
);

export const LazyIntelligencePage = dynamic(
  () => import('@/components/workspace-pages').then((module) => module.IntelligencePage),
  { loading: PageLoading }
);

export const LazySettingsPage = dynamic(
  () => import('@/components/workspace-pages').then((module) => module.SettingsPage),
  { loading: PageLoading }
);

export const LazyAcceptanceCriteriaPage = dynamic(
  () => import('@/components/workspace-pages').then((module) => module.AcceptanceCriteriaPage),
  { loading: PageLoading }
);
