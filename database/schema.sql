-- ============================================================
-- DSRT CEOS - Complete Database Schema for Supabase
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DROP TABLES (if rebuilding - comment out on first run)
-- ============================================================
DROP TABLE IF EXISTS "activity_logs" CASCADE;
DROP TABLE IF EXISTS "chat_messages" CASCADE;
DROP TABLE IF EXISTS "chat_sessions" CASCADE;
DROP TABLE IF EXISTS "compliance_records" CASCADE;
DROP TABLE IF EXISTS "project_expenses" CASCADE;
DROP TABLE IF EXISTS "material_ledger" CASCADE;
DROP TABLE IF EXISTS "attendance_records" CASCADE;
DROP TABLE IF EXISTS "ra_bill_items" CASCADE;
DROP TABLE IF EXISTS "ra_bills" CASCADE;
DROP TABLE IF EXISTS "project_boq_progress" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;
DROP TABLE IF EXISTS "tender_tracks" CASCADE;
DROP TABLE IF EXISTS "boq_items" CASCADE;
DROP TABLE IF EXISTS "tender_documents" CASCADE;
DROP TABLE IF EXISTS "tenders" CASCADE;
DROP TABLE IF EXISTS "generated_documents" CASCADE;
DROP TABLE IF EXISTS "vendors" CASCADE;
DROP TABLE IF EXISTS "machinery" CASCADE;
DROP TABLE IF EXISTS "staff_members" CASCADE;
DROP TABLE IF EXISTS "past_works" CASCADE;
DROP TABLE IF EXISTS "company_documents" CASCADE;
DROP TABLE IF EXISTS "contractor_registrations" CASCADE;
DROP TABLE IF EXISTS "company_preferences" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "companies" CASCADE;

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE "companies" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT NOT NULL,
  "legalName" TEXT,
  "type" TEXT NOT NULL DEFAULT 'PROPRIETORSHIP',
  "panNumber" TEXT UNIQUE,
  "gstNumber" TEXT UNIQUE,
  "esiCode" TEXT,
  "epfCode" TEXT,
  "cinNumber" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "district" TEXT,
  "state" TEXT NOT NULL DEFAULT 'West Bengal',
  "pincode" TEXT,
  "bankName" TEXT,
  "bankBranch" TEXT,
  "bankAccountNumber" TEXT,
  "bankIfscCode" TEXT,
  "establishedYear" INTEGER,
  "primarySector" TEXT[] DEFAULT ARRAY['CIVIL']::TEXT[],
  "contractorClass" TEXT,
  "financialLimit" DECIMAL(15,2),
  "authSignatoryName" TEXT,
  "authSignatoryDesignation" TEXT,
  "planType" TEXT NOT NULL DEFAULT 'FREE',
  "planExpiresAt" TIMESTAMP(3)
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'OWNER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "supabaseId" TEXT NOT NULL UNIQUE,
  "language" TEXT NOT NULL DEFAULT 'BENGALI',
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_users_companyId" ON "users"("companyId");
CREATE INDEX "idx_users_supabaseId" ON "users"("supabaseId");

-- ============================================================
-- COMPANY PREFERENCES
-- ============================================================
CREATE TABLE "company_preferences" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
  "preferredStates" TEXT[] DEFAULT ARRAY['West Bengal']::TEXT[],
  "preferredDistricts" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "preferredSectors" TEXT[] DEFAULT ARRAY['CIVIL_BUILDING']::TEXT[],
  "preferredDepartments" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "minTenderValue" DECIMAL(15,2),
  "maxTenderValue" DECIMAL(15,2),
  "preferenceNotes" TEXT,
  "parsedPreferences" JSONB,
  "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
  "notifyWhatsApp" BOOLEAN NOT NULL DEFAULT false,
  "notifySMS" BOOLEAN NOT NULL DEFAULT false,
  "notifyMinScore" INTEGER NOT NULL DEFAULT 70
);

