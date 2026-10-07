import {test} from 'node:test';import assert from 'node:assert/strict';import {otpIdentifier,otpDigest,otpMatches} from './otp.js';
process.env.OTP_SECRET='test-otp-secret';
test('OTP identifier accepts normalized email and mobile',()=>{assert.deepEqual(otpIdentifier(' USER@example.com ').query,{email:'user@example.com'});assert.deepEqual(otpIdentifier('+91 98765-43210').query,{mobile:'+919876543210'})});
test('OTP identifier rejects invalid recipients and injection objects',()=>{for(const input of ['bad@','1234',{$ne:null}])assert.throws(()=>otpIdentifier(input))});
test('OTP digest binds code to challenge and rejects incorrect code',()=>{const digest=otpDigest('challenge-a','123456');assert.ok(otpMatches('challenge-a','123456',digest));assert.equal(otpMatches('challenge-a','654321',digest),false);assert.equal(otpMatches('challenge-b','123456',digest),false);assert.equal(otpMatches('challenge-a','123456',''),false);assert.ok(!digest.includes('123456'))});
