export function recordingState(session){return {state:session.controlState||'idle',version:session.controlVersion||0,elapsedMs:session.controlElapsedMs||0,changedAt:session.controlChangedAt?new Date(session.controlChangedAt).getTime():null,muted:!!session.controlMuted}}
export function recordingTransition(session,action,now=Date.now()){
 const current=recordingState(session);let {state,elapsedMs,changedAt,muted}=current;
 if(action==='start'){if(state!=='idle')throw Error('Recording has already started');state='recording';elapsedMs=0;changedAt=now}
 else if(action==='pause'){if(state!=='recording')throw Error('Recording is not running');elapsedMs+=Math.max(0,now-changedAt);state='paused';changedAt=now}
 else if(action==='resume'){if(state!=='paused')throw Error('Recording is not paused');state='recording';changedAt=now}
 else if(action==='stop'){if(!['recording','paused'].includes(state))throw Error('Recording is not active');if(state==='recording')elapsedMs+=Math.max(0,now-changedAt);state='stopped';changedAt=now}
 else if(action==='mute'||action==='unmute'){muted=action==='mute'}else throw Error('Unknown recording action');
 return {state,version:current.version+1,elapsedMs,changedAt,muted};
}
