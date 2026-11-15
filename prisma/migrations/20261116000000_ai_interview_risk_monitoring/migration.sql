-- Design v2, operational tables (docs/design-v2.md section 10 and Appendix A): the AI interview, the AI risk assessment
-- and close monitoring of a symptom, with the reminder link that goes with it.
--
-- This migration only adds tables, indexes, constraints and one nullable column ("CareReminder"."monitorId"). It does not
-- change or read any existing row. Every new table belongs to one account and is deleted with it (ON DELETE CASCADE).
-- The CREATE TABLE statements are what Prisma generates for the models, plus CHECK constraints on the columns the
-- application switches on, which Prisma cannot express. A value the code does not know is refused by the database.

BEGIN;

-- AlterTable
ALTER TABLE "CareReminder" ADD COLUMN     "monitorId" TEXT;

-- CreateTable
CREATE TABLE "AiInterview" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTurn" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "help" TEXT,
    "options" JSONB,
    "range" JSONB,
    "source" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "answer" JSONB,
    "answerLabel" TEXT,
    "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "AiTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "contentVersion" TEXT NOT NULL,
    "result" JSONB,
    "progress" JSONB,
    "failure" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomMonitor" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "level0" INTEGER,
    "trend0" TEXT,

    CONSTRAINT "SymptomMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorCheckin" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trend" TEXT NOT NULL,
    "level" INTEGER,
    "flags" TEXT[],
    "serious" BOOLEAN NOT NULL DEFAULT false,
    "result" TEXT NOT NULL,

    CONSTRAINT "MonitorCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiInterview_username_key" ON "AiInterview"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AiTurn_interviewId_position_key" ON "AiTurn"("interviewId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAssessment_username_key" ON "RiskAssessment"("username");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomMonitor_observationId_key" ON "SymptomMonitor"("observationId");

-- CreateIndex
CREATE INDEX "SymptomMonitor_username_status_idx" ON "SymptomMonitor"("username", "status");

-- CreateIndex
CREATE INDEX "MonitorCheckin_monitorId_ts_idx" ON "MonitorCheckin"("monitorId", "ts");

-- CreateIndex
CREATE INDEX "CareReminder_monitorId_idx" ON "CareReminder"("monitorId");

-- AddForeignKey
ALTER TABLE "CareReminder" ADD CONSTRAINT "CareReminder_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "SymptomMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInterview" ADD CONSTRAINT "AiInterview_username_fkey" FOREIGN KEY ("username") REFERENCES "ScreeningAccount"("username") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTurn" ADD CONSTRAINT "AiTurn_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "AiInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_username_fkey" FOREIGN KEY ("username") REFERENCES "ScreeningAccount"("username") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomMonitor" ADD CONSTRAINT "SymptomMonitor_username_fkey" FOREIGN KEY ("username") REFERENCES "ScreeningAccount"("username") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomMonitor" ADD CONSTRAINT "SymptomMonitor_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "HealthObservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorCheckin" ADD CONSTRAINT "MonitorCheckin_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "SymptomMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Values the application switches on. Prisma does not manage these. Adding a value is a schema amendment (docs/design-v2.md Appendix A).
ALTER TABLE "AiInterview" ADD CONSTRAINT "AiInterview_language_check" CHECK ("language" IN ('en', 'fi'));
ALTER TABLE "AiInterview" ADD CONSTRAINT "AiInterview_status_check" CHECK ("status" IN ('active', 'complete'));
ALTER TABLE "AiTurn" ADD CONSTRAINT "AiTurn_kind_check" CHECK ("kind" IN ('choice', 'multi', 'number'));
ALTER TABLE "AiTurn" ADD CONSTRAINT "AiTurn_source_check" CHECK ("source" IN ('model', 'bank'));
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_language_check" CHECK ("language" IN ('en', 'fi'));
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_status_check" CHECK ("status" IN ('running', 'complete', 'failed'));
ALTER TABLE "SymptomMonitor" ADD CONSTRAINT "SymptomMonitor_status_check" CHECK ("status" IN ('active', 'resolved', 'escalated', 'stopped'));
ALTER TABLE "SymptomMonitor" ADD CONSTRAINT "SymptomMonitor_level0_check" CHECK ("level0" IS NULL OR "level0" BETWEEN 0 AND 10);
ALTER TABLE "MonitorCheckin" ADD CONSTRAINT "MonitorCheckin_trend_check" CHECK ("trend" IN ('gone', 'better', 'same', 'worse'));
ALTER TABLE "MonitorCheckin" ADD CONSTRAINT "MonitorCheckin_level_check" CHECK ("level" IS NULL OR "level" BETWEEN 0 AND 10);
ALTER TABLE "MonitorCheckin" ADD CONSTRAINT "MonitorCheckin_result_check" CHECK ("result" IN ('gone', 'watch', 'doctor', 'emergency'));

COMMIT;
