import 'express-async-errors';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFile,access} from 'node:fs/promises';
import express from 'express';
import jwt from 'jsonwebtoken';
import {convertAudio} from './audio-conversion.js';
import {normalizeRecording} from './storage.js';
import {createRecordingDownloadRouter} from './recording-download-routes.js';
import {RecordingFile,RecordingSession} from './models.js';
process.env.JWT_ACCESS_SECRET='audio-format-test';
function tone(){const samples=4800,buffer=Buffer.alloc(44+samples*2);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(48000,24);buffer.writeUInt32LE(96000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++)buffer.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/48000)*10000),44+i*2);return buffer}
test('real conversion produces Ogg Opus, MP3 and PCM WAV and removes temporary files',async()=>{
 let opus;
 for(const format of ['opus','mp3','wav']){
  const result=await convertAudio(Readable.from(opus||tone()),format);try{const bytes=await readFile(result.path);assert.equal(bytes.length,result.size);if(format==='opus'){assert.equal(bytes.subarray(0,4).toString(),'OggS');assert.ok(bytes.includes(Buffer.from('OpusHead')));opus=bytes}else if(format==='wav'){assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WAVE');assert.equal(bytes.readUInt16LE(20),1)}else{assert.ok(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===255)}}finally{await result.cleanup()}await assert.rejects(access(result.path));
 }
 await assert.rejects(convertAudio(Readable.from('not audio'),'opus'),/conversion failed/);
});
test('upload normalization stores an actual .opus object and verifies cloud metadata',async()=>{
 let uploaded,metadata;
 const operations={recordingStream:async()=>Readable.from(tone()),uploadRecording:async(key,type,body,size)=>{const chunks=[];for await(const chunk of body)chunks.push(chunk);uploaded=Buffer.concat(chunks);metadata={key,ContentType:type,ContentLength:size}},uploadedObject:async()=>metadata};
 const result=await normalizeRecording({key:'recordings/session/user/speakerA.webm'},undefined,operations);
 assert.equal(result.key,'recordings/session/user/speakerA.opus');assert.equal(result.mimeType,'audio/ogg;codecs=opus');assert.equal(result.size,uploaded.length);assert.equal(uploaded.subarray(0,4).toString(),'OggS');assert.ok(uploaded.includes(Buffer.from('OpusHead')));
 operations.uploadedObject=async()=>({ContentLength:1,ContentType:'wrong'});await assert.rejects(normalizeRecording({key:'recordings/session/user/speakerA.webm'},undefined,operations),/verification failed/);
});
test('Admin and Super Admin choose MP3 or WAV; other roles cannot download converted audio',async()=>{
 const find=RecordingFile.findById,exists=RecordingSession.exists,files=RecordingFile.find;const id='aaaaaaaaaaaaaaaaaaaaaaaa';
 RecordingFile.findById=async()=>({_id:id,session:id,channel:'speakerA',key:'recordings/test.opus'});RecordingSession.exists=async()=>true;
 RecordingFile.find=()=>({select:value=>{assert.equal(value,'_id channel mimeType size');return {sort:async()=>[{_id:id,channel:'speakerA'}]}}});
 const app=express();app.use(createRecordingDownloadRouter({recordingStream:async()=>Readable.from(tone())}));app.use((error,req,res,next)=>res.status(400).json({message:'Invalid request'}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const get=(path,role)=>fetch('http://127.0.0.1:'+server.address().port+path,{headers:role?{Authorization:'Bearer '+jwt.sign({id,role},process.env.JWT_ACCESS_SECRET)}:{}});
 try{
  for(const role of [undefined,'candidate','reviewer'])assert.equal((await get('/files/'+id+'/download?format=wav',role)).status,role?403:401);
  for(const role of ['admin','super_admin']){assert.equal((await get('/sessions/'+id+'/recording-files',role)).status,200);for(const format of ['mp3','wav']){const r=await get('/files/'+id+'/download?format='+format,role);assert.equal(r.status,200);assert.ok(r.headers.get('content-disposition').endsWith('.'+format+'"'));const bytes=Buffer.from(await r.arrayBuffer());assert.ok(bytes.length>44);if(format==='wav')assert.equal(bytes.subarray(0,4).toString(),'RIFF');else assert.equal(r.headers.get('content-type'),'audio/mpeg')}}
  assert.equal((await get('/files/'+id+'/download?format=exe','admin')).status,400);
  RecordingFile.findById=async()=>null;assert.equal((await get('/files/'+id+'/download?format=mp3','admin')).status,404);
 }finally{RecordingFile.findById=find;RecordingSession.exists=exists;RecordingFile.find=files;await new Promise(r=>server.close(r))}
});
