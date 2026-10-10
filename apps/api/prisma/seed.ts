import {PrismaClient} from '../src/generated/prisma/client.js';
import {PrismaPg} from '@prisma/adapter-pg';
import {hash,argon2id} from 'argon2';
if(process.env.NODE_ENV==='production')throw new Error('Demo seed is disabled in production');
const url=process.env.MIGRATION_DATABASE_URL;if(!url)throw new Error('MIGRATION_DATABASE_URL required');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:url})});
const passwordHash=await hash('MarketGlobal#2027',{type:argon2id,memoryCost:19456,timeCost:2,parallelism:1});
const reset=process.argv.includes('--reset-demo-passwords');
await db.$transaction(async tx=>{
 await tx.$queryRaw`SELECT pg_advisory_xact_lock(7283910042::bigint)::text`;
 const profiles=[['global','Global'],['superadmin','Super Admin'],['admin','Admin'],['user','User']] as const;
 const users=[];
 for(const [key,name] of profiles){users.push(await tx.user.upsert({where:{email:key+'@marketanalysis.com'},create:{email:key+'@marketanalysis.com',name,passwordHash,platformRole:key==='global'?'GLOBAL':null,preference:{create:{locale:'pt-BR',theme:'light'}}},update:reset?{passwordHash}:{}}));}
 for(const [index,label] of ['a','b'].entries()){
  const agency=await tx.agency.upsert({where:{slug:'agencia-demo-'+label},create:{slug:'agencia-demo-'+label,name:'Agência Demo '+label.toUpperCase(),demo:true},update:{}});
  if(!agency.demo)throw new Error('Refusing to provision non-demo agency');
  await tx.agencyMembership.upsert({where:{agencyId_userId:{agencyId:agency.id,userId:users[1]!.id}},create:{agencyId:agency.id,userId:users[1]!.id},update:{}});
  for(let n=1;n<=2;n++){
   const tenant=await tx.tenant.upsert({where:{agencyId_slug:{agencyId:agency.id,slug:'cliente-'+n}},create:{agencyId:agency.id,name:['Aurora','Horizonte','Atlas','Cobalto'][index*2+n-1]!,slug:'cliente-'+n,status:'active',demo:true},update:{}});
   if(!tenant.demo)throw new Error('Refusing to provision non-demo tenant');
   for(const [user,role] of [[users[2]!,'ADMIN'],[users[3]!,'USER']] as const)await tx.tenantMembership.upsert({where:{tenantId_userId:{tenantId:tenant.id,userId:user.id}},create:{tenantId:tenant.id,userId:user.id,role},update:{}});
  }
 }
},{timeout:15000});
await db.$disconnect();console.log('Demo identities and memberships provisioned. Existing passwords preserved unless explicit reset was requested.');
