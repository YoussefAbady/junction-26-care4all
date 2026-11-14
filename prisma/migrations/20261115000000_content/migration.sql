-- Public educational content: the tables behind GET /api/content, /api/cancers, /api/library and the chat evidence,
-- and the passage index used for retrieval. See docs/content-database.md.
--
-- This migration only adds tables. It does not change or read any existing table or row.
-- The CREATE TABLE statements are what Prisma generates for the models, with two additions Prisma cannot express:
--   * ContentPassage."search" is a generated tsvector column, and ContentPassage_search_idx is its GIN index.
--   * CHECK constraints on the columns the application switches on.
-- The content itself is loaded by "prisma db seed" (npm run db:release), not here.

BEGIN;

-- CreateTable
CREATE TABLE "ContentMeta" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "ContentMeta_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ContentSource" (
    "id" TEXT NOT NULL,
    "listed" BOOLEAN NOT NULL,
    "position" INTEGER NOT NULL,
    "organisation" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameFi" TEXT,
    "url" TEXT NOT NULL,
    "published" TEXT NOT NULL,
    "retrieved" TEXT NOT NULL,
    "use" TEXT NOT NULL,
    "language" TEXT NOT NULL,

    CONSTRAINT "ContentSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentString" (
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "ContentString_pkey" PRIMARY KEY ("scope","key","language")
);

-- CreateTable
CREATE TABLE "ContentCounty" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ContentCounty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentArticle" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "inShort" TEXT NOT NULL,
    "about" BOOLEAN NOT NULL DEFAULT false,
    "related" TEXT[],

    CONSTRAINT "ContentArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentArticleSection" (
    "articleId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "lead" TEXT,
    "paragraphs" TEXT[],
    "plain" TEXT[],
    "list" TEXT[],
    "steps" TEXT[],
    "stats" JSONB,
    "cols" JSONB,
    "link" JSONB,
    "sourceIds" TEXT[],

    CONSTRAINT "ContentArticleSection_pkey" PRIMARY KEY ("articleId","position")
);

-- CreateTable
CREATE TABLE "ContentTopic" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "kicker" TEXT NOT NULL,
    "national" BOOLEAN NOT NULL,
    "pref" TEXT,
    "blurb" TEXT NOT NULL,
    "lede" TEXT NOT NULL,
    "leadSourceIds" TEXT[],
    "programme" TEXT NOT NULL,
    "articleIds" TEXT[],
    "organ" TEXT NOT NULL,
    "aboutId" TEXT NOT NULL,
    "screeningText" TEXT NOT NULL,
    "screeningSourceIds" TEXT[],
    "screenName" TEXT,
    "symptomsTitle" TEXT NOT NULL,
    "symptomsSee" TEXT NOT NULL,
    "symptomsSeeSourceIds" TEXT[],
    "symptomsNote" TEXT NOT NULL,
    "symptomsContact" TEXT NOT NULL,
    "symptomsSourceIds" TEXT[],

    CONSTRAINT "ContentTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSymptom" (
    "topicId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "art" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "ContentSymptom_pkey" PRIMARY KEY ("topicId","position")
);

-- CreateTable
CREATE TABLE "ContentGuide" (
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT[],
    "normal" TEXT[],
    "normalSourceIds" TEXT[],
    "found" TEXT NOT NULL,
    "videos" JSONB NOT NULL,
    "differ" TEXT NOT NULL,
    "differSourceIds" TEXT[],
    "abcde" JSONB,
    "sourceIds" TEXT[],

    CONSTRAINT "ContentGuide_pkey" PRIMARY KEY ("topicId")
);

-- CreateTable
CREATE TABLE "ContentGuideStep" (
    "topicId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "art" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "look" TEXT,
    "pose" TEXT NOT NULL,
    "move" TEXT NOT NULL,

    CONSTRAINT "ContentGuideStep_pkey" PRIMARY KEY ("topicId","position")
);

-- CreateTable
CREATE TABLE "ContentKit" (
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sourceIds" TEXT[],
    "kind" TEXT NOT NULL,
    "video" JSONB,

    CONSTRAINT "ContentKit_pkey" PRIMARY KEY ("topicId")
);

-- CreateTable
CREATE TABLE "ContentJourney" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "intro" TEXT NOT NULL,
    "benefits" TEXT[],
    "downsides" TEXT[],
    "unsure" TEXT NOT NULL,
    "sourceIds" TEXT[],

    CONSTRAINT "ContentJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentJourneyStep" (
    "journeyId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "art" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "tip" TEXT,

    CONSTRAINT "ContentJourneyStep_pkey" PRIMARY KEY ("journeyId","position")
);

-- CreateTable
CREATE TABLE "ContentCheck" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "everyDays" INTEGER NOT NULL,
    "remindIn" TEXT NOT NULL,
    "short" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "recommendationSourceIds" TEXT[],
    "drawingSourceIds" TEXT[],
    "note" TEXT NOT NULL,

    CONSTRAINT "ContentCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentScan" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sex" TEXT,
    "type" TEXT NOT NULL,
    "who" TEXT NOT NULL,
    "everyYears" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "intakeQuestion" TEXT,
    "intakeAnswers" JSONB,
    "journeyId" TEXT,
    "sourceIds" TEXT[],

    CONSTRAINT "ContentScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentProgramme" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "test" TEXT NOT NULL,
    "ages" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "pick" TEXT NOT NULL,

    CONSTRAINT "ContentProgramme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentStat" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "site" TEXT NOT NULL,
    "riskPercent" DOUBLE PRECISION NOT NULL,
    "sex" TEXT,
    "casesBoth" INTEGER NOT NULL,
    "casesMen" INTEGER,
    "casesWomen" INTEGER,
    "shareMen" DOUBLE PRECISION,
    "shareWomen" DOUBLE PRECISION,
    "sourceIds" TEXT[],

    CONSTRAINT "ContentStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVaccine" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "protects" TEXT NOT NULL,
    "finland" TEXT,
    "sourceIds" TEXT[],

    CONSTRAINT "ContentVaccine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentTriageRule" (
    "position" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sourceIds" TEXT[],

    CONSTRAINT "ContentTriageRule_pkey" PRIMARY KEY ("position")
);

-- CreateTable
CREATE TABLE "ContentFaq" (
    "position" INTEGER NOT NULL,
    "topic" TEXT,
    "pattern" TEXT,
    "patternFlags" TEXT,
    "keywords" TEXT[],
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sourceIds" TEXT[],

    CONSTRAINT "ContentFaq_pkey" PRIMARY KEY ("position")
);

-- CreateTable
CREATE TABLE "ContentSuggestion" (
    "position" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "question" TEXT NOT NULL,

    CONSTRAINT "ContentSuggestion_pkey" PRIMARY KEY ("position")
);

-- CreateTable
CREATE TABLE "ContentCatalogCard" (
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFi" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "summaryFi" TEXT NOT NULL,
    "linkIds" TEXT[],

    CONSTRAINT "ContentCatalogCard_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "ContentCatalogSection" (
    "cardSlug" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFi" TEXT NOT NULL,
    "status" TEXT,
    "itemsEn" TEXT[],
    "itemsFi" TEXT[],
    "sourceIds" TEXT[],

    CONSTRAINT "ContentCatalogSection_pkey" PRIMARY KEY ("cardSlug","key")
);

-- CreateTable
CREATE TABLE "ContentEvidence" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "residence" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "heading" TEXT,
    "text" TEXT NOT NULL,
    "sourceIds" TEXT[],

    CONSTRAINT "ContentEvidence_pkey" PRIMARY KEY ("id","language","residence","position")
);

