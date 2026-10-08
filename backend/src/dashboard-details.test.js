import 'express-async-errors';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import router from './dashboard-routes.js';
import {User,RecordingSession,PairingQueue} from './models.js';
process.env.JWT_ACCESS_SECRET='dashboard-details-test';
test('new candidates default to Non-script while explicit Script choices remain',()=>{
 assert.equal(new User({fullName:'New candidate'}).recordingMode,'non_script');
 assert.equal(new User({fullName:'Script candidate',recordingMode:'script'}).recordingMode,'script');
});
test('dashboard details enforce admin access, select safe fields, paginate and filter recording lists',async()=>{
 const originals={userFind:User.find,userCount:User.countDocuments,sessionFind:RecordingSession.find,sessionCount:RecordingSession.countDocuments,aggregate:PairingQueue.aggregate};
 let filter,fields,offset,pipeline;
 const rows=[{_id:'example',fullName:'Candidate'}];
 const query={select:value=>{fields=value;return query},populate:()=>query,sort:()=>query,skip:value=>{offset=value;return query},limit:async value=>{assert.equal(value,20);return rows}};
 User.find=value=>{filter=value;return query};User.countDocuments=async()=>45;
 RecordingSession.find=value=>{filter=value;return query};RecordingSession.countDocuments=async()=>1;
 PairingQueue.aggregate=async value=>{pipeline=value;return [{items:rows,total:[{count:1}]}]};
 const app=express();app.use(router);app.use((error,req,res,next)=>res.status(400).json({message:error.message}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const get=(path,role='admin')=>fetch('http://127.0.0.1:'+server.address().port+'/admin/dashboard/details/'+path,{headers:role?{Authorization:'Bearer '+jwt.sign({id:'admin',role},process.env.JWT_ACCESS_SECRET)}:{}});
 try{
  assert.equal((await get('participants',null)).status,401);
  assert.equal((await get('participants','candidate')).status,403);
  for(const role of ['admin','super_admin']){const response=await get('participants?page=2',role);assert.equal(response.status,200);assert.equal((await response.json()).total,45);assert.deepEqual(filter,{role:'candidate'});assert.equal(offset,20);assert.ok(!fields.includes('password'));assert.ok(!fields.includes('resetToken'))}
  await get('active');assert.deepEqual(filter,{status:'recording'});
  await get('pending');assert.deepEqual(filter,{status:{$in:['submitted','assigned']}});
  await get('approved');assert.deepEqual(filter,{status:'approved'});
  const id='aaaaaaaaaaaaaaaaaaaaaaaa';await get('session?id='+id);assert.deepEqual(filter,{_id:id});
  assert.equal((await get('session')).status,400);assert.equal((await get('session?id=invalid')).status,400);
  assert.equal((await get('participants?page=0')).status,400);assert.equal((await get('unknown')).status,404);
  const response=await get('available?project='+id+'&language=Hindi&dialect=Standard');assert.equal(response.status,200);assert.equal((await response.json()).total,1);
  assert.equal(String(pipeline[0].$match.project),id);assert.equal(pipeline[0].$match.language,'Hindi');assert.equal(pipeline[0].$match.dialect,'Standard');assert.ok(pipeline.some(stage=>stage.$match?.['profile.online']===true));assert.ok(pipeline.some(stage=>stage.$match?.['projectInfo.active']===true));assert.ok(pipeline.some(stage=>stage.$match?.activeRooms?.$size===0));
 }finally{User.find=originals.userFind;User.countDocuments=originals.userCount;RecordingSession.find=originals.sessionFind;RecordingSession.countDocuments=originals.sessionCount;PairingQueue.aggregate=originals.aggregate;await new Promise(r=>server.close(r))}
});
