import {z} from 'zod';
import {availabilityPipeline} from './availability-routes.js';
import express from 'express';import {auth} from './auth.js';import {User,CandidateProfile,PairingQueue,RecordingSession,Project,Topic,Script} from './models.js';
const router=express.Router();
router.get('/admin/dashboard',auth(['admin']),async(req,res)=>{const [totalCandidates,onlineCandidates,queued,activeSessions,pendingReviews,projects,enabledTopics,scripts,recentSessions,approved]=await Promise.all([User.countDocuments({role:'candidate'}),CandidateProfile.countDocuments({online:true}),PairingQueue.countDocuments({status:'waiting'}),RecordingSession.countDocuments({status:'recording'}),RecordingSession.countDocuments({status:{$in:['submitted','assigned']}}),Project.countDocuments({active:true}),Topic.countDocuments({enabled:true}),Script.countDocuments({active:true}),RecordingSession.find().populate('project','name').populate('candidates','fullName').sort({createdAt:-1}).limit(6),RecordingSession.aggregate([{$match:{status:'approved'}},{$group:{_id:null,seconds:{$sum:'$duration'}}}])]);res.json({totalCandidates,onlineCandidates,queued,activeSessions,pendingReviews,projects,enabledTopics,scripts,approvedHours:Number(((approved[0]?.seconds||0)/3600).toFixed(2)),recentSessions})});
router.get('/admin/dashboard/details/:kind',auth(['admin']),async(req,res)=>{
 const {kind}=req.params;
 const {page=1,id,project,language,dialect}=z.object({page:z.coerce.number().int().min(1).default(1),id:z.string().regex(/^[a-f0-9]{24}$/i).optional(),project:z.string().regex(/^[a-f0-9]{24}$/i).optional(),language:z.string().trim().min(1).max(100).optional(),dialect:z.string().trim().min(1).max(100).optional()}).parse(req.query);
 const limit=20,skip=(page-1)*limit;
 let model,filter={},query;
 if(kind==='available'){
  const pipeline=availabilityPipeline({selection:{project,language,dialect}});
  const stages=pipeline.slice(0,pipeline.findIndex(stage=>stage.$group));
  stages.push({$lookup:{from:'projects',localField:'project',foreignField:'_id',as:'projectInfo'}},{$unwind:'$projectInfo'},{$match:{'projectInfo.active':true}},{$sort:{availableAt:1,_id:1}},{$facet:{items:[{$skip:skip},{$limit:limit},{$project:{_id:1,fullName:{$arrayElemAt:['$participant.fullName',0]},status:1,recordingMode:1,language:1,dialect:1,project:{name:'$projectInfo.name'}}}],total:[{$count:'count'}]}});
  const [result]=await PairingQueue.aggregate(stages);
  return res.json({items:result?.items||[],total:result?.total[0]?.count||0,page});
 }
 if(kind==='participants'){model=User;filter={role:'candidate'}}
 else if(kind==='online'){model=CandidateProfile;filter={online:true}}
 else if(kind==='waiting'){model=PairingQueue;filter={status:'waiting'}}
 else if(kind==='projects'){model=Project;filter={active:true}}
 else if(['active','pending','approved','session'].includes(kind)){
  if(kind==='session'&&!id)return res.status(400).json({message:'Recording ID required'});
  model=RecordingSession;filter=kind==='active'?{status:'recording'}:kind==='pending'?{status:{$in:['submitted','assigned']}}:kind==='approved'?{status:'approved'}:{_id:id};
 }else return res.status(404).json({message:'Unknown dashboard list'});
 query=model.find(filter);
 if(model===User)query=query.select('fullName email mobile status recordingMode');
 if(model===CandidateProfile)query=query.select('user candidateId online').populate('user','fullName email mobile status recordingMode');
 if(model===PairingQueue)query=query.populate('user','fullName email mobile status recordingMode').populate('project','name');
 if(model===RecordingSession)query=query.populate('project','name').populate('candidates','fullName').populate('topic','name').populate('script','title content');
 const [items,total]=await Promise.all([query.sort({createdAt:-1,_id:-1}).skip(skip).limit(limit),model.countDocuments(filter)]);
 res.json({items,total,page});
});
export default router;