-- ============================================================
-- CONTRACTOR REGISTRATIONS
-- ============================================================
CREATE TABLE "contractor_registrations" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "department" TEXT NOT NULL,
  "registrationNo" TEXT NOT NULL,
  "class" TEXT,
  "category" TEXT,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "financialLimit" DECIMAL(15,2),
  "documentId" TEXT
);

CREATE INDEX "idx_registrations_companyId" ON "contractor_registrations"("companyId");

-- ============================================================
-- COMPANY DOCUMENTS (VAULT)
-- ============================================================
CREATE TABLE "company_documents" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "category" TEXT NOT NULL,
  "subCategory" TEXT,
  "name" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "fileSize" INTEGER,
  "mimeType" TEXT,
  "pageCount" INTEGER,
  "rawText" TEXT,
  "extractedData" JSONB,
  "isProcessed" BOOLEAN NOT NULL DEFAULT false,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "issueDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "isExpired" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isLatest" BOOLEAN NOT NULL DEFAULT true,
  "previousId" TEXT,
  "notes" TEXT
);

CREATE INDEX "idx_documents_companyId" ON "company_documents"("companyId");
CREATE INDEX "idx_documents_category" ON "company_documents"("category");
CREATE INDEX "idx_documents_expiry" ON "company_documents"("expiryDate");

-- ============================================================
-- PAST WORKS
-- ============================================================
CREATE TABLE "past_works" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "workName" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "workOrderNumber" TEXT,
  "workOrderDate" TIMESTAMP(3),
  "sector" TEXT NOT NULL,
  "subSector" TEXT,
  "workNature" TEXT,
  "contractValue" DECIMAL(15,2) NOT NULL,
  "startDate" TIMESTAMP(3),
  "completionDate" TIMESTAMP(3),
  "location" TEXT,
  "district" TEXT,
  "state" TEXT,
  "workOrderDocId" TEXT,
  "completionCertDocId" TEXT,
  "performanceCertDocId" TEXT,
  "isCompleted" BOOLEAN NOT NULL DEFAULT true,
  "performanceRating" TEXT,
  "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[]
);

CREATE INDEX "idx_pastworks_companyId" ON "past_works"("companyId");

-- ============================================================
-- STAFF MEMBERS
-- ============================================================
CREATE TABLE "staff_members" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "qualification" TEXT,
  "experienceYears" INTEGER,
  "aadhaarNumber" TEXT,
  "panNumber" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "monthlySalary" DECIMAL(10,2),
  "qualificationCertId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "joiningDate" TIMESTAMP(3)
);

CREATE INDEX "idx_staff_companyId" ON "staff_members"("companyId");

-- ============================================================
-- MACHINERY
-- ============================================================
CREATE TABLE "machinery" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "make" TEXT,
  "model" TEXT,
  "yearOfMfg" INTEGER,
  "ownershipType" TEXT NOT NULL DEFAULT 'OWNED',
  "registrationNo" TEXT,
  "rcDocumentId" TEXT,
  "hourlyRate" DECIMAL(10,2),
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX "idx_machinery_companyId" ON "machinery"("companyId");

-- ============================================================
-- VENDORS
-- ============================================================
CREATE TABLE "vendors" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "contactPerson" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "gstNumber" TEXT,
  "address" TEXT,
  "supplyItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "rating" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX "idx_vendors_companyId" ON "vendors"("companyId");

