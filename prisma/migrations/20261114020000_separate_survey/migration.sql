BEGIN;

-- Keep account preferences separate from medical history.
ALTER TABLE "ScreeningAccount" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
UPDATE "ScreeningAccount" SET "language" = 'fi' WHERE "progress"->>'language' = 'fi';

CREATE TABLE "ScreeningSurvey" (
  "username" TEXT PRIMARY KEY REFERENCES "ScreeningAccount"("username") ON DELETE CASCADE ON UPDATE CASCADE,
  "progress" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "legacyProgress" JSONB
);

INSERT INTO "ScreeningSurvey" ("username", "progress", "revision", "legacyProgress")
SELECT "username", "progress", "revision",
  CASE WHEN "progress"->>'v' IS DISTINCT FROM '2' THEN "progress" END
FROM "ScreeningAccount"
WHERE "revision" > 0
   OR "progress"->'answers' IS DISTINCT FROM '{}'::jsonb
   OR COALESCE("progress"->>'cursor', '') <> ''
   OR COALESCE("progress"->>'step', '0') <> '0'
   OR "progress"->>'complete' = 'true';

ALTER TABLE "ScreeningAccount" DROP COLUMN "progress", DROP COLUMN "revision";

COMMIT;
