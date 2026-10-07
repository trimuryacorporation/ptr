import {smtpSecurity} from './smtp-config.js';
import nodemailer from 'nodemailer';
export function deliveryConfigured(channel,config=process.env){return channel==='email'?!!(config.SMTP_HOST&&config.SMTP_FROM&&config.SMTP_USER&&config.SMTP_PASS):!!(config.TWILIO_ACCOUNT_SID&&config.TWILIO_AUTH_TOKEN&&config.TWILIO_FROM_NUMBER)}
export async function deliverOtp(channel,to,code,config=process.env){return deliverMessage(channel,to,`Your Trimurya login code is ${code}. It expires in 5 minutes. Do not share this code.`,'Your Trimurya login code',config)}
export async function deliverMessage(channel,to,text,subject,config=process.env){
 if(channel==='email'){
  const transporter=nodemailer.createTransport({host:config.SMTP_HOST,port:Number(config.SMTP_PORT||587),...smtpSecurity(config),auth:{user:config.SMTP_USER,pass:config.SMTP_PASS},connectionTimeout:10000,socketTimeout:15000});
  await transporter.sendMail({from:config.SMTP_FROM,to,subject,text});return;
 }
 if(!/^\+[1-9]\d{9,14}$/.test(to)){const prefix=config.SMS_DEFAULT_COUNTRY_CODE;if(!/^\+[1-9]\d{0,3}$/.test(prefix||''))throw Error('SMS country code is not configured');to=prefix+to}
 const sid=config.TWILIO_ACCOUNT_SID;
 const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(sid+':'+config.TWILIO_AUTH_TOKEN).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({To:to,From:config.TWILIO_FROM_NUMBER,Body:text}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('SMS provider rejected delivery');
}
