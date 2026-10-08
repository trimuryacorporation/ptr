export async function transferRecording({api,sessionId,recording,fetchImpl=globalThis.fetch}){
 const signed=(await api.post('/uploads/presign',{sessionId,contentType:recording.type})).data;
 let direct=false;
 try{const response=await fetchImpl(signed.url,{method:'PUT',headers:{'Content-Type':recording.type},body:recording});direct=response.ok}catch{}
 if(!direct){try{await api.put('/sessions/'+sessionId+'/audio',recording,{params:{size:recording.size},headers:{'Content-Type':recording.type},timeout:0})}catch(error){if(error.response?.status===404)throw new Error('Cloud upload is blocked and the server upload route is unavailable. Ask your administrator to deploy the latest backend and check R2 bucket CORS. Keep this screen open, then retry Submit recording.');throw error}}
 await api.post('/sessions/'+sessionId+'/files',{key:signed.key,mimeType:recording.type,size:recording.size});
}
