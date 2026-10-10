ALTER TABLE "StoredFile" ADD COLUMN "cleanedAt" TIMESTAMPTZ;
CREATE INDEX file_cleanup_pending ON "StoredFile" ("tenantId", "expiresAt") WHERE "cleanedAt" IS NULL;
