import express from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {auth,signAccess,signRefresh,cookieOptions} from './auth.js';
import {User,AuditLog} from './models.js';
import {loginCredentials} from './login.js';
const router=express.Router();
const userOut=u=>({_id:u._id,fullName:u.fullName,email:u.email,mobile:u.mobile,role:u.role,status:u.status,recordingMode:u.recordingMode||'script',hasPassword:!!u.passwordHash});
const limiter=()=>rateLimit({windowMs:15*60*1000,max:10,message:{message:'Too many attempts. Please try again later.'}});
async function session(user,req,res,message){const refresh=signRefresh(user);user.refreshTokens=[...(user.refreshTokens||[]).slice(-4),refresh];await user.save();return res.cookie('refreshToken',refresh,cookieOptions).json({...(message?{message}:{}),accessToken:signAccess(user),...(req.body.nativeApp===true?{refreshToken:refresh}:{}),user:userOut(user)})}
router.post('/auth/participant-login',limiter(),async(req,res)=>{const {query,password}=loginCredentials(req.body);const users=await User.find({...query,role:'candidate'}).limit(2);const user=users.length===1?users[0]:null;if(!user?.passwordHash||!await bcrypt.compare(password,user.passwordHash))return res.status(401).json({message:'Invalid email/mobile or password. If you have not created a password, sign in with OTP first.'});if(user.status!=='verified')return res.status(403).json({message:'Participant access is unavailable. Sign in with OTP or contact your administrator.'});return session(user,req,res)});
const passwordSchema=z.object({password:z.string().min(8).max(72).refine(value=>Buffer.byteLength(value,'utf8')<=72,'Password is too long'),currentPassword:z.string().max(200).optional(),nativeApp:z.boolean().optional()}).strict();
router.post('/me/password',auth(['candidate']),limiter(),async(req,res)=>{const parsed=passwordSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({message:'Use a password with at least 8 characters and at most 72 UTF-8 bytes.'});const user=await User.findById(req.user.id);if(!user||user.role!=='candidate'||user.status!=='verified')return res.status(403).json({message:'Verified participant access required.'});if(user.passwordHash&&(!parsed.data.currentPassword||!await bcrypt.compare(parsed.data.currentPassword,user.passwordHash)))return res.status(400).json({message:'Current password is incorrect.'});user.passwordHash=await bcrypt.hash(parsed.data.password,12);user.refreshTokens=[];await AuditLog.create({actor:user._id,action:'PARTICIPANT_PASSWORD_UPDATED',entity:'User',entityId:user._id});return session(user,req,res,'Password saved. You can now sign in with your registered email or mobile number.')});
export default router;
