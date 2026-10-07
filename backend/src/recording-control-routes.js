import express from 'express';import {z} from 'zod';import {auth} from './auth.js';import {RecordingSession,CandidateProfile,Topic,Script} from './models.js';import {recordingState,recordingTransition} from './recording-control.js';
const router=express.Router();
router.post('/:id/control',auth(['candidate']),async(req,res)=>{
 const {action}=z.object({action:z.enum(['start','pause','resume','stop'])}).parse(req.body);
 let session=await RecordingSession.findOne({_id:req.params.id,candidates:req.user.id});if(!session)return res.sendStatus(403);
 if(!['waiting','recording'].includes(session.status))return res.status(409).json({message:'Session is no longer active.'});
 if(session.consents.length!==2&&await CandidateProfile.countDocuments({user:{$in:session.candidates},consent:true})===2){session=await RecordingSession.findOneAndUpdate({_id:session._id},{$addToSet:{consents:{$each:session.candidates}}},{new:true})}
 if(session.consents.length!==2)return res.status(403).json({message:'Both participants must consent before using recording controls.'});
 if(['start','resume'].includes(action)){const members=await req.app.get('io').in(session.roomId).fetchSockets();const present=new Set(members.map(member=>String(member.user?.id)));if(!session.candidates.every(id=>present.has(String(id))))return res.status(409).json({message:'Wait for both participants to connect.'})}
 if(action==='start'&&(!session.topic||!await Topic.exists({_id:session.topic,enabled:true})))return res.status(409).json({message:'Select an enabled topic before recording.'});
 if(action==='start'&&session.recordingMode!=='non_script'&&!await Script.exists({_id:session.script,topic:session.topic,project:session.project,active:true}))return res.status(409).json({message:'No matching script for this topic. Ask an administrator to upload one or select another topic.'});
 let next;try{next=recordingTransition(session,action)}catch(error){return res.status(409).json({message:error.message,control:recordingState(session)})}
 const filter={...(action==='start'?{topic:session.topic,topicVersion:session.topicVersion}:{}),_id:session._id,candidates:req.user.id,status:{$in:['waiting','recording']},...(session.controlVersion?{controlVersion:session.controlVersion}:{$or:[{controlVersion:0},{controlVersion:{$exists:false}}]})};
 const updated=await RecordingSession.findOneAndUpdate(filter,{$set:{controlState:next.state,controlElapsedMs:next.elapsedMs,controlChangedAt:new Date(next.changedAt||Date.now()),controlMuted:next.muted,...(action==='start'?{startedAt:new Date(next.changedAt),status:'recording'}:{}),...(action==='stop'?{endedAt:new Date(next.changedAt),duration:Math.round(next.elapsedMs/1000)}:{})},$inc:{controlVersion:1}},{new:true});
 if(!updated)return res.status(409).json({message:'Another participant changed the controls. Please try again.'});
 const control=recordingState(updated);req.app.get('io').to(updated.roomId).emit('recording:state',control);res.json({control});
});
export default router;
