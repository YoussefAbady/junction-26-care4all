CREATE TABLE "HealthObservation" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL REFERENCES "ScreeningAccount"("username") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('symptom', 'observation')),
  "label" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HealthObservation_username_createdAt_id_idx" ON "HealthObservation"("username", "createdAt", "id");
