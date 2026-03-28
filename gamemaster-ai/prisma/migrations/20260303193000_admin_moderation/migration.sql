-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "suspendedUntil" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT,
  ADD COLUMN "adminNote" TEXT,
  ADD COLUMN "isSoftDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "softDeletedAt" TIMESTAMP(3),
  ADD COLUMN "softDeleteReason" TEXT;

ALTER TABLE "Campaign"
  ADD COLUMN "isSoftDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "softDeletedAt" TIMESTAMP(3);

ALTER TABLE "Scenario"
  ADD COLUMN "isSoftDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "softDeletedAt" TIMESTAMP(3);

ALTER TABLE "Message"
  ADD COLUMN "isSoftDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "softDeletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ModerationReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reporterId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "ModerationReport_status_createdAt_idx" ON "ModerationReport"("status", "createdAt");
CREATE INDEX "ModerationReport_entityType_entityId_idx" ON "ModerationReport"("entityType", "entityId");
CREATE INDEX "ModerationReport_reporterId_status_idx" ON "ModerationReport"("reporterId", "status");

-- AddForeignKey
ALTER TABLE "ModerationReport"
  ADD CONSTRAINT "ModerationReport_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModerationReport"
  ADD CONSTRAINT "ModerationReport_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
