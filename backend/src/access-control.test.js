import 'express-async-errors';import test from 'node:test';import assert from 'node:assert/strict';import express from 'express';import jwt from 'jsonwebtoken';import bcrypt from 'bcryptjs';import {User,AuditLog} from './models.js';import vendorRoutes from './vendor-routes.js';import {access,normalizePermissions} from './access-control.js';
process.env.JWT_ACCESS_SECRET='access-test';process.env.JWT_REFRESH_SECRET='access-refresh';
test('permission dependencies include the required read access',()=>{assert.deepEqual(normalizePermissions(['reviews.decide']).sort(),['recordings.read','reviews.decide','reviews.read']);assert.deepEqual(normalizePermissions(['recordings.download']).sort(),['recordings.download','recordings.read'])});
test('QA accounts and per-account grants are managed only by admins and enforce live revocation',async()=>{
 const originals={findById:User.findById,findOne:User.findOne,exists:User.exists,create:User.create,update:User.findOneAndUpdate,audit:AuditLog.create};
 const vendor={_id:'aaaaaaaaaaaaaaaaaaaaaaaa',fullName:'Vendor',email:'vendor@example.com',role:'vendor',status:'verified',permissions:[]},other={...vendor,_id:'bbbbbbbbbbbbbbbbbbbbbbbb'};let qa;
 User.findById=id=>({select:async()=>[vendor,other,qa].filter(Boolean).find(user=>user._id===id)});
 User.exists=async()=>false;User.create=async data=>(qa={...data,_id:'cccccccccccccccccccccccc',refreshTokens:[],save:async()=>{}});
 User.findOne=async query=>qa?.email===query.email&&qa.role===query.role?qa:null;
 User.findOneAndUpdate=async(query,update)=>{assert.deepEqual(query.role,{$in:['vendor','reviewer']});const user=[vendor,qa].find(user=>user?._id===query._id);if(!user)return null;Object.assign(user,update.$set);return user};AuditLog.create=async()=>{};
 const app=express();app.use(express.json());app.use(vendorRoutes);for(const permission of ['recordings.read','recordings.download','reviews.read','reviews.decide'])app.get('/test/'+permission,...access(permission),(req,res)=>res.json({allowed:true}));app.use((e,req,res,next)=>res.status(400).json({message:'Invalid request'}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
 const request=(path,role='admin',body,method=body?'POST':'GET',id=vendor._id)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({id,role},process.env.JWT_ACCESS_SECRET)},...(body?{body:JSON.stringify(body)}:{})});
 try{
  for(const role of ['vendor','reviewer','candidate'])assert.equal((await request('/admin/quality-team',role,{email:'qa@example.com',password:'QualityPass123'})).status,403);
  for(const role of ['admin','super_admin']){const response=await request('/admin/quality-team',role,{email:'QA@EXAMPLE.COM',password:'QualityPass123',permissions:['reviews.decide']});assert.equal(response.status,201);const body=await response.json();assert.equal(body.vendor.role,'reviewer');assert.ok(body.vendor.permissions.includes('reviews.read'));assert.equal(body.vendor.passwordHash,undefined);assert.ok(await bcrypt.compare('QualityPass123',qa.passwordHash))}
  const login=await request('/auth/qa-login','admin',{email:'qa@example.com',password:'QualityPass123'});assert.equal(login.status,200);assert.equal((await login.json()).user.role,'reviewer');
  assert.equal((await request('/admin/quality-team','admin',{email:'qa2@example.com',password:'QualityPass123',permissions:['admin.manage']})).status,400);
  assert.equal((await request('/test/recordings.read','vendor')).status,403);
  const path='/admin/access-control/'+vendor._id;
  assert.equal((await request(path,'vendor',{permissions:['recordings.download']},'PATCH')).status,403);
  const grant=await request(path,'admin',{permissions:['recordings.download']},'PATCH');assert.equal(grant.status,200);assert.ok((await grant.json()).user.permissions.includes('recordings.read'));
  assert.equal((await request('/test/recordings.download','vendor')).status,200);
  assert.equal((await request('/test/reviews.decide','vendor')).status,403);
  assert.equal((await request('/test/recordings.read','vendor',undefined,'GET',other._id)).status,403);
  assert.equal((await request('/test/reviews.decide','reviewer',undefined,'GET',qa._id)).status,200);
  assert.equal((await request(path,'super_admin',{permissions:[]},'PATCH')).status,200);assert.equal((await request('/test/recordings.download','vendor')).status,403);
  await request(path,'admin',{permissions:['recordings.read'],status:'blocked'},'PATCH');assert.equal((await request('/test/recordings.read','vendor')).status,403);
  assert.equal((await request(path,'admin',{permissions:['admin.manage']},'PATCH')).status,400);
  assert.equal((await request('/admin/access-control/dddddddddddddddddddddddd','admin',{permissions:[]},'PATCH')).status,404);
 }finally{User.findById=originals.findById;User.findOne=originals.findOne;User.exists=originals.exists;User.create=originals.create;User.findOneAndUpdate=originals.update;AuditLog.create=originals.audit;await new Promise(resolve=>server.close(resolve))}
});