-- ============================================================
-- TENDERS (UPLOADED BY USER)
-- ============================================================
CREATE TABLE "tenders" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedById" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "sourceType" TEXT NOT NULL DEFAULT 'USER_UPLOAD',
  "sourcePortal" TEXT,
  "sourceUrl" TEXT,
  "originalFileUrl" TEXT,
  "originalFilePath" TEXT,
  "originalFileName" TEXT,
  "tenderNumber" TEXT,
  "nitNumber" TEXT,
  "department" TEXT,
  "organization" TEXT,
  "subOrganization" TEXT,
  "workName" TEXT NOT NULL,
  "workDescription" TEXT,
  "workLocation" TEXT,
  "district" TEXT,
  "state" TEXT,
  "sector" TEXT,
  "subSector" TEXT,
  "estimatedCost" DECIMAL(15,2),
  "emdAmount" DECIMAL(15,2),
  "emdType" TEXT,
  "tenderFee" DECIMAL(10,2),
  "tenderFeeMode" TEXT,
  "publishedDate" TIMESTAMP(3),
  "preBidMeetingDate" TIMESTAMP(3),
  "lastSubmissionDate" TIMESTAMP(3),
  "openingDate" TIMESTAMP(3),
  "completionPeriod" TEXT,
  "completionDays" INTEGER,
  "eligibilityCriteria" JSONB,
  "requiredClass" TEXT,
  "requiredTurnover" DECIMAL(15,2),
  "requiredExperience" TEXT,
  "requiredStaff" JSONB,
  "requiredMachinery" JSONB,
  "securityDepositPct" DECIMAL(5,2),
  "performanceGuarPct" DECIMAL(5,2),
  "mobilizationAdv" BOOLEAN NOT NULL DEFAULT false,
  "mobilizationAdvPct" DECIMAL(5,2),
  "paymentTerms" TEXT,
  "priceEscalation" BOOLEAN NOT NULL DEFAULT false,
  "ldClause" TEXT,
  "defectLiabilityPeriod" TEXT,
  "disputeResolution" TEXT,
  "rawText" TEXT,
  "aiSummaryEn" TEXT,
  "aiSummaryBn" TEXT,
  "aiSummaryHi" TEXT,
  "keyHighlights" JSONB,
  "riskFlags" JSONB,
  "requiredDocuments" JSONB,
  "extractedData" JSONB,
  "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "processingError" TEXT,
  "processedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX "idx_tenders_uploadedById" ON "tenders"("uploadedById");
CREATE INDEX "idx_tenders_status" ON "tenders"("processingStatus");
CREATE INDEX "idx_tenders_deadline" ON "tenders"("lastSubmissionDate");

-- ============================================================
-- TENDER DOCUMENTS
-- ============================================================
CREATE TABLE "tender_documents" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenderId" TEXT NOT NULL REFERENCES "tenders"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "fileSize" INTEGER,
  "mimeType" TEXT,
  "pageCount" INTEGER,
  "isProcessed" BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX "idx_tender_docs_tenderId" ON "tender_documents"("tenderId");

-- ============================================================
-- BOQ ITEMS
-- ============================================================
CREATE TABLE "boq_items" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenderId" TEXT NOT NULL REFERENCES "tenders"("id") ON DELETE CASCADE,
  "slNo" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "unit" TEXT,
  "quantity" DECIMAL(15,3),
  "sorRate" DECIMAL(15,2),
  "marketRate" DECIMAL(15,2),
  "suggestedRate" DECIMAL(15,2),
  "userRate" DECIMAL(15,2),
  "rateAnalysis" JSONB,
  "estimatedAmount" DECIMAL(15,2),
  "userBidAmount" DECIMAL(15,2),
  "parentId" TEXT REFERENCES "boq_items"("id") ON DELETE CASCADE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "idx_boq_tenderId" ON "boq_items"("tenderId");

-- ============================================================
-- TENDER TRACKS
-- ============================================================
CREATE TABLE "tender_tracks" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "tenderId" TEXT NOT NULL REFERENCES "tenders"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
  "matchScore" INTEGER,
  "eligibilityStatus" TEXT,
  "eligibilityDetails" JSONB,
  "decisionScore" INTEGER,
  "recommendation" TEXT,
  "userNotes" TEXT,
  "skippedReason" TEXT,
  "bidPercentage" DECIMAL(5,2),
  "bidAmount" DECIMAL(15,2),
  "submittedAt" TIMESTAMP(3),
  "submissionRef" TEXT,
  "resultStatus" TEXT,
  "l1Amount" DECIMAL(15,2),
  "ourAmount" DECIMAL(15,2),
  "l1Bidder" TEXT,
  UNIQUE("companyId", "tenderId")
);

