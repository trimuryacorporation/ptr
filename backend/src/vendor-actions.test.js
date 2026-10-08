import 'express-async-errors';import test from 'node:test';import assert from 'node:assert/strict';import express from 'express';import jwt from 'jsonwebtoken';import bcrypt from 'bcryptjs';import router from './vendor-routes.js';import {access} from './access-control.js';import {User,AuditLog,Notification,OtpChallenge,QCReview} from './models.js';
process.env.JWT_ACCESS_SECRET='vendor-actions-test';
for(const [accountRole,accountPath] of [['vendor','vendors'],['reviewer','quality-team']])test('Admin and Super Admin view/edit/delete '+accountRole+' accounts; deletion physically removes the account and revokes access',async()=>{
 const originals={remove:User.findOneAndDelete,notifications:Notification.deleteMany,otp:OtpChallenge.deleteMany,reviews:QCReview.updateMany,findOne:User.findOne,exists:User.exists,update:User.findOneAndUpdate,findById:User.findById,audit:AuditLog.create};const id='aaaaaaaaaaaaaaaaaaaaaaaa';const vendor={_id:id,fullName:'Example vendor',email:'vendor@example.com',role:accountRole,status:'verified',vendorCode:'VND-'+id.toUpperCase(),permissions:['recordings.read'],passwordHash:'old-hash',refreshTokens:['old-token']};const audits=[],cleanups=[];let duplicate=false,deleted=false;Notification.deleteMany=async filter=>cleanups.push(['notifications',filter]);OtpChallenge.deleteMany=async filter=>cleanups.push(['otp',filter]);QCReview.updateMany=async(filter,update)=>cleanups.push(['reviews',filter,update]);User.findOneAndDelete=async query=>{assert.equal(query.role,accountRole);if(query._id!==id||deleted)return null;deleted=true;return vendor};
 User.findOne=query=>({select:async fields=>{assert.ok(!fields.includes('password'));return query._id===id&&query.role===accountRole&&!deleted?vendor:null}});
 User.exists=async()=>duplicate;
 User.findById=()=>({select:async()=>deleted?null:vendor});
 User.findOneAndUpdate=async(query,update)=>{assert.equal(query.role,accountRole);assert.equal(query.deletedAt,null);if(query._id!==id||deleted)return null;Object.assign(vendor,update.$set);return vendor};AuditLog.create=async record=>audits.push(record);
 const app=express();app.use(express.json());app.use(router);app.get('/private',...access('recordings.read'),(req,res)=>res.json({ok:true}));app.use((error,req,res,next)=>res.status(400).json({message:'Invalid request'}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
 const request=(method,path,role,body)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(role?{Authorization:'Bearer '+jwt.sign({id,role},process.env.JWT_ACCESS_SECRET)}:{})},...(body?{body:JSON.stringify(body)}:{})});const path='/admin/'+accountPath+'/'+id;
 const edit={fullName:'Updated vendor',email:' NEW@EXAMPLE.COM ',status:'verified',permissions:['recordings.download']};
 try{
  for(const role of [undefined,'vendor','reviewer','candidate'])for(const method of ['GET','PATCH','DELETE'])assert.equal((await request(method,path,role,method==='PATCH'?edit:undefined)).status,role?403:401);
  for(const role of ['admin','super_admin']){const response=await request('GET',path,role);assert.equal(response.status,200);const data=await response.json();assert.equal(data.vendor.vendorCode,vendor.vendorCode);assert.equal(data.vendor.passwordHash,undefined)}
  const code=vendor.vendorCode;let response=await request('PATCH',path,'admin',edit);assert.equal(response.status,200);assert.equal(vendor.email,'new@example.com');assert.equal(vendor.vendorCode,code);assert.equal(vendor.passwordHash,'old-hash');assert.ok(vendor.permissions.includes('recordings.read'));
  response=await request('PATCH',path,'super_admin',{...edit,password:'NewVendorPass123'});assert.equal(response.status,200);assert.ok(await bcrypt.compare('NewVendorPass123',vendor.passwordHash));assert.deepEqual(vendor.refreshTokens,[]);assert.ok(!JSON.stringify(await response.json()).includes('passwordHash'));assert.ok(!JSON.stringify(audits).includes('NewVendorPass123'));
  duplicate=true;assert.equal((await request('PATCH',path,'admin',edit)).status,409);duplicate=false;
  assert.equal((await request('PATCH',path,'admin',{...edit,role:'super_admin'})).status,400);
  assert.equal((await request('PATCH',path,'admin',{...edit,vendorCode:'CHANGED'})).status,400);
  assert.equal((await request('PATCH',path,'admin',{...edit,password:'short'})).status,400);
  assert.equal((await request('GET','/admin/'+accountPath+'/bbbbbbbbbbbbbbbbbbbbbbbb','admin')).status,404);
  assert.equal((await request('GET','/private',accountRole)).status,200);
  response=await request('DELETE',path,'super_admin');assert.equal(response.status,200);assert.equal(deleted,true);assert.equal(vendor.deletedAt,undefined);assert.deepEqual(cleanups,[['notifications',{user:id}],['otp',{user:id}],['reviews',{reviewer:id},{$unset:{reviewer:1}}]]);assert.equal(vendor.vendorCode,code);
  assert.equal((await request('GET','/private','vendor')).status,403);
  assert.equal((await request('GET',path,'admin')).status,404);assert.equal((await request('PATCH',path,'admin',edit)).status,404);assert.equal((await request('DELETE',path,'admin')).status,404);
  assert.ok(audits.some(record=>record.action==='DELETE_'+accountRole.toUpperCase()));
 }finally{User.findOneAndDelete=originals.remove;Notification.deleteMany=originals.notifications;OtpChallenge.deleteMany=originals.otp;QCReview.updateMany=originals.reviews;User.findOne=originals.findOne;User.exists=originals.exists;User.findOneAndUpdate=originals.update;User.findById=originals.findById;AuditLog.create=originals.audit;await new Promise(resolve=>server.close(resolve))}
});
