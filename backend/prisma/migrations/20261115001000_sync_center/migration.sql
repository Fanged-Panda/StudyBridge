-- DropIndex
DROP INDEX "Professor_name_universityId_key";

-- AlterTable
ALTER TABLE "University" ADD COLUMN     "adminVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "nextSyncAt" TIMESTAMP(3),
ADD COLUMN     "professorsNextSyncAt" TIMESTAMP(3),
ADD COLUMN     "syncError" TEXT,
ADD COLUMN     "syncStatus" VARCHAR(30);

-- AlterTable
ALTER TABLE "Professor" ADD COLUMN     "adminVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "citedByCount" INTEGER,
ADD COLUMN     "hIndex" INTEGER,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "metricsUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "nextSyncAt" TIMESTAMP(3),
ADD COLUMN     "openAlexId" VARCHAR(300),
ADD COLUMN     "syncError" TEXT,
ADD COLUMN     "syncStatus" VARCHAR(30),
ADD COLUMN     "topics" JSONB,
ADD COLUMN     "worksCount" INTEGER;

-- AlterTable
ALTER TABLE "Scholarship" ADD COLUMN     "adminVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "contentHash" VARCHAR(64),
ADD COLUMN     "lastExtractedAt" TIMESTAMP(3),
ADD COLUMN     "lastFetchedAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "nextSyncAt" TIMESTAMP(3),
ADD COLUMN     "sourceName" VARCHAR(160),
ADD COLUMN     "sourceUrl" VARCHAR(500),
ADD COLUMN     "status" VARCHAR(30) NOT NULL DEFAULT 'NEEDS_VERIFICATION',
ADD COLUMN     "syncError" TEXT,
ADD COLUMN     "syncStatus" VARCHAR(30);

-- CreateTable
CREATE TABLE "ScholarshipSource" (
    "id" TEXT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "name" VARCHAR(160),
    "country" VARCHAR(100),
    "contentHash" VARCHAR(64),
    "lastFetchedHash" VARCHAR(64),
    "lastFetchedAt" TIMESTAMP(3),
    "lastExtractedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "lastChangedAt" TIMESTAMP(3),
    "needsExtraction" BOOLEAN NOT NULL DEFAULT true,
    "syncStatus" VARCHAR(30),
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScholarshipSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(60) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
    "triggeredBy" VARCHAR(30) NOT NULL DEFAULT 'manual',
    "adminId" TEXT,
    "targetType" VARCHAR(30),
    "targetId" VARCHAR(100),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "processed" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "unchanged" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "details" JSONB,
    "geminiRequests" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLock" (
    "key" VARCHAR(100) NOT NULL,
    "owner" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncLock_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "GeminiUsageDaily" (
    "day" VARCHAR(10) NOT NULL,
    "chatRequests" INTEGER NOT NULL DEFAULT 0,
    "syncRequests" INTEGER NOT NULL DEFAULT 0,
    "admissionRequests" INTEGER NOT NULL DEFAULT 0,
    "scholarshipRequests" INTEGER NOT NULL DEFAULT 0,
    "quotaErrors" INTEGER NOT NULL DEFAULT 0,
    "circuitOpenUntil" TIMESTAMP(3),
    "lastQuotaErrorAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeminiUsageDaily_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScholarshipSource_url_key" ON "ScholarshipSource"("url");

-- CreateIndex
CREATE INDEX "ScholarshipSource_needsExtraction_idx" ON "ScholarshipSource"("needsExtraction");

-- CreateIndex
CREATE INDEX "SyncJob_status_createdAt_idx" ON "SyncJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SyncJob_type_createdAt_idx" ON "SyncJob"("type", "createdAt");

-- CreateIndex
CREATE INDEX "SyncJob_type_status_targetId_idx" ON "SyncJob"("type", "status", "targetId");

-- CreateIndex
CREATE INDEX "SyncLock_expiresAt_idx" ON "SyncLock"("expiresAt");

-- CreateIndex
CREATE INDEX "University_nextSyncAt_idx" ON "University"("nextSyncAt");

-- CreateIndex
CREATE INDEX "University_professorsNextSyncAt_idx" ON "University"("professorsNextSyncAt");

-- CreateIndex
CREATE INDEX "Professor_name_universityId_idx" ON "Professor"("name", "universityId");

-- CreateIndex
CREATE INDEX "Professor_openAlexId_idx" ON "Professor"("openAlexId");

-- CreateIndex
CREATE INDEX "Professor_nextSyncAt_idx" ON "Professor"("nextSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "Professor_universityId_openAlexId_key" ON "Professor"("universityId", "openAlexId");

-- CreateIndex
CREATE INDEX "Scholarship_status_idx" ON "Scholarship"("status");

-- CreateIndex
CREATE INDEX "Scholarship_nextSyncAt_idx" ON "Scholarship"("nextSyncAt");

