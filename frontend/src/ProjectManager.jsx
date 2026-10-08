import React,{useState} from 'react';
import {Plus,Eye,Pencil,Trash2,X} from 'lucide-react';
import ProjectDetails from './ProjectDetails';
import LanguageSuggestionInput from './LanguageSuggestionInput';
import {languageSuggestions,dialectSuggestions,catalogSources} from './language-catalog';
import {api} from './api';
import useWorkspaceRefresh from './useWorkspaceRefresh';

const empty={name:'',language:'',dialect:''};
const inputClass='mt-2 block w-full rounded-xl border p-3';
export default function ProjectManager(){
 const[projects,setProjects]=useState([]),[form,setForm]=useState(empty),[selected,setSelected]=useState(''),[language,setLanguage]=useState(''),[newLanguage,setNewLanguage]=useState(''),[firstDialect,setFirstDialect]=useState(''),[dialect,setDialect]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const[details,setDetails]=useState(null);
 async function deleteProject(item){if(busy||!window.confirm(`Delete project "${item.name}"? This cannot be undone.`))return;setBusy(true);setMessage('');try{await api.delete(`/projects/${item._id}`);setProjects(previous=>previous.filter(row=>row._id!==item._id));if(selected===item._id){setSelected('');setLanguage('');setDialect('');setNewLanguage('');setFirstDialect('')}if(details?.project._id===item._id)setDetails(null);setMessage('Project deleted successfully.')}catch(error){setMessage(error.response?.data?.message||'Unable to delete project.')}finally{setBusy(false)}}
 const suggestedLanguages=languageSuggestions(projects);
 const project=projects.find(item=>item._id===selected);
 useWorkspaceRefresh(async()=>{try{setProjects((await api.get('/projects')).data);setMessage('')}catch{setMessage('Unable to load projects. Use Refresh to try again.')}});
 async function save(event,kind){
  event.preventDefault();if(busy)return;setBusy(true);setMessage('');
  try{
   if(kind==='project'){
    const name=form.name.trim(),lang=form.language.trim(),accent=form.dialect.trim();
    if(!name||!lang||!accent)throw Error('Enter a project name, language and dialect.');
    if(projects.some(item=>item.name.trim().toLowerCase()===name.toLowerCase()))throw Error('A project with this name already exists.');
    const result=await api.post('/projects',{name,languages:[{language:lang,dialects:[accent]}]});
    setProjects(previous=>[result.data,...previous]);setSelected(result.data._id);setLanguage(lang);setForm(empty);
   }else{
    if(!project)throw Error('Select a project first.');
    const languages=(project.languages||[]).map(entry=>({language:entry.language,dialects:[...(entry.dialects||[])]}));
    const name=newLanguage.trim(),accent=(kind==='language'?firstDialect:dialect).trim();
    if(kind==='language'){
     if(!name||!accent)throw Error('Enter a language and its first dialect.');
     if(languages.some(entry=>entry.language.toLowerCase()===name.toLowerCase()))throw Error('This language already exists in the project.');
     languages.push({language:name,dialects:[accent]});
    }else{
     const entry=languages.find(item=>item.language===language);
     if(!entry||!accent)throw Error('Select a language and enter a dialect.');
     if(entry.dialects.some(value=>value.toLowerCase()===accent.toLowerCase()))throw Error('This dialect already exists in the language.');
     entry.dialects.push(accent);
    }
    const result=await api.patch(`/projects/${project._id}`,{languages});
    setProjects(previous=>previous.map(item=>item._id===result.data._id?result.data:item));
    if(kind==='language'){setLanguage(name);setNewLanguage('');setFirstDialect('')}setDialect('');
   }
   setMessage(`${kind==='project'?'Project':kind==='language'?'Language':'Dialect'} added successfully.`);
  }catch(error){setMessage(error.response?.data?.message||error.message||'Unable to save changes.')}finally{setBusy(false)}
 }
 return <div><p className="participant-kicker">CONTENT LIBRARY</p><h1 className="text-2xl font-bold mt-2 mb-2">Projects, languages & dialects</h1><p className="text-sm text-slate-500 mb-6">Create projects and add the languages and dialects available for scripts and recording.</p><p className="text-sm text-slate-500 mb-4">Search a language, then choose a related dialect or enter your own. Suggestions include regional varieties and mother-tongue groups.</p><details className="text-sm text-slate-500 mb-6"><summary className="cursor-pointer">Saved list sources</summary><p className="mt-2">Standard labels are project defaults. Regional classifications can vary.</p>{catalogSources.map(source=><a key={source.url} className="block underline mt-2" href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</details>
 <form className="card p-5 mb-6" onSubmit={event=>save(event,'project')}><h2 className="font-bold mb-4">Add project</h2><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-3">{[['name','Project name'],['language','First language'],['dialect','First dialect']].map(([key,label])=><label key={key} className="text-sm">{label}{key==='name'?<input required maxLength={100} className={inputClass} value={form.name} onChange={event=>setForm(previous=>({...previous,name:event.target.value}))}/>:<LanguageSuggestionInput value={form[key]} disabled={key==='dialect'&&!form.language.trim()} placeholder={key==='language'?'Search language or enter your own':'Search dialect or enter your own'} suggestions={key==='language'?suggestedLanguages:dialectSuggestions(form.language,projects)} onChange={value=>setForm(previous=>({...previous,[key]:value,...(key==='language'?{dialect:''}:{})}))}/>}</label>)}</fieldset><button disabled={busy} className="btn-primary mt-4"><Plus size={17}/>Add project</button></form>
 <section className="card p-5 mb-6"><h2 className="font-bold mb-4">Add language or dialect</h2><label className="block text-sm">Project<select className={inputClass} disabled={busy} value={selected} onChange={event=>{setSelected(event.target.value);setLanguage('');setNewLanguage('');setFirstDialect('');setDialect('')}}><option value="">Select project</option>{projects.map(item=><option key={item._id} value={item._id}>{item.name}{item.active?'':' (inactive)'}</option>)}</select></label>{project&&<div className="grid gap-6 mt-5 sm:grid-cols-2"><form onSubmit={event=>save(event,'language')}><fieldset disabled={busy}><h3 className="font-semibold mb-3">Add language</h3><label className="block text-sm">Language name<LanguageSuggestionInput value={newLanguage} suggestions={suggestedLanguages} placeholder="Search language or enter your own" onChange={value=>{setNewLanguage(value);setFirstDialect('')}}/></label><label className="block text-sm mt-3">First dialect<LanguageSuggestionInput value={firstDialect} disabled={!newLanguage.trim()} suggestions={dialectSuggestions(newLanguage,projects)} placeholder="Search dialect or enter your own" onChange={setFirstDialect}/></label><button className="btn-primary mt-4"><Plus size={17}/>Add language</button></fieldset></form><form onSubmit={event=>save(event,'dialect')}><fieldset disabled={busy}><h3 className="font-semibold mb-3">Add dialect</h3><label className="block text-sm">Language<select required className={inputClass} value={language} onChange={event=>{setLanguage(event.target.value);setDialect('')}}><option value="">Select language</option>{(project.languages||[]).map(entry=><option key={entry.language} value={entry.language}>{entry.language}</option>)}</select></label><label className="block text-sm mt-3">Dialect name<LanguageSuggestionInput value={dialect} disabled={!language} suggestions={dialectSuggestions(language,projects)} placeholder="Search dialect or enter your own" onChange={setDialect}/></label><button className="btn-primary mt-4"><Plus size={17}/>Add dialect</button></fieldset></form></div>}</section>
 {message&&<p role="status" className="text-sm mb-5">{message}</p>}<h2 className="font-bold mb-3">Projects ({projects.length})</h2><div className="grid gap-3">{projects.map(item=><article key={item._id} className="card p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">{item.name}</h3><div className="flex gap-2">{[[Eye,'View',()=>setDetails({project:item,mode:'view'})],[Pencil,'Edit',()=>setDetails({project:item,mode:'edit'})],[Trash2,'Delete',()=>deleteProject(item)]].map(([Icon,label,action])=><button type="button" key={label} disabled={busy} className={'rounded-lg border p-2 hover:bg-slate-50 '+(label==='Delete'?'text-red-600':'text-slate-600')} title={label+' project'} aria-label={label+' project '+item.name} onClick={action}><Icon size={18}/></button>)}</div></div><p className="text-xs text-slate-500 mt-2">{item.active?'Active':'Inactive'}</p>{(item.languages||[]).map(entry=><p key={entry.language} className="text-sm text-slate-500 mt-2"><strong>{entry.language}</strong>: {(entry.dialects||[]).join(', ')||'No dialects added'}</p>)}</article>)}</div>{details&&<ProjectDetails key={details.project._id+details.mode} project={details.project} mode={details.mode} projects={projects} onClose={()=>setDetails(null)} onSaved={updated=>{setProjects(previous=>previous.map(item=>item._id===updated._id?updated:item));if(selected===updated._id){setLanguage('');setDialect('')}setDetails(null);setMessage('Project updated successfully.')}}/>}</div>;
}
