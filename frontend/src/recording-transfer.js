export async function transferRecording({api,sessionId,recording}){
 let uploaded;
 try{uploaded=(await api.put('/sessions/'+sessionId+'/audio',recording,{params:{size:recording.size},headers:{'Content-Type':recording.type},timeout:0})).data}
 catch(error){if(error.response?.status===404)throw new Error('The Opus upload service is unavailable. Ask your administrator to deploy the latest backend. Keep this screen open, then retry Submit recording.');throw error}
 await api.post('/sessions/'+sessionId+'/files',{key:uploaded.key,mimeType:uploaded.mimeType,size:uploaded.size});
}