CREATE INDEX "idx_tracks_companyId" ON "tender_tracks"("companyId");
CREATE INDEX "idx_tracks_tenderId" ON "tender_tracks"("tenderId");
CREATE INDEX "idx_tracks_status" ON "tender_tracks"("status");

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE "projects" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "tenderTrackId" TEXT UNIQUE REFERENCES "tender_tracks"("id") ON DELETE SET NULL,
  "name" TEXT NOT NULL,
  "projectCode" TEXT,
  "department" TEXT NOT NULL,
  "workOrderNumber" TEXT,
  "workOrderDate" TIMESTAMP(3),
  "contractValue" DECIMAL(15,2) NOT NULL,
  "startDate" TIMESTAMP(3),
  "completionDate" TIMESTAMP(3),
  "actualCompletionDate" TIMESTAMP(3),
  "dlpEndDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "progressPercent" DECIMAL(5,2),
  "totalBilled" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "totalReceived" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "totalExpenses" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "sdDeducted" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "sdReleased" DECIMAL(15,2) NOT NULL DEFAULT 0
);

CREATE INDEX "idx_projects_companyId" ON "projects"("companyId");
CREATE INDEX "idx_projects_status" ON "projects"("status");

-- ============================================================
-- PROJECT BOQ PROGRESS
-- ============================================================
CREATE TABLE "project_boq_progress" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "boqItemId" TEXT NOT NULL,
  "slNo" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "unit" TEXT,
  "contractQty" DECIMAL(15,3) NOT NULL,
  "rate" DECIMAL(15,2) NOT NULL,
  "totalCompleted" DECIMAL(15,3) NOT NULL DEFAULT 0,
  "lastBilledQty" DECIMAL(15,3) NOT NULL DEFAULT 0
);

CREATE INDEX "idx_progress_projectId" ON "project_boq_progress"("projectId");

-- ============================================================
-- RA BILLS
-- ============================================================
CREATE TABLE "ra_bills" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "billNumber" TEXT NOT NULL,
  "billType" TEXT NOT NULL DEFAULT 'RA',
  "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "periodFrom" TIMESTAMP(3),
  "periodTo" TIMESTAMP(3),
  "grossAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "sdDeduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "itTdsDeduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "gstTdsDeduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "labourCess" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "royaltyDeduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "advanceRecovery" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "otherDeductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "ldDeduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "netPayable" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "gstAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
  "gstInvoiceNumber" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "submittedDate" TIMESTAMP(3),
  "paymentDate" TIMESTAMP(3),
  "paymentAmount" DECIMAL(15,2),
  "paymentReference" TEXT,
  "billDocumentUrl" TEXT
);

CREATE INDEX "idx_bills_projectId" ON "ra_bills"("projectId");

-- ============================================================
-- RA BILL ITEMS
-- ============================================================
CREATE TABLE "ra_bill_items" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "billId" TEXT NOT NULL REFERENCES "ra_bills"("id") ON DELETE CASCADE,
  "boqItemId" TEXT,
  "slNo" TEXT,
  "description" TEXT NOT NULL,
  "unit" TEXT,
  "totalQty" DECIMAL(15,3) NOT NULL,
  "prevBilledQty" DECIMAL(15,3) NOT NULL DEFAULT 0,
  "currentQty" DECIMAL(15,3) NOT NULL,
  "rate" DECIMAL(15,2) NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE "attendance_records" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "date" TIMESTAMP(3) NOT NULL,
  "projectId" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "workerName" TEXT NOT NULL,
  "workerAadhaar" TEXT,
  "skillType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "overtimeHours" DECIMAL(4,2),
  "dailyWage" DECIMAL(10,2) NOT NULL
);

