import 'express-async-errors';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
import {convertAudio} from './audio-conversion.js';
import {createRecordingUploadRouter} from './recording-upload-routes.js';
import {RecordingSession} from './models.js';

test('default upload handler converts browser audio and stores a verified Opus object',async()=>{
 process.env.JWT_ACCESS_SECRET='default-upload-test';
 const user='000000000000000000000001',id='000000000000000000000003';
 const original=RecordingSession.findOne;
 RecordingSession.findOne=async()=>({_id:id,candidates:[user,'000000000000000000000002'],status:'recording',controlState:'stopped'});
 const wav=Buffer.alloc(44+9600);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(9600,40);
 let converted,server,metadata,writes=0;
 try{
  converted=await convertAudio(Readable.from(wav),'opus');const input=await readFile(converted.path);
  const app=express();app.use(createRecordingUploadRouter({
   uploadRecording:async(key,type,body,size)=>{const chunks=[];for await(const chunk of body)chunks.push(chunk);const output=Buffer.concat(chunks);assert.equal(output.subarray(0,4).toString(),'OggS');assert.ok(output.includes(Buffer.from('OpusHead')));assert.match(key,/speakerA\.opus$/);assert.equal(output.length,size);metadata={ContentLength:size,ContentType:type};writes++},
   uploadedObject:async()=>metadata,
  }));
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/sessions/${id}/audio?size=${input.length}`,{method:'PUT',headers:{'Content-Type':'audio/ogg;codecs=opus',Authorization:'Bearer '+jwt.sign({id:user,role:'candidate'},process.env.JWT_ACCESS_SECRET)},body:input});
  assert.equal(response.status,200);const result=await response.json();assert.equal(result.uploaded,true);assert.equal(result.mimeType,'audio/ogg;codecs=opus');assert.equal(result.size,metadata.ContentLength);assert.equal(writes,1);
 }finally{RecordingSession.findOne=original;if(converted)await converted.cleanup();if(server)await new Promise(resolve=>server.close(resolve))}
});
