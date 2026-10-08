import {access} from './access-control.js';
import express from 'express';
import {z} from 'zod';
import {createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {RecordingFile,RecordingSession} from './models.js';
import {recordingStream} from './storage.js';
import {convertAudio} from './audio-conversion.js';
const objectId=z.string().regex(/^[a-f0-9]{24}$/i);
export function createRecordingDownloadRouter(storage={recordingStream},convert=convertAudio){
 const router=express.Router();
 router.get('/sessions/:id/recording-files',...access('recordings.download'),async(req,res)=>{
  const id=objectId.parse(req.params.id);if(!await RecordingSession.exists({_id:id}))return res.status(404).json({message:'Recording session not found.'});
  const files=await RecordingFile.find({session:id}).select('_id channel mimeType size').sort({channel:1});res.json(files);
 });
 router.get('/files/:id/download',(req,res,next)=>{if(req.query.format===undefined)return next('route');next()},...access('recordings.download'),async(req,res)=>{
  const id=objectId.parse(req.params.id),format=z.enum(['mp3','wav']).parse(req.query.format);
  const file=await RecordingFile.findById(id);if(!file)return res.status(404).json({message:'Recording file not found.'});
  const controller=new AbortController();const disconnected=()=>{if(!res.writableFinished)controller.abort()};res.on('close',disconnected);let converted;
  try{
   converted=await convert(await storage.recordingStream(file.key,controller.signal),format,{signal:controller.signal});
   if(controller.signal.aborted)return;
   res.set({'Content-Type':converted.mimeType,'Content-Length':String(converted.size),'Content-Disposition':'attachment; filename="recording-'+file.session+'-'+file.channel+'.'+format+'"','Cache-Control':'private, no-store'});
   await pipeline(createReadStream(converted.path),res,{signal:controller.signal});
  }catch(error){if(!controller.signal.aborted){if(res.headersSent)res.destroy();else res.status(error.status||502).json({message:error.status===503?error.message:'Unable to convert this recording. Please retry the download.'})}}
  finally{res.removeListener('close',disconnected);await converted?.cleanup()}
 });
 return router;
}
export default createRecordingDownloadRouter();
