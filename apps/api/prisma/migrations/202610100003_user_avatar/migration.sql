ALTER TABLE "User" ADD COLUMN "avatarVersion" UUID;

CREATE TABLE "UserAvatar" (
  "userId" UUID PRIMARY KEY REFERENCES "User"(id) ON DELETE RESTRICT,
  image BYTEA NOT NULL CHECK (octet_length(image) BETWEEN 1 AND 262144)
);

ALTER TABLE "UserAvatar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAvatar" FORCE ROW LEVEL SECURITY;
CREATE POLICY avatar_owner ON "UserAvatar"
  USING ("userId" = nullif(current_setting('app.actor_id', true), '')::uuid)
  WITH CHECK ("userId" = nullif(current_setting('app.actor_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "UserAvatar" TO market_runtime;
