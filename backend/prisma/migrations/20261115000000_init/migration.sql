-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255),
    "googleId" TEXT,
    "phone" VARCHAR(20),
    "country" VARCHAR(100) NOT NULL,
    "institution" VARCHAR(150),
    "subject" VARCHAR(100),
    "cgpa" DOUBLE PRECISION,
    "preferredSubject" VARCHAR(100),
    "satScore" INTEGER,
    "ieltsScore" DOUBLE PRECISION,
    "greScore" INTEGER,
    "toeflScore" INTEGER,
    "duolingoScore" INTEGER,
    "targetDegree" VARCHAR(100),
    "targetIntake" VARCHAR(50),
    "targetCountry" VARCHAR(150),
    "fundingPreference" VARCHAR(100),
    "graduationYear" INTEGER,
    "researchInterests" VARCHAR(255),
    "publicationsCount" INTEGER DEFAULT 0,
    "workExperienceYears" DOUBLE PRECISION,
    "linkedinUrl" VARCHAR(255),
    "githubUrl" VARCHAR(255),
    "researchGateUrl" VARCHAR(255),
    "statementOfPurpose" TEXT,
    "profileImage" VARCHAR(255),
    "role" VARCHAR(20) NOT NULL DEFAULT 'student',
    "dailyGoal" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100),
    "ranking" INTEGER NOT NULL,
    "tuitionAnnualUsd" INTEGER,
    "acceptanceRate" DOUBLE PRECISION,
    "applicationFee" INTEGER,
    "applicationDeadline" VARCHAR(100),
    "ieltsRequirement" DOUBLE PRECISION,
    "greRequirement" INTEGER,
    "websiteUrl" VARCHAR(255),
    "courses" JSONB,
    "lastScraped" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Professor" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "department" VARCHAR(120),
    "field" VARCHAR(140) NOT NULL,
    "bio" TEXT,
    "email" VARCHAR(180),
    "profileUrl" VARCHAR(300),
    "photoUrl" VARCHAR(300),
    "universityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Professor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scholarship" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "amountUsd" INTEGER,
    "fundingLevel" VARCHAR(50) NOT NULL,
    "eligibility" TEXT,
    "deadline" VARCHAR(100),
    "websiteUrl" VARCHAR(255),
    "lastScraped" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowedUniversity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowedUniversity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnedWord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" VARCHAR(80) NOT NULL,
    "phonetic" VARCHAR(80),
    "partOfSpeech" VARCHAR(40),
    "definition" TEXT NOT NULL,
    "example" TEXT,
    "synonyms" JSONB,
    "knewIt" BOOLEAN NOT NULL DEFAULT false,
    "learnedOnKey" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearnedWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyTestAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyTestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "universityId" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journey" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "excerpt" VARCHAR(320) NOT NULL,
    "story" TEXT NOT NULL,
    "authorName" VARCHAR(100) NOT NULL,
    "authorEmail" VARCHAR(255) NOT NULL,
    "photoData" TEXT,
    "tags" TEXT[],
    "allowContact" BOOLEAN NOT NULL DEFAULT true,
    "authorId" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "moderationNote" VARCHAR(300),
    "views" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyVote" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyReport" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "reason" VARCHAR(60) NOT NULL,
    "details" VARCHAR(1000),
    "reporterEmail" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyContact" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "senderName" VARCHAR(100) NOT NULL,
    "senderEmail" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyComment" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorName" VARCHAR(60) NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyEditLink" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyEditLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetCode" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "codeHash" VARCHAR(255) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_googleId_key" ON "Student"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "University_name_key" ON "University"("name");

-- CreateIndex
CREATE INDEX "Professor_universityId_idx" ON "Professor"("universityId");

-- CreateIndex
CREATE INDEX "Professor_field_idx" ON "Professor"("field");

-- CreateIndex
CREATE UNIQUE INDEX "Professor_name_universityId_key" ON "Professor"("name", "universityId");

-- CreateIndex
CREATE UNIQUE INDEX "Scholarship_name_key" ON "Scholarship"("name");

-- CreateIndex
CREATE INDEX "FollowedUniversity_userId_idx" ON "FollowedUniversity"("userId");

-- CreateIndex
CREATE INDEX "FollowedUniversity_universityId_idx" ON "FollowedUniversity"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowedUniversity_userId_universityId_key" ON "FollowedUniversity"("userId", "universityId");

-- CreateIndex
CREATE INDEX "LearnedWord_userId_learnedOnKey_idx" ON "LearnedWord"("userId", "learnedOnKey");

-- CreateIndex
CREATE INDEX "LearnedWord_userId_createdAt_idx" ON "LearnedWord"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearnedWord_userId_word_key" ON "LearnedWord"("userId", "word");

-- CreateIndex
CREATE INDEX "VocabularyTestAttempt_userId_createdAt_idx" ON "VocabularyTestAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_universityId_idx" ON "Notification"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "Journey_slug_key" ON "Journey"("slug");

-- CreateIndex
CREATE INDEX "Journey_status_approvedAt_idx" ON "Journey"("status", "approvedAt");

-- CreateIndex
CREATE INDEX "Journey_status_createdAt_idx" ON "Journey"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Journey_authorEmail_idx" ON "Journey"("authorEmail");

-- CreateIndex
CREATE INDEX "Journey_authorId_idx" ON "Journey"("authorId");

-- CreateIndex
CREATE INDEX "JourneyVote_journeyId_idx" ON "JourneyVote"("journeyId");

-- CreateIndex
CREATE INDEX "JourneyVote_userId_idx" ON "JourneyVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyVote_journeyId_userId_key" ON "JourneyVote"("journeyId", "userId");

-- CreateIndex
CREATE INDEX "JourneyReport_journeyId_idx" ON "JourneyReport"("journeyId");

-- CreateIndex
CREATE INDEX "JourneyReport_status_createdAt_idx" ON "JourneyReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "JourneyContact_journeyId_createdAt_idx" ON "JourneyContact"("journeyId", "createdAt");

-- CreateIndex
CREATE INDEX "JourneyComment_journeyId_createdAt_idx" ON "JourneyComment"("journeyId", "createdAt");

-- CreateIndex
CREATE INDEX "JourneyComment_parentId_idx" ON "JourneyComment"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyEditLink_tokenHash_key" ON "JourneyEditLink"("tokenHash");

-- CreateIndex
CREATE INDEX "JourneyEditLink_journeyId_idx" ON "JourneyEditLink"("journeyId");

-- CreateIndex
CREATE INDEX "PasswordResetCode_email_createdAt_idx" ON "PasswordResetCode"("email", "createdAt");

-- AddForeignKey
ALTER TABLE "Professor" ADD CONSTRAINT "Professor_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedUniversity" ADD CONSTRAINT "FollowedUniversity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedUniversity" ADD CONSTRAINT "FollowedUniversity_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnedWord" ADD CONSTRAINT "LearnedWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyTestAttempt" ADD CONSTRAINT "VocabularyTestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journey" ADD CONSTRAINT "Journey_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyVote" ADD CONSTRAINT "JourneyVote_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyVote" ADD CONSTRAINT "JourneyVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyReport" ADD CONSTRAINT "JourneyReport_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyContact" ADD CONSTRAINT "JourneyContact_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyComment" ADD CONSTRAINT "JourneyComment_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyComment" ADD CONSTRAINT "JourneyComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "JourneyComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyEditLink" ADD CONSTRAINT "JourneyEditLink_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

