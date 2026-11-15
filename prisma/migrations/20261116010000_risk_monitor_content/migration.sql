-- Design v2, content tables (docs/design-v2.md section 9 and Appendix A): the risk rules and their sources, the coverage
-- list and the fallback questions of the AI interview, and the check-in flags of close monitoring. The content itself is
-- loaded by "prisma db seed" (npm run db:release), not here.
--
-- This migration only adds tables and two columns to "ContentSource", and widens the "ContentString" scope check so the
-- scopes risk, monitor and interview are allowed. It does not change or read any existing row.
-- The CREATE TABLE statements are what Prisma generates for the models, plus CHECK constraints and one partial unique
-- index, which Prisma cannot express.

BEGIN;

-- AlterTable
ALTER TABLE "ContentSource" ADD COLUMN     "guideline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tier" TEXT;

-- CreateTable
CREATE TABLE "ContentRiskType" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFi" TEXT NOT NULL,
    "notCoveredEn" TEXT[],
    "notCoveredFi" TEXT[],

    CONSTRAINT "ContentRiskType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRiskFactor" (
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFi" TEXT NOT NULL,
    "shortEn" TEXT NOT NULL,
    "shortFi" TEXT NOT NULL,
    "tipEn" TEXT,
    "tipFi" TEXT,
    "tipSourceIds" TEXT[],
    "states" JSONB NOT NULL,

    CONSTRAINT "ContentRiskFactor_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ContentRiskFact" (
    "riskType" TEXT NOT NULL,
    "factor" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "effect" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "textFi" TEXT NOT NULL,
    "sourceIds" TEXT[],

    CONSTRAINT "ContentRiskFact_pkey" PRIMARY KEY ("riskType","factor","state")
);

-- CreateTable
CREATE TABLE "ContentGuideline" (
    "riskType" TEXT NOT NULL,
    "sourceIds" TEXT[],

    CONSTRAINT "ContentGuideline_pkey" PRIMARY KEY ("riskType")
);

-- CreateTable
CREATE TABLE "ContentAssessmentDomain" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFi" TEXT NOT NULL,
    "essential" BOOLEAN NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "ask" TEXT NOT NULL,
    "fallback" JSONB NOT NULL,

    CONSTRAINT "ContentAssessmentDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentMonitorFlag" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelFi" TEXT NOT NULL,
    "wordEn" TEXT,
    "wordFi" TEXT,

    CONSTRAINT "ContentMonitorFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentRiskFact_riskType_position_key" ON "ContentRiskFact"("riskType", "position");

-- AddForeignKey
ALTER TABLE "ContentRiskFact" ADD CONSTRAINT "ContentRiskFact_riskType_fkey" FOREIGN KEY ("riskType") REFERENCES "ContentRiskType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRiskFact" ADD CONSTRAINT "ContentRiskFact_factor_fkey" FOREIGN KEY ("factor") REFERENCES "ContentRiskFactor"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGuideline" ADD CONSTRAINT "ContentGuideline_riskType_fkey" FOREIGN KEY ("riskType") REFERENCES "ContentRiskType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one row holds the serious-now wording. Prisma does not manage this index.
CREATE UNIQUE INDEX "ContentMonitorFlag_serious_key" ON "ContentMonitorFlag"("kind") WHERE "kind" = 'serious';

-- Values the application switches on. Prisma does not manage these.
-- The scopes of ContentString: the three of design v2 are new.
ALTER TABLE "ContentString" DROP CONSTRAINT "ContentString_scope_check";
ALTER TABLE "ContentString" ADD CONSTRAINT "ContentString_scope_check" CHECK ("scope" IN ('copy', 'i18n', 'catalog', 'risk', 'monitor', 'interview'));
ALTER TABLE "ContentSource" ADD CONSTRAINT "ContentSource_tier_check" CHECK ("tier" IS NULL OR "tier" IN ('finland', 'europe', 'international'));
ALTER TABLE "ContentRiskType" ADD CONSTRAINT "ContentRiskType_sex_check" CHECK ("sex" IN ('any', 'female', 'male'));
ALTER TABLE "ContentRiskType" ADD CONSTRAINT "ContentRiskType_notCovered_check" CHECK (cardinality("notCoveredEn") = cardinality("notCoveredFi"));
ALTER TABLE "ContentRiskFactor" ADD CONSTRAINT "ContentRiskFactor_tip_check" CHECK (("tipEn" IS NULL) = ("tipFi" IS NULL));
ALTER TABLE "ContentRiskFact" ADD CONSTRAINT "ContentRiskFact_effect_check" CHECK ("effect" IN ('small', 'moderate', 'large', 'very-large', 'protective', 'info'));
ALTER TABLE "ContentAssessmentDomain" ADD CONSTRAINT "ContentAssessmentDomain_appliesTo_check" CHECK ("appliesTo" IN ('any', 'female', 'male'));
ALTER TABLE "ContentAssessmentDomain" ADD CONSTRAINT "ContentAssessmentDomain_age_check" CHECK ("minAge" IS NULL OR "maxAge" IS NULL OR "minAge" <= "maxAge");
ALTER TABLE "ContentMonitorFlag" ADD CONSTRAINT "ContentMonitorFlag_kind_check" CHECK ("kind" IN ('flag', 'serious'));
ALTER TABLE "ContentMonitorFlag" ADD CONSTRAINT "ContentMonitorFlag_word_check" CHECK (("kind" = 'serious') = ("wordEn" IS NULL AND "wordFi" IS NULL));

COMMIT;
