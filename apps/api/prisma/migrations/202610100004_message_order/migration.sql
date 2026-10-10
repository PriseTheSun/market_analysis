ALTER TABLE "Message" ADD COLUMN position INTEGER;
WITH positions AS (
 SELECT id,row_number() OVER (PARTITION BY "tenantId","conversationId" ORDER BY "createdAt",role DESC,id)::integer AS n FROM "Message"
) UPDATE "Message" m SET position=p.n FROM positions p WHERE m.id=p.id;
ALTER TABLE "Message" ALTER COLUMN position SET NOT NULL;
CREATE UNIQUE INDEX "Message_tenantId_conversationId_position_key" ON "Message" ("tenantId","conversationId",position);
