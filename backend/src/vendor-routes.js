import {staffFilters} from './table-search.js';
import {displayVendorCode} from './vendor-referral.js';
import {Types} from 'mongoose';
import {permissionKeys,normalizePermissions} from './access-control.js';
import express from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {auth,signAccess,signRefresh,cookieOptions} from './auth.js';
import {User,AuditLog,Notification,OtpChallenge,QCReview} from './models.js';
const router=express.Router();
const vendorOut=user=>({_id:user._id,fullName:user.fullName,email:user.email,role:user.role,status:user.status,createdAt:user.createdAt,permissions:user.permissions||[],vendorCode:displayVendorCode(user)});
const password=z.string().min(8).max(72).refine(value=>Buffer.byteLength(value,'utf8')<=72,'Password must be at most 72 UTF-8 bytes');
for(const [role,path,label] of [['vendor','vendors','Vendor'],['reviewer','quality-team','QA']]){
router.get('/admin/'+path,auth(['admin']),async(req,res)=>{
 const page=z.coerce.number().int().min(1).default(1).parse(req.query.page),limit=50;
 const filter=staffFilters(req.query,role);
 const [items,total]=await Promise.all([User.find(filter).select('_id fullName email role status createdAt permissions vendorCode').sort({createdAt:-1,_id:-1}).skip((page-1)*limit).limit(limit),User.countDocuments(filter)]);res.json({items:items.map(vendorOut),total,page});
});
router.post('/admin/'+path,auth(['admin']),rateLimit({windowMs:15*60*1000,max:30}),async(req,res)=>{
 const parsed=z.object({fullName:z.string().trim().min(2).max(100).optional(),email:z.string().trim().toLowerCase().email(),password,permissions:z.array(z.enum(permissionKeys)).default([])}).strict().safeParse(req.body);
 if(!parsed.success)return res.status(400).json({message:'Enter a valid email, a password with 8 to 72 UTF-8 bytes, and valid account permissions. Optional name must have 2 to 100 characters.'});
 const data=parsed.data;if(await User.exists({email:data.email}))return res.status(409).json({message:'An account with this email already exists.'});
 const accountId=new Types.ObjectId();let vendor;try{vendor=await User.create({_id:accountId,...(role==='vendor'?{vendorCode:'VND-'+accountId.toHexString().toUpperCase()}:{}),fullName:data.fullName||data.email.split('@')[0],email:data.email,passwordHash:await bcrypt.hash(data.password,12),role,status:'verified',permissions:normalizePermissions(data.permissions)})}catch(error){if(error.code===11000)return res.status(409).json({message:'An account with this email already exists.'});throw error}
 await AuditLog.create({actor:req.user.id,action:'CREATE_'+role.toUpperCase(),entity:'User',entityId:vendor._id,details:{email:vendor.email,...(vendor.vendorCode?{vendorCode:vendor.vendorCode}:{})}});
 res.status(201).json({vendor:vendorOut(vendor),message:label+' account created'+(vendor.vendorCode?' ('+vendor.vendorCode+')':'')+'. They can sign in using '+label+' login.'});
});
}
for(const [role,path,label] of [['vendor','vendor-login','Vendor'],['reviewer','qa-login','QA']]){
router.post('/auth/'+path,rateLimit({windowMs:15*60*1000,max:10}),async(req,res)=>{
 const {email,password}=z.object({email:z.string().trim().toLowerCase().email(),password:z.string().min(1).max(200)}).parse(req.body);
 const vendor=await User.findOne({email,role});
 if(!vendor?.passwordHash||!await bcrypt.compare(password,vendor.passwordHash))return res.status(401).json({message:'Invalid '+label+' email or password.'});
 if(vendor.status!=='verified')return res.status(403).json({message:label+' account is unavailable. Contact your administrator.'});
 const refresh=signRefresh(vendor);vendor.refreshTokens=[...(vendor.refreshTokens||[]).slice(-4),refresh];await vendor.save();
 res.cookie('refreshToken',refresh,cookieOptions).json({accessToken:signAccess(vendor),user:vendorOut(vendor)});
});
}
router.get('/admin/access-control',auth(['admin']),async(req,res)=>{
 const page=z.coerce.number().int().min(1).default(1).parse(req.query.page),filter=staffFilters(req.query,req.query.role?z.enum(['vendor','reviewer']).parse(req.query.role):{$in:['vendor','reviewer']});
 const [items,total]=await Promise.all([User.find(filter).select('_id fullName email role status permissions vendorCode').sort({createdAt:-1,_id:-1}).skip((page-1)*50).limit(50),User.countDocuments(filter)]);res.json({items:items.map(vendorOut),total,page});
});
router.patch('/admin/access-control/:id',auth(['admin']),async(req,res)=>{
 const id=z.string().regex(/^[a-f0-9]{24}$/i).parse(req.params.id),data=z.object({permissions:z.array(z.enum(permissionKeys)),status:z.enum(['verified','blocked']).optional()}).strict().parse(req.body);
 const update={permissions:normalizePermissions(data.permissions),...(data.status?{status:data.status}:{})};
 const user=await User.findOneAndUpdate({_id:id,role:{$in:['vendor','reviewer']},deletedAt:null},{$set:update},{new:true,runValidators:true});if(!user)return res.status(404).json({message:'Vendor or QA account not found.'});
 await AuditLog.create({actor:req.user.id,action:'UPDATE_STAFF_ACCESS',entity:'User',entityId:user._id,details:update});res.json({user:vendorOut(user),message:'Access updated. Changes apply to the next request.'});
});
const vendorId=z.string().regex(/^[a-f0-9]{24}$/i);
for(const [role,path,label] of [['vendor','vendors','Vendor'],['reviewer','quality-team','QA']]){
router.get('/admin/'+path+'/:id',auth(['admin']),async(req,res)=>{
 const vendor=await User.findOne({_id:vendorId.parse(req.params.id),role,deletedAt:null}).select('_id fullName email role status permissions vendorCode createdAt');if(!vendor)return res.status(404).json({message:label+' account not found.'});res.json({vendor:vendorOut(vendor)});
});
router.patch('/admin/'+path+'/:id',auth(['admin']),async(req,res)=>{
 const id=vendorId.parse(req.params.id),data=z.object({fullName:z.string().trim().min(2).max(100),email:z.string().trim().toLowerCase().email(),password:password.optional(),status:z.enum(['verified','blocked']),permissions:z.array(z.enum(permissionKeys))}).strict().parse(req.body);
 if(await User.exists({email:data.email,_id:{$ne:id}}))return res.status(409).json({message:'An account with this email already exists.'});
 const update={fullName:data.fullName,email:data.email,status:data.status,permissions:normalizePermissions(data.permissions)};
 if(data.password){update.passwordHash=await bcrypt.hash(data.password,12);update.refreshTokens=[]}if(data.status==='blocked')update.refreshTokens=[];
 let vendor;try{vendor=await User.findOneAndUpdate({_id:id,role,deletedAt:null},{$set:update},{new:true,runValidators:true})}catch(error){if(error.code===11000)return res.status(409).json({message:'An account with this email already exists.'});throw error}
 if(!vendor)return res.status(404).json({message:label+' account not found.'});
 await AuditLog.create({actor:req.user.id,action:'UPDATE_'+role.toUpperCase(),entity:'User',entityId:id,details:{email:data.email,status:data.status,permissions:update.permissions,passwordChanged:!!data.password}});
 res.json({vendor:vendorOut(vendor),message:label+' account updated successfully.'});
});
router.delete('/admin/'+path+'/:id',auth(['admin']),async(req,res)=>{
 const id=vendorId.parse(req.params.id);const account=await User.findOne({_id:id,role}).select('_id');if(!account)return res.status(404).json({message:label+' account not found.'});
 await Promise.all([Notification.deleteMany({user:id}),OtpChallenge.deleteMany({user:id}),QCReview.updateMany({reviewer:id},{$unset:{reviewer:1}})]);
 const vendor=await User.findOneAndDelete({_id:id,role});
 if(!vendor)return res.status(404).json({message:label+' account not found.'});
 await AuditLog.create({actor:req.user.id,action:'DELETE_'+role.toUpperCase(),entity:'User',entityId:id});res.json({message:label+' account permanently deleted from MongoDB.'});
});
}
export default router;
