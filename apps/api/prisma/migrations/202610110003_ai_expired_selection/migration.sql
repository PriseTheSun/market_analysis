-- Keep the selected source visible to execution after Global access is revoked.
-- The credential still requires current Global access; no fallback is permitted.
CREATE POLICY ai_configuration_local_execution ON "AiConfiguration" FOR SELECT USING (
  "scope" = 'local' AND current_setting('app.ai_execution',true) = 'true'
  AND "ownerId" = nullif(current_setting('app.actor_id',true),'')::uuid
  AND "sessionId" = nullif(current_setting('app.ai_session_id',true),'')::uuid
);
