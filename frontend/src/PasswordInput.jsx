import React,{useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
export default function PasswordInput({label='password',className='',...props}){
 const[visible,setVisible]=useState(false);
 return <div className="password-control"><input {...props} className={className} type={visible?'text':'password'}/><button type="button" disabled={props.disabled} className="password-eye" aria-label={`${visible?'Hide':'Show'} ${label}`} aria-pressed={visible} aria-controls={props.id} onClick={()=>setVisible(value=>!value)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>;
}
