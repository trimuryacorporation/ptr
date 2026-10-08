import dns from 'node:dns';
import mongoose from 'mongoose';

export function databaseOptions(){
 const servers=(process.env.DNS_SERVERS||'').split(',').map(value=>value.trim()).filter(Boolean);
 const options={serverSelectionTimeoutMS:15000};
 if(!servers.length)return options;
 dns.setServers(servers);
 const resolver=new dns.Resolver({timeout:3000,tries:2});
 resolver.setServers(servers);
 // MongoDB's SRV lookup uses resolveSrv, but shard sockets use lookup.
 // Apply the configured DNS servers to both instead of the Windows DNS cache.
 options.lookup=(hostname,settings,callback)=>{
  if(typeof settings==='function'){callback=settings;settings={}}
  if(typeof settings==='number')settings={family:settings};
  settings=settings||{};
  const family=settings.family===6?6:4;
  const method=family===6?'resolve6':'resolve4';
  resolver[method](hostname,(error,addresses)=>{
   if(error)return callback(error);
   if(settings.all)return callback(null,addresses.map(address=>({address,family})));
   callback(null,addresses[0],family);
  });
 };
 return options;
}

export function connectDatabase(){
 return mongoose.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/trimurya',databaseOptions());
}
