import express from 'express';
import {Types} from 'mongoose';
import {z} from 'zod';
import {auth} from './auth.js';
import {User} from './models.js';
import {resolveVendorCode,displayVendorCode} from './vendor-referral.js';
const router=express.Router();
router.post('/me/vendor',auth(['candidate']),async(req,res)=>{
 const {vendorCode}=z.object({vendorCode:z.string().trim().min(1).max(28)}).strict().parse(req.body);
 const candidate=await User.findById(req.user.id).select('role status vendor');
 if(!candidate||candidate.role!=='candidate'||!['pending','verified'].includes(candidate.status))return res.status(403).json({message:'Your account cannot link a vendor.'});
 const vendorId=await resolveVendorCode(vendorCode);
 if(candidate.vendor&&String(candidate.vendor)!==String(vendorId))return res.status(409).json({message:'Your account is already linked to a vendor. Contact your administrator to change it.'});
 if(!candidate.vendor){
  // The guarded, one-time write preserves immutable referral ownership on ordinary User updates.
  const result=await User.collection.updateOne({_id:new Types.ObjectId(req.user.id),role:'candidate',status:{$in:['pending','verified']},vendor:null},{$set:{vendor:new Types.ObjectId(String(vendorId)),updatedAt:new Date()}});
  if(result.matchedCount!==1){const current=await User.findById(req.user.id).select('vendor');if(String(current?.vendor)!==String(vendorId))return res.status(409).json({message:'Vendor linking changed. Reload your profile and try again.'})}
 }
 const vendor=await User.findOne({_id:vendorId,role:'vendor'}).select('_id fullName vendorCode role');
 res.json({message:'Vendor linked successfully.',vendor:vendor?{_id:vendor._id,fullName:vendor.fullName,vendorCode:displayVendorCode(vendor)}:null});
});
router.get('/me/vendor',auth(['candidate']),async(req,res)=>{
 const candidate=await User.findById(req.user.id).select('role status vendor');if(!candidate||candidate.role!=='candidate'||!['pending','verified'].includes(candidate.status))return res.status(403).json({message:'Your account is unavailable.'});
 const vendor=candidate.vendor?await User.findOne({_id:candidate.vendor,role:'vendor'}).select('_id fullName vendorCode role status'):null;
 res.json({vendor:vendor?{_id:vendor._id,fullName:vendor.fullName,vendorCode:displayVendorCode(vendor),status:vendor.status}:null});
});
router.get('/dashboard/vendor',auth(['vendor']),async(req,res)=>{
 const vendor=await User.findById(req.user.id).select('role status permissions fullName vendorCode');if(!vendor||vendor.role!=='vendor'||vendor.status!=='verified')return res.status(403).json({message:'Vendor account is unavailable.'});
 const candidateCount=await User.countDocuments({role:'candidate',vendor:vendor._id});res.json({candidateCount,canViewCandidates:vendor.permissions?.includes('candidates.read')||false,vendor:{fullName:vendor.fullName,vendorCode:displayVendorCode(vendor)}});
});
export default router;
