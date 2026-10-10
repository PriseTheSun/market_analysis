-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('GLOBAL');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('provisioning', 'active', 'disabled');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('pending', 'uploading', 'available', 'failed', 'deleting', 'deleted');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('pending', 'streaming', 'completed', 'failed', 'cancelled', 'interrupted');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "platformRole" "PlatformRole",
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyMembership" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'provisioning',
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMembership" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "TenantRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "role" "TenantRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdBy" UUID NOT NULL,
    "bootstrap" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "consumedAt" TIMESTAMPTZ,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "organization" VARCHAR(160) NOT NULL,
    "message" VARCHAR(2000),
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "agencyId" UUID,
    "tenantId" UUID,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMPTZ,
    "reason" VARCHAR(1000),
    "invitationId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "consumedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" UUID NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'pt-BR',
    "theme" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(160) NOT NULL,
    "size" INTEGER NOT NULL,
    "objectKey" TEXT NOT NULL,
    "temporaryKey" TEXT NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'pending',
    "failureCode" TEXT,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "OperationStatus" NOT NULL,
    "operationId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatOperation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "userMessageId" UUID NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'pending',
    "failureCode" TEXT,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ChatOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "recipientId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "eventKey" TEXT NOT NULL,
    "resourceId" UUID,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "tenantId" UUID,
    "agencyId" UUID,
    "resourceId" TEXT,
    "result" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDelivery" (
    "id" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "encryptedPayload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMPTZ,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_active_platformRole_idx" ON "User"("active", "platformRole");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_slug_key" ON "Agency"("slug");

-- CreateIndex
CREATE INDEX "AgencyMembership_userId_active_idx" ON "AgencyMembership"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyMembership_agencyId_userId_key" ON "AgencyMembership"("agencyId", "userId");

-- CreateIndex
CREATE INDEX "Tenant_agencyId_status_idx" ON "Tenant"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_agencyId_slug_key" ON "Tenant"("agencyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_agencyId_id_key" ON "Tenant"("agencyId", "id");

-- CreateIndex
CREATE INDEX "TenantMembership_userId_active_idx" ON "TenantMembership"("userId", "active");

-- CreateIndex
CREATE INDEX "TenantMembership_tenantId_active_role_idx" ON "TenantMembership"("tenantId", "active", "role");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_tenantId_email_idx" ON "Invitation"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequest_invitationId_key" ON "AccessRequest"("invitationId");

-- CreateIndex
CREATE INDEX "AccessRequest_tenantId_status_createdAt_idx" ON "AccessRequest"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AccessRequest_status_createdAt_idx" ON "AccessRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_tenantId_userId_version_key" ON "OnboardingProgress"("tenantId", "userId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_objectKey_key" ON "StoredFile"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_temporaryKey_key" ON "StoredFile"("temporaryKey");

-- CreateIndex
CREATE INDEX "StoredFile_tenantId_status_createdAt_idx" ON "StoredFile"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_tenantId_ownerId_updatedAt_idx" ON "Conversation"("tenantId", "ownerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_tenantId_id_key" ON "Conversation"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Message_tenantId_conversationId_createdAt_idx" ON "Message"("tenantId", "conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_tenantId_operationId_role_key" ON "Message"("tenantId", "operationId", "role");

-- CreateIndex
CREATE INDEX "ChatOperation_tenantId_userId_status_idx" ON "ChatOperation"("tenantId", "userId", "status");

-- CreateIndex
CREATE INDEX "Notification_recipientId_tenantId_readAt_createdAt_idx" ON "Notification"("recipientId", "tenantId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_recipientId_eventKey_key" ON "Notification"("recipientId", "eventKey");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDelivery_eventKey_key" ON "EmailDelivery"("eventKey");

-- CreateIndex
CREATE INDEX "EmailDelivery_status_nextAttemptAt_idx" ON "EmailDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_agencyId_tenantId_fkey" FOREIGN KEY ("agencyId", "tenantId") REFERENCES "Tenant"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_tenantId_conversationId_fkey" FOREIGN KEY ("tenantId", "conversationId") REFERENCES "Conversation"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatOperation" ADD CONSTRAINT "ChatOperation_tenantId_conversationId_fkey" FOREIGN KEY ("tenantId", "conversationId") REFERENCES "Conversation"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

