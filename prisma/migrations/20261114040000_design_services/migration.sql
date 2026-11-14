BEGIN;
CREATE TABLE "CareProfile" (
  "username" TEXT PRIMARY KEY REFERENCES "ScreeningAccount"("username") ON DELETE CASCADE ON UPDATE CASCADE,
  "profile" JSONB NOT NULL, "preferences" JSONB NOT NULL
);
CREATE TABLE "CareReminder" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL REFERENCES "ScreeningAccount"("username") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind" TEXT NOT NULL, "topic" TEXT, "dueAt" TIMESTAMP(3) NOT NULL,
  "done" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CareReminder_username_dueAt_id_idx" ON "CareReminder"("username", "dueAt", "id");
ALTER TABLE "HealthObservation" ADD COLUMN "details" JSONB;
CREATE TABLE "ContentReport" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL REFERENCES "ScreeningAccount"("username") ON DELETE CASCADE ON UPDATE CASCADE,
  "topic" TEXT, "message" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ContentReport_username_createdAt_idx" ON "ContentReport"("username", "createdAt");
COMMIT;
