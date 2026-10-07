import React,{useEffect,useState} from 'react';
import {Users,RefreshCw} from 'lucide-react';
import {api} from './api';
export default function AvailabilityCounts({participant=false,selection={}}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const project=selection.project||'',language=selection.language||'',dialect=selection.dialect||'';
 useEffect(()=>{let active=true,version=0;
 async function load(){const request=++version;setBusy(true);try{const params=Object.fromEntries(Object.entries({project,language,dialect}).filter(([,value])=>value));const response=await api.get('/availability/groups',{params});if(active&&request===version){setData(response.data);setError('')}}catch{if(active&&request===version){setData(null);setError('Unable to load available participants. Try Refresh.')}}finally{if(active&&request===version)setBusy(false)}}
 const refresh=e=>{const task=load();if(e.detail?.tasks)e.detail.tasks.push(task)};
 load();const timer=setInterval(load,15000);window.addEventListener('workspace:refresh',refresh);window.addEventListener('availability:refresh',refresh);
 return()=>{active=false;clearInterval(timer);window.removeEventListener('workspace:refresh',refresh);window.removeEventListener('availability:refresh',refresh)};
 },[project,language,dialect]);
 return <section className="availability-panel" aria-label="Available participants"><div className="availability-heading"><div><Users size={17}/><h2>{participant?'Available partners':'Available participants'}</h2><strong aria-live="polite">{data?.total??'?'}</strong></div><button type="button" aria-label="Refresh available participants" disabled={busy} onClick={()=>window.dispatchEvent(new Event('availability:refresh'))}><RefreshCw size={15} className={busy?'animate-spin':''}/></button></div><p>{participant?'Online and waiting in your recording mode.':'Online and waiting, grouped by matching preferences.'}</p>{error?<p role="alert" className="availability-error">{error}</p>:!data?<p>Loading availability?</p>:data.groups.length?<div className="availability-groups">{data.groups.map(group=><article key={[group.projectId,group.language,group.dialect].join(':')}><div><strong>{group.projectName}</strong><span>{group.language} ? {group.dialect}</span></div><b>{group.count}<small>{group.count===1?' participant':' participants'}</small></b></article>)}</div>:<p>No matching participants waiting right now.</p>}</section>
}
