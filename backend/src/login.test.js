import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loginCredentials} from './login.js';
test('email login normalizes casing and spaces',()=>assert.deepEqual(loginCredentials({identifier:' ADMIN@trimurya.local ',password:'Kunu@123'}),{query:{email:'admin@trimurya.local'},password:'Kunu@123'}));
test('mobile login normalizes formatted digits',()=>assert.deepEqual(loginCredentials({identifier:'+91 98765-43210',password:'secret'}).query,{mobile:'+919876543210'}));
test('existing email API clients remain supported',()=>assert.deepEqual(loginCredentials({email:'admin@trimurya.local',password:'secret'}).query,{email:'admin@trimurya.local'}));
test('login rejects missing password and invalid identifiers',()=>{for(const body of [{identifier:'admin@trimurya.local'},{identifier:'not-a-number',password:'secret'},{identifier:'bad@',password:'secret'}])assert.throws(()=>loginCredentials(body))});
