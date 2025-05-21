-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL,
    "dateOfBirth" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "tShirtFit" TEXT,
    "tShirtSize" TEXT
);

-- CreateTable
CREATE TABLE "Dependent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "dateOfBirth" TEXT,
    "customer" TEXT,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "tShirtFit" TEXT,
    "tShirtSize" TEXT,
    CONSTRAINT "Dependent_customer_fkey" FOREIGN KEY ("customer") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '[{"type":"paragraph","children":[{"text":""}]}]',
    "author" TEXT,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_author_fkey" FOREIGN KEY ("author") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "bookable" BOOLEAN NOT NULL DEFAULT true,
    "allowClashes" BOOLEAN NOT NULL DEFAULT false,
    "minBookingDurationMinutes" INTEGER DEFAULT 30,
    "maxBookingDurationMinutes" INTEGER DEFAULT 60,
    "openTime" TEXT NOT NULL DEFAULT '',
    "closeTime" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "capacity" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "memberPrice" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "customSessions" BOOLEAN NOT NULL DEFAULT false,
    "repeats" BOOLEAN NOT NULL DEFAULT true,
    "frequency" TEXT DEFAULT 'daily',
    "recurrenceEnds" TEXT DEFAULT 'never',
    "recurrenceEndDate" TEXT,
    "recurrenceCount" INTEGER,
    "facility" TEXT,
    "schedule" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "daysOfWeek" TEXT NOT NULL DEFAULT '[]',
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "enrollmentStartDate" DATETIME,
    "enrollmentEndDate" DATETIME,
    "requireEmergencyContactInfo" BOOLEAN NOT NULL DEFAULT false,
    "requireTShirtSize" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Program_facility_fkey" FOREIGN KEY ("facility") REFERENCES "Facility" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "program" TEXT,
    "customer" TEXT,
    "participant" TEXT,
    "dependent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "enrolledAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_program_fkey" FOREIGN KEY ("program") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_customer_fkey" FOREIGN KEY ("customer") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_participant_fkey" FOREIGN KEY ("participant") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_dependent_fkey" FOREIGN KEY ("dependent") REFERENCES "Dependent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Waiver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',
    "version" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WaiverAcceptance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "waiver" TEXT,
    "customer" TEXT,
    "dependent" TEXT,
    "acceptedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaiverAcceptance_waiver_fkey" FOREIGN KEY ("waiver") REFERENCES "Waiver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WaiverAcceptance_customer_fkey" FOREIGN KEY ("customer") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WaiverAcceptance_dependent_fkey" FOREIGN KEY ("dependent") REFERENCES "Dependent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "program" TEXT,
    "date" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "facility" TEXT,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_program_fkey" FOREIGN KEY ("program") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Session_facility_fkey" FOREIGN KEY ("facility") REFERENCES "Facility" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FacilityRental" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facility" TEXT,
    "customer" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "holdExpiresAt" DATETIME,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FacilityRental_facility_fkey" FOREIGN KEY ("facility") REFERENCES "Facility" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FacilityRental_customer_fkey" FOREIGN KEY ("customer") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_Post_tags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_Post_tags_A_fkey" FOREIGN KEY ("A") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_Post_tags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_Facility_overlapsWith" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_Facility_overlapsWith_A_fkey" FOREIGN KEY ("A") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_Facility_overlapsWith_B_fkey" FOREIGN KEY ("B") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_Program_instructors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_Program_instructors_A_fkey" FOREIGN KEY ("A") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_Program_instructors_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Dependent_customer_idx" ON "Dependent"("customer");

-- CreateIndex
CREATE INDEX "Post_author_idx" ON "Post"("author");

-- CreateIndex
CREATE INDEX "Program_facility_idx" ON "Program"("facility");

-- CreateIndex
CREATE INDEX "Enrollment_program_idx" ON "Enrollment"("program");

-- CreateIndex
CREATE INDEX "Enrollment_customer_idx" ON "Enrollment"("customer");

-- CreateIndex
CREATE INDEX "Enrollment_participant_idx" ON "Enrollment"("participant");

-- CreateIndex
CREATE INDEX "Enrollment_dependent_idx" ON "Enrollment"("dependent");

-- CreateIndex
CREATE INDEX "WaiverAcceptance_waiver_idx" ON "WaiverAcceptance"("waiver");

-- CreateIndex
CREATE INDEX "WaiverAcceptance_customer_idx" ON "WaiverAcceptance"("customer");

-- CreateIndex
CREATE INDEX "WaiverAcceptance_dependent_idx" ON "WaiverAcceptance"("dependent");

-- CreateIndex
CREATE INDEX "Session_program_idx" ON "Session"("program");

-- CreateIndex
CREATE INDEX "Session_facility_idx" ON "Session"("facility");

-- CreateIndex
CREATE INDEX "FacilityRental_facility_idx" ON "FacilityRental"("facility");

-- CreateIndex
CREATE INDEX "FacilityRental_customer_idx" ON "FacilityRental"("customer");

-- CreateIndex
CREATE UNIQUE INDEX "_Post_tags_AB_unique" ON "_Post_tags"("A", "B");

-- CreateIndex
CREATE INDEX "_Post_tags_B_index" ON "_Post_tags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Facility_overlapsWith_AB_unique" ON "_Facility_overlapsWith"("A", "B");

-- CreateIndex
CREATE INDEX "_Facility_overlapsWith_B_index" ON "_Facility_overlapsWith"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Program_instructors_AB_unique" ON "_Program_instructors"("A", "B");

-- CreateIndex
CREATE INDEX "_Program_instructors_B_index" ON "_Program_instructors"("B");
