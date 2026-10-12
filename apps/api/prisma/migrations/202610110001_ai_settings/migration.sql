CREATE TABLE "AiConfiguration" (
  "key" TEXT PRIMARY KEY,
  "environment" TEXT NOT NULL,
  "scope" TEXT NOT NULL CHECK ("scope" IN ('managed','local')),
  "sessionId" UUID UNIQUE REFERENCES "Session"(id) ON DELETE CASCADE,
  "ownerId" UUID REFERENCES "User"(id) ON DELETE RESTRICT,
  "source" TEXT NOT NULL CHECK ("source" IN ('managed','temporary')),
  "connectionRevision" TEXT,
  "chatText" TEXT,
  "imageGeneration" TEXT,
  "warnAt80" BOOLEAN NOT NULL DEFAULT true,
  "pauseAtLimit" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "updatedBy" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  CHECK (("scope" = 'managed' AND "sessionId" IS NULL AND "ownerId" IS NULL AND "source" = 'managed')
      OR ("scope" = 'local' AND "environment" = 'local' AND "sessionId" IS NOT NULL AND "ownerId" IS NOT NULL))
);
CREATE UNIQUE INDEX "AiConfiguration_managed_environment" ON "AiConfiguration"("environment") WHERE "scope" = 'managed';
CREATE TABLE "AiOperation" (
  id UUID PRIMARY KEY,
  "environment" TEXT NOT NULL,
  "actorId" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "sessionId" UUID NOT NULL,
  "tenantId" UUID REFERENCES "Tenant"(id) ON DELETE RESTRICT,
  "conversationId" UUID REFERENCES "Conversation"(id) ON DELETE RESTRICT,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('chat','test')),
  "feature" TEXT NOT NULL CHECK ("feature" IN ('chatText','imageGeneration')),
  "source" TEXT NOT NULL CHECK ("source" IN ('managed','temporary')),
  "modelId" TEXT NOT NULL,
  "configurationVersion" INTEGER NOT NULL,
  "connectionRevision" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued' CHECK ("status" IN ('queued','running','completed','failed','cancelled','interrupted')),
  "failureCode" TEXT,
  "reservedTokens" INTEGER NOT NULL DEFAULT 0 CHECK ("reservedTokens" >= 0),
  "inputTokens" INTEGER CHECK ("inputTokens" >= 0),
  "outputTokens" INTEGER CHECK ("outputTokens" >= 0),
  "thinkingTokens" INTEGER CHECK ("thinkingTokens" >= 0),
  "totalTokens" INTEGER CHECK ("totalTokens" >= 0),
  "sentAt" TIMESTAMPTZ,
  "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL,
  CHECK (("kind" = 'chat' AND "tenantId" IS NOT NULL AND "conversationId" IS NOT NULL AND "feature" = 'chatText')
      OR ("kind" = 'test' AND "tenantId" IS NULL AND "conversationId" IS NULL))
);
CREATE INDEX "AiOperation_environment_actorId_createdAt_idx" ON "AiOperation"("environment","actorId","createdAt");
CREATE INDEX "AiOperation_status_updatedAt_idx" ON "AiOperation"("status","updatedAt");

ALTER TABLE "AiConfiguration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiConfiguration" FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_configuration_read ON "AiConfiguration" FOR SELECT USING (
  ("scope" = 'managed' AND (current_setting('app.platform_global',true) = 'true' OR current_setting('app.ai_execution',true) = 'true'))
  OR ("scope" = 'local' AND current_setting('app.platform_global',true) = 'true'
    AND "ownerId" = nullif(current_setting('app.actor_id',true),'')::uuid
    AND "sessionId" = nullif(current_setting('app.ai_session_id',true),'')::uuid)
);
CREATE POLICY ai_configuration_insert ON "AiConfiguration" FOR INSERT WITH CHECK (
  current_setting('app.platform_global',true) = 'true'
  AND ("scope" = 'managed' OR ("ownerId" = nullif(current_setting('app.actor_id',true),'')::uuid
    AND "sessionId" = nullif(current_setting('app.ai_session_id',true),'')::uuid))
);
CREATE POLICY ai_configuration_update ON "AiConfiguration" FOR UPDATE USING (
  current_setting('app.platform_global',true) = 'true'
  AND ("scope" = 'managed' OR ("ownerId" = nullif(current_setting('app.actor_id',true),'')::uuid
    AND "sessionId" = nullif(current_setting('app.ai_session_id',true),'')::uuid))
) WITH CHECK (
  current_setting('app.platform_global',true) = 'true'
  AND ("scope" = 'managed' OR ("ownerId" = nullif(current_setting('app.actor_id',true),'')::uuid
    AND "sessionId" = nullif(current_setting('app.ai_session_id',true),'')::uuid))
);
CREATE POLICY ai_configuration_cleanup ON "AiConfiguration" FOR DELETE USING (
  "scope" = 'local' AND current_setting('app.ai_worker',true) = 'true'
);

ALTER TABLE "AiOperation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiOperation" FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_operation_owner ON "AiOperation" USING (
  "actorId" = nullif(current_setting('app.actor_id',true),'')::uuid
  AND (("kind" = 'chat' AND "tenantId" = nullif(current_setting('app.tenant_id',true),'')::uuid)
    OR ("kind" = 'test' AND current_setting('app.platform_global',true) = 'true'
      AND "sessionId" = nullif(current_setting('app.ai_session_id',true),'')::uuid))
) WITH CHECK (
  "actorId" = nullif(current_setting('app.actor_id',true),'')::uuid
  AND (("kind" = 'chat' AND "tenantId" = nullif(current_setting('app.tenant_id',true),'')::uuid)
    OR ("kind" = 'test' AND current_setting('app.platform_global',true) = 'true'
      AND "sessionId" = nullif(current_setting('app.ai_session_id',true),'')::uuid))
);
CREATE POLICY ai_operation_usage_read ON "AiOperation" FOR SELECT USING (
  (current_setting('app.platform_global',true) = 'true' AND current_setting('app.ai_admin',true) = 'true')
  OR (current_setting('app.ai_execution',true) = 'true' AND "actorId" = nullif(current_setting('app.actor_id',true),'')::uuid)
  OR current_setting('app.ai_worker',true) = 'true'
);
CREATE POLICY ai_operation_reconcile ON "AiOperation" FOR UPDATE USING (
  current_setting('app.ai_worker',true) = 'true'
) WITH CHECK (current_setting('app.ai_worker',true) = 'true');
GRANT SELECT,INSERT,UPDATE,DELETE ON "AiConfiguration" TO market_runtime;
GRANT SELECT,INSERT,UPDATE ON "AiOperation" TO market_runtime;
