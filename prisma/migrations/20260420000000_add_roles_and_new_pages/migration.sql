-- Add premium/curator fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "questionsLimit" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isCurator" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable ExamVariant
CREATE TABLE IF NOT EXISTS "ExamVariant" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "year" INTEGER,
    "pdfUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable ExamTask
CREATE TABLE IF NOT EXISTS "ExamTask" (
    "id" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "part" INTEGER NOT NULL DEFAULT 1,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "pdfUrl" TEXT,
    "answer" TEXT,
    "maxScore" INTEGER NOT NULL DEFAULT 1,
    "topic" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExamTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable ExamAttempt
CREATE TABLE IF NOT EXISTS "ExamAttempt" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "variantId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "part1Score" INTEGER,
    "part2Score" INTEGER,
    "totalScore" INTEGER,
    "curatorId" INTEGER,
    "curatorNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable ExamAnswer
CREATE TABLE IF NOT EXISTS "ExamAnswer" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "textAnswer" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "ExamAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable ExamFeedback
CREATE TABLE IF NOT EXISTS "ExamFeedback" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "isCorrect" BOOLEAN,
    "score" INTEGER,
    "comment" TEXT,
    "imageUrl" TEXT,
    "curatorId" INTEGER,

    CONSTRAINT "ExamFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable CuratorQuestion
CREATE TABLE IF NOT EXISTS "CuratorQuestion" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "curatorId" INTEGER,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "answer" TEXT,
    "answerImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "CuratorQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExamAttempt_studentId_variantId_key" ON "ExamAttempt"("studentId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExamAnswer_attemptId_taskId_key" ON "ExamAnswer"("attemptId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExamFeedback_attemptId_taskId_key" ON "ExamFeedback"("attemptId", "taskId");

-- AddForeignKey
ALTER TABLE "ExamTask" ADD CONSTRAINT "ExamTask_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ExamVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ExamVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ExamTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamFeedback" ADD CONSTRAINT "ExamFeedback_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamFeedback" ADD CONSTRAINT "ExamFeedback_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ExamTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamFeedback" ADD CONSTRAINT "ExamFeedback_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuratorQuestion" ADD CONSTRAINT "CuratorQuestion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuratorQuestion" ADD CONSTRAINT "CuratorQuestion_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;