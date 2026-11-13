CREATE TABLE "DemoSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "state" JSONB NOT NULL
);
CREATE INDEX "DemoSession_expiresAt_idx" ON "DemoSession"("expiresAt");
CREATE TABLE "DemoFixture" ("id" TEXT NOT NULL PRIMARY KEY, "payload" JSONB NOT NULL);
