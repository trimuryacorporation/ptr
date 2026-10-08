import {spawn} from 'node:child_process';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import ffmpeg from 'ffmpeg-static';
export const audioFormats={opus:{mime:'audio/ogg;codecs=opus',args:['-c:a','libopus','-b:a','64k','-ar','48000','-f','ogg']},mp3:{mime:'audio/mpeg',args:['-c:a','libmp3lame','-b:a','128k','-f','mp3']},wav:{mime:'audio/wav',args:['-c:a','pcm_s16le','-f','wav']}};
let active=0;
export async function convertAudio(source,format,{signal}={}){
 if(!audioFormats[format])throw new Error('Unsupported audio format');
 if(active>=2){source.destroy?.();throw Object.assign(new Error('Audio processing is busy. Please try again shortly.'),{status:503})}
 active++;let directory;let cleaned=false;
 const cleanup=async()=>{if(cleaned)return;cleaned=true;try{if(directory)await rm(directory,{recursive:true,force:true})}finally{active--}};
 try{
  directory=await mkdtemp(join(tmpdir(),'trimurya-audio-'));const input=join(directory,'input'),output=join(directory,'audio.'+format);let bytes=0;
  const limit=new Transform({transform(chunk,encoding,done){bytes+=chunk.length;done(bytes>1000000000?new Error('Recording exceeds the audio size limit'):null,chunk)}});
  await pipeline(source,limit,createWriteStream(input),{signal});
  await new Promise((resolve,reject)=>{
   const child=spawn(process.env.FFMPEG_PATH||ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-y','-protocol_whitelist','file,pipe','-i',input,'-map','0:a:0','-vn','-threads','1',...audioFormats[format].args,output],{windowsHide:true,stdio:['ignore','ignore','pipe'],signal});
   child.stderr.resume();const timer=setTimeout(()=>child.kill('SIGKILL'),15*60*1000);
   child.once('error',error=>{clearTimeout(timer);reject(error)});child.once('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('Audio conversion failed. Retry or contact your administrator.'))});
  });
  const info=await stat(output);if(!info.size)throw new Error('Converted recording is empty');
  return {path:output,size:info.size,mimeType:audioFormats[format].mime,cleanup};
 }catch(error){await cleanup();throw error}
}
