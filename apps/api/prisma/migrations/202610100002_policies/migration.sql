CREATE UNIQUE INDEX access_request_pending_email ON "AccessRequest" (email) WHERE status = 'pending';
CREATE UNIQUE INDEX conversation_active_operation ON "ChatOperation" ("tenantId", "conversationId") WHERE status IN ('pending', 'streaming');
ALTER TABLE "AccessRequest" ADD CONSTRAINT request_scope_consistent CHECK (("agencyId" IS NULL) = ("tenantId" IS NULL));
ALTER TABLE "User" ADD CONSTRAINT normalized_email CHECK (email = lower(trim(email)));
ALTER TABLE "AgencyMembership" ADD CONSTRAINT agency_role CHECK (role = 'SUPER_ADMIN');
ALTER TABLE "UserPreference" ADD CONSTRAINT preference_theme CHECK (theme IS NULL OR theme IN ('light','dark'));
ALTER TABLE "UserPreference" ADD CONSTRAINT preference_locale CHECK (locale IN ('pt-BR','en','es'));
ALTER TABLE "StoredFile" ADD CONSTRAINT positive_file_size CHECK (size > 0);
ALTER TABLE "Message" ADD CONSTRAINT message_role CHECK (role IN ('user','assistant'));
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['StoredFile','Conversation','Message','ChatOperation','OnboardingProgress'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  EXECUTE format('CREATE POLICY tenant_boundary ON %I USING ("tenantId" = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK ("tenantId" = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)', t);
 END LOOP;
END $$;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
CREATE POLICY notification_read ON "Notification" FOR SELECT USING (
 "recipientId" = nullif(current_setting('app.actor_id', true), '')::uuid
 AND ("tenantId" = nullif(current_setting('app.tenant_id', true), '')::uuid OR ("tenantId" IS NULL AND current_setting('app.platform_global',true) = 'true'))
);
CREATE POLICY notification_update ON "Notification" FOR UPDATE USING (
 "recipientId" = nullif(current_setting('app.actor_id', true), '')::uuid
 AND ("tenantId" = nullif(current_setting('app.tenant_id', true), '')::uuid OR ("tenantId" IS NULL AND current_setting('app.platform_global',true) = 'true'))
) WITH CHECK ("recipientId" = nullif(current_setting('app.actor_id', true), '')::uuid);
CREATE POLICY notification_create ON "Notification" FOR INSERT WITH CHECK (current_setting('app.event_write',true) = 'true');
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO market_runtime;
REVOKE UPDATE,DELETE ON "AuditLog" FROM market_runtime;
REVOKE ALL ON "_prisma_migrations" FROM market_runtime;
