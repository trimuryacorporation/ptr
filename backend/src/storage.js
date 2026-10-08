import {createReadStream} from 'node:fs';
import {convertAudio} from './audio-conversion.js';
import {S3Client,GetObjectCommand,PutObjectCommand,HeadObjectCommand,HeadBucketCommand} from '@aws-sdk/client-s3';import {getSignedUrl} from '@aws-sdk/s3-request-presigner';import {deliveryConfig} from './integration-settings.js';
export function r2Configured(config){return !!(config.R2_ACCOUNT_ID&&config.R2_BUCKET&&config.R2_ACCESS_KEY_ID&&config.R2_SECRET_ACCESS_KEY)}
export function storageOptions(config){if(config.R2_ACCOUNT_ID||config.R2_BUCKET){if(!r2Configured(config))throw Error('Cloudflare R2 is not configured. Ask your administrator to complete API Settings.');return {bucket:config.R2_BUCKET,options:{region:'auto',endpoint:'https://'+config.R2_ACCOUNT_ID+'.r2.cloudflarestorage.com',forcePathStyle:true,requestChecksumCalculation:'WHEN_REQUIRED',credentials:{accessKeyId:config.R2_ACCESS_KEY_ID,secretAccessKey:config.R2_SECRET_ACCESS_KEY}}}}if(!process.env.S3_BUCKET)throw Error('Recording storage is not configured. Ask your administrator to configure Cloudflare R2 in API Settings.');return {bucket:process.env.S3_BUCKET,options:{region:process.env.S3_REGION||'us-east-1',endpoint:process.env.S3_ENDPOINT||undefined,forcePathStyle:!!process.env.S3_ENDPOINT,requestChecksumCalculation:'WHEN_REQUIRED',credentials:process.env.S3_ACCESS_KEY_ID?{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}:undefined}}}
async function storage(){const {bucket,options}=storageOptions(await deliveryConfig());return {bucket,client:new S3Client(options)}}
export async function signedUpload(key,contentType){const {bucket,client}=await storage();return getSignedUrl(client,new PutObjectCommand({Bucket:bucket,Key:key,ContentType:contentType}),{expiresIn:900})}
export async function signedDownload(key){const {bucket,client}=await storage();return getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:key}),{expiresIn:900})}
export async function uploadedObject(key){const {bucket,client}=await storage();return client.send(new HeadObjectCommand({Bucket:bucket,Key:key}))}
export async function testStorage(config){if(!r2Configured(config))throw Error('Save complete R2 settings before testing.');const {bucket,options}=storageOptions(config);await new S3Client(options).send(new HeadBucketCommand({Bucket:bucket}))}

export async function uploadRecording(key,contentType,body,size,signal){const {bucket,client}=await storage();try{return await client.send(new PutObjectCommand({Bucket:bucket,Key:key,ContentType:contentType,ContentLength:size,Body:body}),{abortSignal:signal})}finally{client.destroy()}}

export async function recordingStream(key,signal){const {bucket,client}=await storage();try{const result=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}),{abortSignal:signal});result.Body.once('close',()=>client.destroy());return result.Body}catch(error){client.destroy();throw error}}
export async function normalizeRecording(data,signal,operations={recordingStream,uploadRecording,uploadedObject}){
 const converted=await convertAudio(await operations.recordingStream(data.key,signal),'opus',{signal});
 const key=data.key.replace(/\.(webm|mp4|ogg|opus)$/i,'.opus');
 try{await operations.uploadRecording(key,converted.mimeType,createReadStream(converted.path),converted.size,signal);const object=await operations.uploadedObject(key);if(object.ContentLength!==converted.size||object.ContentType!==converted.mimeType)throw new Error('Opus upload verification failed');return {key,mimeType:converted.mimeType,size:converted.size}}finally{await converted.cleanup()}
}