-- CreateTable
CREATE TABLE "ContentPassage" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sourceIds" TEXT[],
    "search" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector(CASE "language" WHEN 'fi' THEN 'finnish'::regconfig ELSE 'english'::regconfig END, "heading"), 'A') ||
        setweight(to_tsvector(CASE "language" WHEN 'fi' THEN 'finnish'::regconfig ELSE 'english'::regconfig END, "text"), 'B')
    ) STORED,

    CONSTRAINT "ContentPassage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentSource_listed_position_idx" ON "ContentSource"("listed", "position");

-- CreateIndex
CREATE INDEX "ContentString_scope_position_idx" ON "ContentString"("scope", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ContentArticleSection_articleId_key_key" ON "ContentArticleSection"("articleId", "key");

-- CreateIndex
CREATE INDEX "ContentPassage_language_topic_idx" ON "ContentPassage"("language", "topic");

-- AddForeignKey
ALTER TABLE "ContentArticleSection" ADD CONSTRAINT "ContentArticleSection_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ContentArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSymptom" ADD CONSTRAINT "ContentSymptom_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ContentTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGuide" ADD CONSTRAINT "ContentGuide_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ContentTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGuideStep" ADD CONSTRAINT "ContentGuideStep_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ContentGuide"("topicId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentKit" ADD CONSTRAINT "ContentKit_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ContentTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentJourneyStep" ADD CONSTRAINT "ContentJourneyStep_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "ContentJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCatalogSection" ADD CONSTRAINT "ContentCatalogSection_cardSlug_fkey" FOREIGN KEY ("cardSlug") REFERENCES "ContentCatalogCard"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- Full-text search over the passages.
CREATE INDEX "ContentPassage_search_idx" ON "ContentPassage" USING GIN ("search");

-- Values the application switches on. Prisma does not manage these.
ALTER TABLE "ContentString" ADD CONSTRAINT "ContentString_scope_check" CHECK ("scope" IN ('copy', 'i18n', 'catalog'));
ALTER TABLE "ContentSource" ADD CONSTRAINT "ContentSource_retrieved_check" CHECK ("retrieved" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "ContentCatalogSection" ADD CONSTRAINT "ContentCatalogSection_key_check" CHECK ("key" IN ('awareness', 'symptoms', 'selfExamination', 'homeKit', 'riskFactors'));
ALTER TABLE "ContentCatalogSection" ADD CONSTRAINT "ContentCatalogSection_status_check" CHECK ("status" IS NULL OR "status" IN ('awareness_only', 'unavailable', 'programme_information'));
ALTER TABLE "ContentEvidence" ADD CONSTRAINT "ContentEvidence_language_check" CHECK ("language" IN ('en', 'fi'));
ALTER TABLE "ContentEvidence" ADD CONSTRAINT "ContentEvidence_residence_check" CHECK ("residence" IN ('any', 'finland', 'abroad'));
ALTER TABLE "ContentPassage" ADD CONSTRAINT "ContentPassage_language_check" CHECK ("language" IN ('en', 'fi'));

COMMIT;
