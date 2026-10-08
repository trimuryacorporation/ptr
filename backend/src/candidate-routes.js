import {literalSearch as escape} from './table-search.js';
import express from 'express';
import {Types} from 'mongoose';
import {z} from 'zod';
import ExcelJS from 'exceljs';
import {access} from './access-control.js';
import {User} from './models.js';
const router=express.Router();
const options=z.object({page:z.coerce.number().int().min(1).default(1),search:z.string().trim().max(100).default(''),status:z.enum(['pending','verified','rejected','blocked']).optional(),recordingMode:z.enum(['script','non_script']).optional(),vendorCode:z.string().trim().max(100).optional(),state:z.string().trim().max(100).optional(),gender:z.string().trim().max(50).optional()});
export function candidatePipeline(actor,query={},id){
 const d=options.parse(query),match={role:'candidate'};
 if(actor.role==='vendor')match.vendor=new Types.ObjectId(actor.id);
 if(id)match._id=new Types.ObjectId(z.string().regex(/^[a-f0-9]{24}$/i).parse(id));
 if(d.status)match.status=d.status;if(d.recordingMode)match.recordingMode=d.recordingMode;
 const pipeline=[{$match:match},{$lookup:{from:'candidateprofiles',localField:'_id',foreignField:'user',as:'profiles'}},{$set:{profile:{$arrayElemAt:['$profiles',0]}}},{$lookup:{from:'users',localField:'vendor',foreignField:'_id',as:'vendors'}},{$set:{vendor:{$arrayElemAt:['$vendors',0]}}}];
 const filters={};if(d.state)filters['profile.state']={$regex:'^'+escape(d.state)+'$',$options:'i'};if(d.gender)filters['profile.gender']={$regex:'^'+escape(d.gender)+'$',$options:'i'};
 if(d.vendorCode){const code=d.vendorCode.toUpperCase();filters.$or=[{'vendor.vendorCode':code}];if(/^VND-[A-F0-9]{24}$/.test(code))filters.$or.push({'vendor._id':new Types.ObjectId(code.slice(4))})}
 if(Object.keys(filters).length)pipeline.push({$match:filters});
 if(d.search)pipeline.push({$match:{$or:['fullName','email','mobile','profile.candidateId','profile.city','profile.state','profile.dialect','profile.nativeLanguages','vendor.fullName','vendor.vendorCode'].map(key=>({[key]:{$regex:escape(d.search),$options:'i'}}))}});
 pipeline.push({$project:{fullName:1,email:1,mobile:1,status:1,recordingMode:1,createdAt:1,'vendor._id':1,'vendor.fullName':1,'vendor.email':1,'vendor.vendorCode':1,'profile.candidateId':1,'profile.gender':1,'profile.state':1,'profile.city':1,'profile.nativeLanguages':1,'profile.dialect':1,'profile.experience':1,'profile.deviceType':1,'profile.consent':1,'profile.online':1,'profile.earnings':1,'profile.submittedSeconds':1}},{$sort:{createdAt:-1,_id:-1}});return {pipeline,page:d.page};
}
const codeFor=row=>row.vendor?.vendorCode||(row.vendor?._id?'VND-'+String(row.vendor._id).toUpperCase():'');
export async function candidateWorkbook(items){const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Candidates');
 const fields=['Candidate ID','Name','Email','Mobile','Status','Recording mode','Vendor','Vendor code','Gender','State','City','Languages','Dialect','Experience','Device','Consent','Online','Earnings','Submitted seconds','Registered'];sheet.columns=fields.map((header,index)=>({header,key:String(index),width:22}));
 for(const row of items){const p=row.profile||{};sheet.addRow([p.candidateId||String(row._id),row.fullName,row.email||'',row.mobile||'',row.status,row.recordingMode,row.vendor?.fullName||'',codeFor(row),p.gender||'',p.state||'',p.city||'',(p.nativeLanguages||[]).join(', '),p.dialect||'',p.experience||'',p.deviceType||'',p.consent===true,p.online===true,p.earnings||0,p.submittedSeconds||0,row.createdAt?new Date(row.createdAt):''])}
 sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:'T'+Math.max(sheet.rowCount,1)};return workbook.xlsx.writeBuffer();}
router.get('/admin/candidates/export.xlsx',...access('candidates.read'),async(req,res)=>{const {pipeline}=candidatePipeline(req.user,req.query);const items=await User.aggregate([...pipeline,{$limit:50001}]);if(items.length>50000)return res.status(422).json({message:'Use filters to export at most 50,000 candidates.'});const buffer=await candidateWorkbook(items);res.set({'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="candidates.xlsx"','Cache-Control':'no-store'}).send(Buffer.from(buffer))});
router.get('/admin/candidates',...access('candidates.read'),async(req,res)=>{const {pipeline,page}=candidatePipeline(req.user,req.query);const [result]=await User.aggregate([...pipeline,{$facet:{items:[{$skip:(page-1)*50},{$limit:50}],count:[{$count:'total'}]}}]);res.json({items:result.items.map(row=>({...row,vendor:row.vendor?{...row.vendor,vendorCode:codeFor(row)}:null})),total:result.count[0]?.total||0,page})});
router.get('/admin/candidates/:id',...access('candidates.read'),async(req,res)=>{const {pipeline}=candidatePipeline(req.user,{},req.params.id);const [candidate]=await User.aggregate(pipeline);if(!candidate)return res.status(404).json({message:'Candidate not found.'});res.json({candidate:{...candidate,vendor:candidate.vendor?{...candidate.vendor,vendorCode:codeFor(candidate)}:null}})});
export default router;
