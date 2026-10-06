import React,{useState,useRef,useEffect,useId} from 'react';
import {createPortal} from 'react-dom';

export function InsertBetween({task,onInsert}){
const button=useRef(null),menu=useRef(null),id=useId();
const [position,setPosition]=useState(null);
const close=(restore=false)=>{setPosition(null);if(restore)button.current?.focus()};
useEffect(()=>{
if(!position)return;
menu.current?.querySelector('button')?.focus();
const outside=e=>{if(!menu.current?.contains(e.target)&&!button.current?.contains(e.target))close()};
const dismiss=()=>close();
document.addEventListener('pointerdown',outside);window.addEventListener('resize',dismiss);window.addEventListener('scroll',dismiss,true);
return ()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',dismiss);window.removeEventListener('scroll',dismiss,true)};
},[position]);
const open=()=>{if(position){close(true);return}const r=button.current.getBoundingClientRect();setPosition({left:Math.max(8,Math.min(innerWidth-188,r.left-70)),top:r.bottom+100<innerHeight?r.bottom+6:Math.max(8,r.top-96)})};
const choose=child=>{close();onInsert(task.id,child)};
return <div className="insert-between"><button ref={button} className="insert-plus" aria-label={`Add note after: ${task.text||'Untitled note'}`} aria-haspopup="menu" aria-expanded={!!position} aria-controls={position?id:undefined} onClick={open}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></button>{position&&createPortal(<div ref={menu} id={id} className="insert-menu" role="menu" aria-label="Add a note" style={position} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)&&e.relatedTarget!==button.current)close()}} onKeyDown={e=>{
if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true)}
if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.stopPropagation();choose(true)}
if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();const options=Array.from(menu.current.querySelectorAll('button')),current=options.indexOf(document.activeElement);const next=e.key==='Home'?0:e.key==='End'?options.length-1:(current+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next]?.focus()}
}}><button role="menuitem" onClick={()=>choose(false)}>New note <kbd>Enter</kbd></button><button role="menuitem" onClick={()=>choose(true)}>Child note <kbd>Ctrl/⌘ + Enter</kbd></button></div>,document.body)}</div>;
}
