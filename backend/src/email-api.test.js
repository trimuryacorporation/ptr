import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deliverOtp,deliveryConfigured} from './otp-delivery.js';
import {publicConfig,encryptSecret,decryptSecret,saveProviderConfig} from './integration-settings.js';
import {IntegrationSettings} from './models.js';
import {deliveryErrorMessage} from './smtp-config.js';
process.env.INTEGRATIONS_ENCRYPTION_KEY='email-api-test-key';
test('HTTPS OTP delivery checks provider acceptance and uses selected transport',async()=>{
 const original=globalThis.fetch;const config={EMAIL_PROVIDER:'resend',RESEND_API_KEY:'test-key',SMTP_FROM:'sender@example.com'};
 assert.equal(deliveryConfigured('email',config),true);assert.equal(deliveryConfigured('email',{...config,RESEND_API_KEY:''}),false);
 try{globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers.Authorization,'Bearer test-key');const body=JSON.parse(options.body);assert.deepEqual(body.to,['recipient@example.com']);assert.match(body.text,/123456/);return {ok:true,json:async()=>({id:'accepted-id'})}};await deliverOtp('email','recipient@example.com','123456',config);
 globalThis.fetch=async()=>({ok:false,status:403});await assert.rejects(()=>deliverOtp('email','recipient@example.com','123456',config),error=>error.code==='EMAIL_API_SENDER');
 globalThis.fetch=async()=>({ok:true,json:async()=>({})});await assert.rejects(()=>deliverOtp('email','recipient@example.com','123456',config),error=>error.code==='EMAIL_API_REJECTED');
 }finally{globalThis.fetch=original}
});
test('email API keys are encrypted, masked and retained when saving blank',async()=>{
 const find=IntegrationSettings.findOne,update=IntegrationSettings.findOneAndUpdate;const doc={config:{SMTP_HOST:'smtp.example.com',TWILIO_AUTH_TOKEN:encryptSecret('sms-token')}};
 IntegrationSettings.findOne=()=>({lean:async()=>doc});IntegrationSettings.findOneAndUpdate=async(q,u)=>{for(const[k,v]of Object.entries(u.$set))if(k.startsWith('config.'))doc.config[k.slice(7)]=v};
 try{await saveProviderConfig('email',{EMAIL_PROVIDER:'resend',RESEND_API_KEY:'private-api-key',SMTP_FROM:'sender@example.com'},'actor');assert.equal(decryptSecret(doc.config.RESEND_API_KEY),'private-api-key');assert.notEqual(doc.config.RESEND_API_KEY,'private-api-key');const masked=publicConfig({RESEND_API_KEY:'private-api-key'});assert.equal(masked.RESEND_API_KEY,undefined);assert.equal(masked.RESEND_API_KEYConfigured,true);const secret=doc.config.RESEND_API_KEY;await saveProviderConfig('email',{EMAIL_PROVIDER:'resend',RESEND_API_KEY:'',SMTP_FROM:'sender@example.com'},'actor');assert.equal(doc.config.RESEND_API_KEY,secret);assert.equal(decryptSecret(doc.config.TWILIO_AUTH_TOKEN),'sms-token');assert.match(deliveryErrorMessage({code:'EMAIL_API_AUTH'},'email'),/API key/)}finally{IntegrationSettings.findOne=find;IntegrationSettings.findOneAndUpdate=update}
});
