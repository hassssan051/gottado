import React,{useState,useRef,useEffect,useId} from 'react';
import {EXPERIMENTAL_FEATURES} from './experimental.js';

export function ExperimentalFeatures({enabled,onChange}){
const [open,setOpen]=useState(false),root=useRef(null),trigger=useRef(null),panel=useRef(null),id=useId();
const close=restore=>{setOpen(false);if(restore)trigger.current?.focus()};
useEffect(()=>{
if(!open)return;
panel.current?.querySelector('[role="switch"]')?.focus();
const outside=e=>{if(!root.current?.contains(e.target))close(false)};
document.addEventListener('pointerdown',outside);
return ()=>document.removeEventListener('pointerdown',outside);
},[open]);
return <div ref={root} className="experimental-features" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))close(false)}} onKeyDown={e=>{
if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();close(true)}
if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
e.preventDefault();e.stopPropagation();if(!open){setOpen(true);return}
const switches=Array.from(panel.current.querySelectorAll('[role="switch"]')),current=switches.indexOf(document.activeElement);
const next=e.key==='Home'?0:e.key==='End'?switches.length-1:(current+(e.key==='ArrowDown'?1:-1)+switches.length)%switches.length;
switches[next]?.focus();
}
}}>
<button ref={trigger} className="select-trigger experimental-trigger" aria-label="Experimental features" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(value=>!value)}><span>Experimental</span><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 6 4 4 4-4"/></svg></button>
{open&&<div ref={panel} id={id} className="experimental-panel" role="region" aria-label="Experimental features"><h3>Experimental features</h3>{EXPERIMENTAL_FEATURES.map(feature=><div key={feature.id} className="experimental-option"><span>{feature.name}</span><button type="button" role="switch" aria-label={feature.name} aria-checked={!!enabled[feature.id]} className="experimental-toggle" onClick={()=>onChange(feature.id,!enabled[feature.id])}><span/></button></div>)}</div>}
</div>;
}
