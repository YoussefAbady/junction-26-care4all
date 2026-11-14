CREATE TABLE "ScreeningAccount" (
  "username" TEXT PRIMARY KEY,
  "password" TEXT NOT NULL,
  "progress" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "ScreeningLogin" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL REFERENCES "ScreeningAccount"("username") ON DELETE CASCADE ON UPDATE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "ScreeningLogin_username_idx" ON "ScreeningLogin"("username");
CREATE INDEX "ScreeningLogin_expiresAt_idx" ON "ScreeningLogin"("expiresAt");
