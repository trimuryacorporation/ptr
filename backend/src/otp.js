import crypto from 'node:crypto';
import {z} from 'zod';
export const OTP_TTL=5*60*1000;
export function otpIdentifier(value){const input=z.string().trim().min(1).parse(value);if(input.includes('@')){const email=z.string().email().parse(input.toLowerCase());return {identifier:email,query:{email},channel:'email'}}const mobile=input.replace(/[\s()-]/g,'');z.string().regex(/^\+?[1-9]\d{9,14}$/).parse(mobile);return {identifier:mobile,query:{mobile},channel:'sms'}}
export function otpDigest(challengeId,code){return crypto.createHmac('sha256',process.env.OTP_SECRET||process.env.JWT_ACCESS_SECRET).update(challengeId+':'+code).digest('hex')}
export function otpMatches(challengeId,code,digest){const candidate=Buffer.from(otpDigest(challengeId,code),'hex'),saved=Buffer.from(digest,'hex');return candidate.length===saved.length&&crypto.timingSafeEqual(candidate,saved)}
