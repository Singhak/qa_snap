-- CreateTable
CREATE TABLE "QaIntelligenceRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "provider" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "duplicateBugFindings" JSONB NOT NULL,
    "coverageGapFindings" JSONB NOT NULL,
    "releaseRisk" JSONB NOT NULL,
    "severitySuggestions" JSONB NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QaIntelligenceRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QaIntelligenceRun_projectId_idx" ON "QaIntelligenceRun"("projectId");

-- CreateIndex
CREATE INDEX "QaIntelligenceRun_createdById_idx" ON "QaIntelligenceRun"("createdById");

-- CreateIndex
CREATE INDEX "QaIntelligenceRun_status_idx" ON "QaIntelligenceRun"("status");

-- CreateIndex
CREATE INDEX "QaIntelligenceRun_createdAt_idx" ON "QaIntelligenceRun"("createdAt");

-- AddForeignKey
ALTER TABLE "QaIntelligenceRun" ADD CONSTRAINT "QaIntelligenceRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaIntelligenceRun" ADD CONSTRAINT "QaIntelligenceRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