CREATE INDEX "idx_attendance_projectId" ON "attendance_records"("projectId");
CREATE INDEX "idx_attendance_date" ON "attendance_records"("date");

-- ============================================================
-- MATERIAL LEDGER
-- ============================================================
CREATE TABLE "material_ledger" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "date" TIMESTAMP(3) NOT NULL,
  "transactionType" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantity" DECIMAL(15,3) NOT NULL,
  "rate" DECIMAL(15,2),
  "amount" DECIMAL(15,2),
  "vendorName" TEXT,
  "billNumber" TEXT,
  "vehicleNumber" TEXT,
  "boqItemId" TEXT,
  "workDescription" TEXT
);

CREATE INDEX "idx_material_projectId" ON "material_ledger"("projectId");

-- ============================================================
-- PROJECT EXPENSES
-- ============================================================
CREATE TABLE "project_expenses" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "date" TIMESTAMP(3) NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "vendorName" TEXT,
  "billNumber" TEXT,
  "amount" DECIMAL(15,2) NOT NULL,
  "gstAmount" DECIMAL(15,2),
  "totalAmount" DECIMAL(15,2) NOT NULL,
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "receiptUrl" TEXT,
  "isOcrProcessed" BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX "idx_expenses_projectId" ON "project_expenses"("projectId");

-- ============================================================
-- CHAT SESSIONS
-- ============================================================
CREATE TABLE "chat_sessions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" TEXT,
  "language" TEXT NOT NULL DEFAULT 'BENGALI',
  "activeTenderId" TEXT,
  "activeProjectId" TEXT
);

CREATE INDEX "idx_chatsessions_userId" ON "chat_sessions"("userId");

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE "chat_messages" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sessionId" TEXT NOT NULL REFERENCES "chat_sessions"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "language" TEXT,
  "actionType" TEXT,
  "actionData" JSONB,
  "isHelpful" BOOLEAN
);

CREATE INDEX "idx_chatmsgs_sessionId" ON "chat_messages"("sessionId");

-- ============================================================
-- COMPLIANCE RECORDS
-- ============================================================
CREATE TABLE "compliance_records" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "projectId" TEXT,
  "type" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "filedDate" TIMESTAMP(3),
  "amount" DECIMAL(15,2),
  "paidAmount" DECIMAL(15,2),
  "challanNumber" TEXT,
  "receiptUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT
);

CREATE INDEX "idx_compliance_companyId" ON "compliance_records"("companyId");
CREATE INDEX "idx_compliance_dueDate" ON "compliance_records"("dueDate");

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
CREATE TABLE "activity_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "details" JSONB
);

CREATE INDEX "idx_activitylogs_userId" ON "activity_logs"("userId");

-- ============================================================
-- GENERATED DOCUMENTS
-- ============================================================
CREATE TABLE "generated_documents" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "tenderId" TEXT,
  "projectId" TEXT,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "generatedFrom" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isLatest" BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX "idx_gendocs_companyId" ON "generated_documents"("companyId");
CREATE INDEX "idx_gendocs_tenderId" ON "generated_documents"("tenderId");

-- ============================================================
-- AUTO-UPDATE updatedAt TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON "companies" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_preferences_updated BEFORE UPDATE ON "company_preferences" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_registrations_updated BEFORE UPDATE ON "contractor_registrations" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON "company_documents" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_staff_updated BEFORE UPDATE ON "staff_members" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tenders_updated BEFORE UPDATE ON "tenders" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tracks_updated BEFORE UPDATE ON "tender_tracks" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON "projects" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bills_updated BEFORE UPDATE ON "ra_bills" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chatsessions_updated BEFORE UPDATE ON "chat_sessions" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_progress_updated BEFORE UPDATE ON "project_boq_progress" FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DONE! All tables created successfully.
-- ============================================================
SELECT 'Database setup complete. ' || COUNT(*) || ' tables created.' AS status
FROM information_schema.tables
WHERE table_schema = 'public';