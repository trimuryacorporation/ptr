import {connectDatabase} from './database.js';
import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import dns from 'node:dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {User,Project,Script} from './models.js';
dotenv.config({path:fileURLToPath(new URL('../../.env',import.meta.url))});dotenv.config();
if(process.env.DNS_SERVERS)dns.setServers(process.env.DNS_SERVERS.split(',').map(s=>s.trim()).filter(Boolean));
try{
 await connectDatabase();
 const passwordHash=await bcrypt.hash('Kunu@123',12);
 for(const account of [{fullName:'Trimurya Admin',email:'admin@trimurya.local',mobile:'0000000000',role:'admin'},{fullName:'Trimurya Super Admin',email:'superadmin@trimurya.local',mobile:'0000000001',role:'super_admin'}]){
  await User.findOneAndUpdate({email:account.email},{$set:{...account,passwordHash,status:'verified',refreshTokens:[]},$unset:{resetToken:1,resetExpires:1}},{upsert:true,runValidators:true,setDefaultsOnInsert:true});
  console.log(`Seeded ${account.role}: ${account.email}`);
 }
 let p=await Project.findOne({name:'Hindi Conversation Pilot'});
 if(!p)p=await Project.create({name:'Hindi Conversation Pilot',languages:[{language:'Hindi',dialects:['Standard Hindi']}],targetHours:100,dailyTarget:10,active:true,guidelines:'Record in a quiet room and follow the script naturally.'});
 await Script.updateOne({project:p._id,title:'Daily conversation 01'},{$setOnInsert:{language:'Hindi',dialect:'Standard Hindi',content:'Speaker A: नमस्ते, आप कैसे हैं?\nSpeaker B: मैं ठीक हूँ, धन्यवाद। आज आपका दिन कैसा रहा?'}},{upsert:true});
}catch(e){console.error('MongoDB seed failed: '+e.message);process.exitCode=1}finally{await mongoose.disconnect()}
