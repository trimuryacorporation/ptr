import {Topic} from './models.js';
import {PairingQueue,PairingMatch,RecordingSession,Script,User,CandidateProfile,Project} from './models.js';
const compatible=(a,b,rule)=>String(a.project)===String(b.project)&&a.language===b.language&&a.dialect===b.dialect&&a.recordingType===b.recordingType&&(a.recordingMode||'script')===(b.recordingMode||'script')&&(rule==='any'||(rule==='same'&&a.gender===b.gender)||(rule==='different'&&a.gender!==b.gender));
export function createMatchmaker(io){
 async function attempt(queueItem){
  const self=await PairingQueue.findById(queueItem._id);if(!self||self.status!=='waiting')return;
  if(await RecordingSession.exists({candidates:self.user,status:{$in:['waiting','recording']},controlState:{$ne:'stopped'}}))return;
  
  const project=await Project.findById(self.project);if(!project?.active)return;
  const peers=await PairingQueue.find({_id:{$ne:self._id},user:{$ne:self.user},status:'waiting',project:self.project,language:self.language,dialect:self.dialect,recordingType:self.recordingType}).sort({createdAt:1});
  for(const peer of peers){
   if(!compatible(self,peer,project.genderRule||'any'))continue;
   if(await RecordingSession.exists({candidates:peer.user,status:{$in:['waiting','recording']},controlState:{$ne:'stopped'}}))continue;
   const users=await User.find({_id:{$in:[self.user,peer.user]},role:'candidate',status:'verified'});if(users.length!==2)continue;
   const profiles=await CandidateProfile.countDocuments({user:{$in:[self.user,peer.user]},online:true,consent:true});if(profiles!==2)continue;
   const claimedSelf=await PairingQueue.findOneAndUpdate({_id:self._id,status:'waiting'},{$set:{status:'matched'}},{new:true});if(!claimedSelf)return;
   const claimedPeer=await PairingQueue.findOneAndUpdate({_id:peer._id,status:'waiting'},{$set:{status:'matched'}},{new:true});if(!claimedPeer){await PairingQueue.updateOne({_id:self._id,status:'matched'},{$set:{status:'waiting'}});continue}
   let match;
   try{
    const script=self.recordingMode==='non_script'?null:await Script.findOne({project:self.project,language:self.language,dialect:self.dialect,active:true,usedBy:{$nin:[self.user,peer.user]}});
    if(!script&&self.recordingMode!=='non_script'){await PairingQueue.updateMany({_id:{$in:[self._id,peer._id]},status:'matched'},{$set:{status:'waiting'}});return}
    const roomId='room_'+self._id+'_'+peer._id+'_'+Date.now();
    match=await PairingMatch.create({candidates:[self.user,peer.user],acceptedBy:[self.user,peer.user],project:self.project,script:script?._id,roomId,status:'accepted'});
    const session=await RecordingSession.create({match:match._id,project:self.project,script:script?._id,roomId,candidates:match.candidates,consents:match.candidates,language:self.language,dialect:self.dialect,recordingMode:self.recordingMode||'script'});match.status='active';await match.save();
    for(const id of match.candidates)io.to(`user:${id}`).emit('pair:accepted',{roomId,sessionId:session._id,scriptId:script?._id});return session;
   }catch(error){if(match)await PairingMatch.updateOne({_id:match._id},{$set:{status:'cancelled'}});await PairingQueue.updateMany({_id:{$in:[self._id,peer._id]},status:'matched'},{$set:{status:'waiting'}});throw error}
  }
 }
 async function accept(){throw Error('Participants are connected automatically after joining the queue.')}
 async function decline(matchId,userId){const match=await PairingMatch.findOne({_id:matchId,candidates:userId,status:'pending'});if(!match)return;await PairingMatch.updateOne({_id:match._id},{$set:{status:'declined'}});await PairingQueue.updateMany({user:{$in:match.candidates},status:'matched'},{$set:{status:'waiting'}})}
 return {attempt,accept,decline};
}
