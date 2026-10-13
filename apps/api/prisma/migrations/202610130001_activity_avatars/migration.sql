-- ActivitiesService sets this transaction-local context only after authorizing
-- the referenced activity. Existing owner-only photo writes remain unchanged.
CREATE POLICY avatar_activity_reader ON "UserAvatar" FOR SELECT
  USING ("userId" = nullif(current_setting('app.activity_actor_id', true), '')::uuid);
