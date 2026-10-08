import crypto from 'node:crypto';
import {User,CandidateProfile} from './models.js';
import {otpIdentifier} from './otp.js';
export function participantAllowed(user){return user.role==='candidate'&&!['blocked','rejected'].includes(user.status)}
export async function verifiedParticipant(identifier,vendor=null){
 const {query,channel}=otpIdentifier(identifier);
 let users=await User.find(query).limit(2);
 if(users.length>1||(users.length===1&&!participantAllowed(users[0])))return null;
 let user=users[0];
 if(!user){
  if(vendor&&!await User.exists({_id:vendor,role:'vendor',status:'verified',deletedAt:null}))return null;
  try{user=await User.findOneAndUpdate(query,{$setOnInsert:{...query,...(vendor?{vendor}:{}),otpIdentity:identifier,fullName:'Participant',role:'candidate',status:'verified',recordingMode:'non_script'}},{upsert:true,new:true,runValidators:true,setDefaultsOnInsert:true})}
  catch(error){if(error.code!==11000)throw error;users=await User.find(query).limit(2);if(users.length!==1)return null;user=users[0]}
 }
 if(!participantAllowed(user))return null;
 if(user.status==='pending')user.status='verified';
 await CandidateProfile.updateOne({user:user._id},{$setOnInsert:{candidateId:'TRM-'+crypto.randomUUID(),consent:false}},{upsert:true,runValidators:true});
 return user;
}
