ALTER TABLE "AiOperation" ADD CONSTRAINT "AiOperation_conversation_scope_fk"
  FOREIGN KEY ("tenantId", "conversationId") REFERENCES "Conversation"("tenantId",id) ON DELETE RESTRICT;
CREATE POLICY ai_configuration_worker_read ON "AiConfiguration" FOR SELECT USING (
  current_setting('app.ai_worker',true) = 'true'
);
