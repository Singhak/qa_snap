export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type CaseType = 'POSITIVE' | 'NEGATIVE' | 'EDGE' | 'BOUNDARY';
export type GenerationMode = 'SMOKE' | 'REGRESSION' | 'EDGE_HEAVY';

export interface GenerateBugReportRequest {
  projectId: string;
  rawInput: string;
  expectedInput?: string;
  actualInput?: string;
  environmentInput?: string;
  logsInput?: string;
}

export interface GenerateBugReportResponse {
  title: string;
  summary: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  severity: Severity;
  priority?: Priority;
  environmentSummary?: string;
  assumptions: string[];
  confidenceScore?: number;
}

export interface SaveBugReportRequest extends GenerateBugReportRequest, GenerateBugReportResponse {}

export interface GenerateTestCasesRequest {
  projectId: string;
  featureTitle: string;
  sourceRequirement: string;
  acceptanceCriteria?: string;
  generationMode: GenerationMode;
}

export interface GeneratedTestCase {
  title: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  priority: Priority;
  caseType: CaseType;
  tags?: string[];
}

export interface GenerateTestCasesResponse {
  cases: GeneratedTestCase[];
}

export interface SaveTestCaseBatchRequest extends GenerateTestCasesRequest {
  cases: GeneratedTestCase[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedBugReportDto extends GenerateBugReportResponse {
  id: string;
  projectId: string;
  rawInput: string;
  expectedInput?: string | null;
  actualInput?: string | null;
  environmentInput?: string | null;
  logsInput?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedTestCaseBatchDto {
  id: string;
  projectId: string;
  featureTitle: string;
  sourceRequirement: string;
  acceptanceCriteria?: string | null;
  generationMode: GenerationMode;
  createdAt: string;
  updatedAt: string;
  cases: GeneratedTestCase[];
}

export interface ProjectDetailDto extends ProjectDto {
  bugReports: SavedBugReportDto[];
  testCaseBatches: SavedTestCaseBatchDto[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
