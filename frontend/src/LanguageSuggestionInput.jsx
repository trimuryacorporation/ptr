import React,{useId} from 'react';

export default function LanguageSuggestionInput({value,onChange,suggestions,placeholder,disabled=false}){
 const id=useId();
 return <><input required maxLength={100} autoComplete="off" disabled={disabled} list={id} className="mt-2 block w-full rounded-xl border p-3" value={value} placeholder={placeholder} onChange={event=>onChange(event.target.value)}/><datalist id={id}>{suggestions.map(name=><option key={name} value={name}/>)}</datalist></>;
}
