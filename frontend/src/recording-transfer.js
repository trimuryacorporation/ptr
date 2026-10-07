export async function transferRecording({api,sessionId,recording,fetchImpl=globalThis.fetch}){
 const signed=(await api.post('/uploads/presign',{sessionId,contentType:recording.type})).data;
 let direct=false;
 try{const response=await fetchImpl(signed.url,{method:'PUT',headers:{'Content-Type':recording.type},body:recording});direct=response.ok}catch{}
 if(!direct){await api.put('/sessions/'+sessionId+'/audio',recording,{params:{size:recording.size},headers:{'Content-Type':recording.type},timeout:0})}
 await api.post('/sessions/'+sessionId+'/files',{key:signed.key,mimeType:recording.type,size:recording.size});
}
