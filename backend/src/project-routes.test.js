import 'express-async-errors';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import router from './project-routes.js';
import {Project,Script,PairingQueue,PairingMatch,RecordingSession,AuditLog} from './models.js';

test('project deletion requires admin access, blocks linked records and audits successful deletion',async()=>{
 const originalSecret=process.env.JWT_ACCESS_SECRET;process.env.JWT_ACCESS_SECRET='project-test-secret';
 const originals=[];const mock=(model,key,implementation)=>{originals.push([model,key,model[key]]);model[key]=implementation};
 const id='aaaaaaaaaaaaaaaaaaaaaaaa';let found=true,linked=false,deletes=0,audits=0;
 mock(Project,'findById',async()=>found?{_id:id,name:'Test project'}:null);
 mock(Project,'deleteOne',async()=>{deletes++;return {deletedCount:1}});
 for(const model of [Script,PairingQueue,PairingMatch,RecordingSession])mock(model,'exists',async()=>linked?{_id:id}:null);
 mock(AuditLog,'create',async data=>{audits++;assert.equal(data.action,'DELETE_PROJECT');assert.equal(data.entityId,id)});
 const app=express();app.use(router);app.use((error,req,res,next)=>res.status(500).json({message:error.message}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const request=(role,projectId=id)=>fetch(`http://127.0.0.1:${server.address().port}/projects/${projectId}`,{method:'DELETE',headers:role?{Authorization:'Bearer '+jwt.sign({id,role},process.env.JWT_ACCESS_SECRET)}:{}});
 try{
  assert.equal((await request()).status,401);
  assert.equal((await request('candidate')).status,403);
  assert.equal((await request('admin','invalid')).status,400);
  found=false;assert.equal((await request('admin')).status,404);found=true;
  linked=true;assert.equal((await request('admin')).status,409);assert.equal(deletes,0);
  linked=false;assert.equal((await request('admin')).status,200);assert.equal(deletes,1);assert.equal(audits,1);
  assert.equal((await request('super_admin')).status,200);assert.equal(deletes,2);
 }finally{
  for(const[model,key,implementation]of originals)model[key]=implementation;
  if(originalSecret===undefined)delete process.env.JWT_ACCESS_SECRET;else process.env.JWT_ACCESS_SECRET=originalSecret;
  await new Promise(resolve=>server.close(resolve));
 }
});
