import {S3Client,CreateBucketCommand,PutBucketCorsCommand} from '@aws-sdk/client-s3';
import {createPresignedPost} from '@aws-sdk/s3-presigned-post';
const client=new S3Client({endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,forcePathStyle:true,credentials:{accessKeyId:process.env.S3_ACCESS_KEY!,secretAccessKey:process.env.S3_SECRET_KEY!}});
const Bucket=process.env.S3_BUCKET!;
try{await client.send(new CreateBucketCommand({Bucket}));}catch(e){if(!['BucketAlreadyOwnedByYou','BucketAlreadyExists'].includes((e as Error).name))throw e;}
await client.send(new PutBucketCorsCommand({Bucket,CORSConfiguration:{CORSRules:[{AllowedOrigins:process.env.ALLOWED_ORIGINS!.split(','),AllowedMethods:['GET','HEAD','POST'],AllowedHeaders:['*'],ExposeHeaders:['ETag'],MaxAgeSeconds:300}]}}));
const p=await createPresignedPost(client,{Bucket,Key:'probe/over-limit',Expires:60,Conditions:[['content-length-range',1,16]]});
const form=new FormData();for(const[k,v]of Object.entries(p.fields))form.append(k,v);form.append('file',new Blob(['x'.repeat(32)]),'probe.txt');
const response=await fetch(p.url,{method:'POST',body:form});console.log(JSON.stringify({probe:'post-policy-over-limit',status:response.status,body:(await response.text()).slice(0,300)}));
