import {deliveryErrorMessage} from './smtp-config.js';
import {verifiedParticipant,participantAllowed} from './otp-participant.js';
import {deliveryConfig} from './integration-settings.js';
import express from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import {z} from 'zod';
import {User,OtpChallenge} from './models.js';
import {signAccess,signRefresh,cookieOptions} from './auth.js';
import {otpIdentifier,otpDigest,otpMatches,OTP_TTL} from './otp.js';
import {deliveryConfigured,deliverOtp} from './otp-delivery.js';
const router=express.Router();
const limiter=rateLimit({windowMs:15*60*1000,max:10,message:{message:'Too many OTP requests. Please try again later.'}});
router.post('/request',limiter,async(req,res)=>{
 const {identifier,query,channel}=otpIdentifier(req.body.identifier);
 const config=await deliveryConfig();
 if(!deliveryConfigured(channel,config))return res.status(503).json({message:channel==='email'?'Email OTP delivery is not configured. Contact your administrator.':'SMS OTP delivery is not configured. Contact your administrator.'});
 const id=crypto.randomUUID(),code=String(crypto.randomInt(100000,1000000));
 const users=await User.find(query).limit(2);
 if(users.length>1||(users.length===1&&!participantAllowed(users[0])))return res.status(403).json({message:'Participant access is unavailable. Administrators must use password login.'});
 const now=new Date();
 try{await OtpChallenge.findOneAndUpdate({identifier,sentAt:{$lte:new Date(now.getTime()-60000)}},{$set:{challengeId:id,user:users[0]?._id??null,codeHash:otpDigest(id,code),attempts:0,expiresAt:new Date(now.getTime()+OTP_TTL),sentAt:now,delivered:false}},{upsert:true,new:true,runValidators:true})}catch(error){if(error.code===11000)return res.status(429).json({message:'Please wait 60 seconds before requesting another code.'});throw error}
 try{await deliverOtp(channel,identifier,code,config);await OtpChallenge.updateOne({challengeId:id},{$set:{delivered:true}})}catch(error){await OtpChallenge.deleteOne({challengeId:id});return res.status(502).json({message:deliveryErrorMessage(error,channel)})}
 res.json({challengeId:id,expiresIn:Math.max(0,Math.floor((now.getTime()+OTP_TTL-Date.now())/1000)),expiresAt:new Date(now.getTime()+OTP_TTL).toISOString(),resendAfter:60,message:'Code sent. Verify it to sign in or create your participant account.'});
});
router.post('/verify',rateLimit({windowMs:15*60*1000,max:30,message:{message:'Too many verification attempts. Please try again later.'}}),async(req,res)=>{
 const {challengeId,code}=z.object({challengeId:z.string().uuid(),code:z.string().regex(/^\d{6}$/)}).parse(req.body);
 const challenge=await OtpChallenge.findOneAndUpdate({challengeId,delivered:true,expiresAt:{$gt:new Date()},attempts:{$lt:5}},{$inc:{attempts:1}},{new:true});
 if(!challenge||!otpMatches(challengeId,code,challenge.codeHash))return res.status(401).json({message:'Invalid or expired code. Request a new code if needed.'});
 const consumed=await OtpChallenge.deleteOne({_id:challenge._id,challengeId,expiresAt:{$gt:new Date()}});
 if(consumed.deletedCount!==1)return res.status(401).json({message:'This code has already been used. Request a new code.'});
 const user=await verifiedParticipant(challenge.identifier);
 if(!user)return res.status(403).json({message:'Participant access is unavailable. Contact your administrator.'});
 const refresh=signRefresh(user);user.refreshTokens=[...user.refreshTokens.slice(-4),refresh];await user.save();
 res.cookie('refreshToken',refresh,cookieOptions).json({accessToken:signAccess(user),...(req.body.nativeApp===true?{refreshToken:refresh}:{}),user:{_id:user._id,fullName:user.fullName,email:user.email,mobile:user.mobile,role:user.role,status:user.status,recordingMode:user.recordingMode||'script'}});
});
export default router;
