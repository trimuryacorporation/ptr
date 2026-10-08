import 'express-async-errors';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import router from './routes.js';
import {User,AuditLog} from './models.js';
process.env.JWT_ACCESS_SECRET='vendor-access-test';process.env.JWT_REFRESH_SECRET='vendor-refresh-test';
test('vendor role is supported without changing candidate default',()=>{assert.equal(new User({fullName:'Vendor',role:'vendor'}).validateSync(),undefined);assert.equal(new User({fullName:'Participant'}).role,'candidate')});
test('only Admin and Super Admin create vendors; email/password login grants vendor access only',async()=>{
 const originals={findById:User.findById,exists:User.exists,create:User.create,find:User.find,count:User.countDocuments,findOne:User.findOne,audit:AuditLog.create};
 const accounts=[],audits=[];let offset;User.findById=()=>({select:async()=>({role:'vendor',status:'verified',permissions:[]})});
 User.exists=async query=>accounts.some(user=>user.email===query.email);
 User.create=async data=>{const user={...data,_id:'aaaaaaaaaaaaaaaaaaaaaaa'+(accounts.length+1),createdAt:new Date(),refreshTokens:[],save:async()=>{}};accounts.push(user);return user};
 User.find=filter=>{assert.deepEqual(filter,{role:'vendor',deletedAt:null});const query={select:fields=>{assert.ok(!fields.includes('password'));return query},sort:()=>query,skip:value=>{offset=value;return query},limit:async()=>accounts};return query};
 User.countDocuments=async()=>accounts.length;User.findOne=async query=>accounts.find(user=>user.email===query.email&&user.role===query.role);
 AuditLog.create=async record=>{audits.push(record);return record};
 const app=express();app.use(express.json());app.use(router);app.use((error,req,res,next)=>res.status(400).json({message:'Invalid request'}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
 const request=(path,role,body)=>fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(role?{Authorization:'Bearer '+jwt.sign({id:'admin',role},process.env.JWT_ACCESS_SECRET)}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{
  for(const role of [undefined,'vendor','candidate','reviewer']){assert.equal((await request('/admin/vendors',role,{email:'deny@example.com',password:'VendorPass123'})).status,role?403:401);assert.equal((await request('/admin/vendors',role)).status,role?403:401)}
  for(const role of ['admin','super_admin']){const response=await request('/admin/vendors',role,{email:' '+role.toUpperCase()+'@EXAMPLE.COM ',password:'VendorPass123'});assert.equal(response.status,201);const {vendor}=await response.json();assert.equal(vendor.role,'vendor');assert.match(vendor.vendorCode,/^VND-[A-F0-9]{24}$/);assert.equal(new Set(accounts.map(account=>account.vendorCode)).size,accounts.length);assert.equal(vendor.status,'verified');assert.equal(vendor.email,role+'@example.com');assert.equal(vendor.passwordHash,undefined);assert.ok(!JSON.stringify(vendor).includes('VendorPass123'));assert.ok(await bcrypt.compare('VendorPass123',accounts.at(-1).passwordHash))}
  assert.equal((await request('/admin/vendors','admin',{email:'admin@example.com',password:'VendorPass123'})).status,409);
  assert.equal((await request('/admin/vendors','admin',{email:'invalid',password:'short'})).status,400);
  assert.equal((await request('/admin/vendors','admin',{email:'new@example.com',password:'VendorPass123',role:'super_admin'})).status,400);
  assert.equal((await request('/admin/vendors','admin',{email:'new@example.com',password:'a'.repeat(73)})).status,400);
  const list=await request('/admin/vendors?page=2','super_admin');assert.equal(list.status,200);assert.equal(offset,50);const listed=await list.json();assert.equal(listed.total,2);assert.equal(listed.items[0].vendorCode,accounts[0].vendorCode);assert.ok(!JSON.stringify(listed).includes('passwordHash'));assert.ok(!JSON.stringify(audits).includes('VendorPass123'));
  const login=await request('/auth/vendor-login',null,{email:' ADMIN@EXAMPLE.COM ',password:'VendorPass123'});assert.equal(login.status,200);const data=await login.json();assert.equal(data.user.role,'vendor');assert.equal(data.user.vendorCode,accounts[0].vendorCode);assert.equal(jwt.verify(data.accessToken,process.env.JWT_ACCESS_SECRET).role,'vendor');assert.ok(login.headers.get('set-cookie').includes('refreshToken='));assert.equal(data.user.passwordHash,undefined);assert.equal(accounts[0].refreshTokens.length,1);
  assert.equal((await request('/auth/vendor-login',null,{email:'admin@example.com',password:'wrong'})).status,401);
  accounts[0].status='blocked';assert.equal((await request('/auth/vendor-login',null,{email:'admin@example.com',password:'VendorPass123'})).status,403);accounts[0].status='verified';accounts[0].role='candidate';assert.equal((await request('/auth/vendor-login',null,{email:'admin@example.com',password:'VendorPass123'})).status,401);
  for(const path of ['/sessions','/sessions/aaaaaaaaaaaaaaaaaaaaaaaa','/projects','/topics','/admin/candidates','/admin/dashboard','/reviews','/files/aaaaaaaaaaaaaaaaaaaaaaaa/download?format=mp3'])assert.equal((await request(path,'vendor')).status,403,path);
 }finally{User.findById=originals.findById;User.exists=originals.exists;User.create=originals.create;User.find=originals.find;User.countDocuments=originals.count;User.findOne=originals.findOne;AuditLog.create=originals.audit;await new Promise(resolve=>server.close(resolve))}
});
