import React,{useState,useEffect,useRef} from 'react';
import {outsideDialog} from './dialog.js';
import {searchCommands} from './themes.js';
export function CommandPalette({open,onClose,commands,onPreviewTheme}){
const dialog=useRef(null),input=useRef(null);
const [query,setQuery]=useState(''),[active,setActive]=useState(0);
const matches=searchCommands(commands,query);
useEffect(()=>{if(open){setQuery('');setActive(0);dialog.current.showModal();input.current.focus()}else dialog.current?.close()},[open]);
useEffect(()=>{dialog.current?.querySelector('[data-active="true"]')?.scrollIntoView({block:'nearest'})},[active,query]);
const highlightedTheme=open&&matches[active]?.id.startsWith('theme-')?matches[active].id.slice(6):null;
useEffect(()=>{onPreviewTheme?.(highlightedTheme)},[highlightedTheme,onPreviewTheme]);
const close=()=>{onPreviewTheme?.(null);onClose()};
const run=c=>{if(!c||c.disabled)return;dialog.current.close();close();requestAnimationFrame(c.run)};
return <dialog ref={dialog} className="command-dialog" aria-labelledby="command-title" onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(outsideDialog(e))close()}}>
<div className="command-search"><button aria-label="Search" className="command-search-icon" onClick={()=>input.current?.focus()}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></button><input ref={input} id="command-title" role="combobox" aria-label="Search notes and actions" aria-expanded="true" aria-controls="command-results" aria-activedescendant={matches[active]?'command-'+matches[active].id:undefined} placeholder="Search notes, actions, themes…" value={query} onChange={e=>{setQuery(e.target.value);setActive(0)}} onKeyDown={e=>{
if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setActive(i=>matches.length?(i+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length:0)}
if(e.key==='Home'){e.preventDefault();setActive(0)}if(e.key==='End'){e.preventDefault();setActive(Math.max(0,matches.length-1))}
if(e.key==='Enter'){e.preventDefault();run(matches[active])}
}}/><button aria-label="Close command palette" onClick={close}><kbd>Esc</kbd></button></div>
<div id="command-results" role="listbox" aria-label="Actions" className="command-results">{matches.map((c,i)=><React.Fragment key={c.id}>{(i===0||matches[i-1].group!==c.group)&&<div className="command-group">{c.group}</div>}<button id={'command-'+c.id} role="option" aria-selected={i===active} aria-disabled={!!c.disabled} data-active={i===active} tabIndex={-1} className="command-result" onMouseMove={()=>setActive(i)} onClick={()=>run(c)}><span>{c.label}{c.selected&&<span className="command-current">Current</span>}</span>{c.shortcut&&<kbd>{c.shortcut}</kbd>}</button></React.Fragment>)}{!matches.length&&<p className="command-empty">No matches. Try a note’s text, “theme”, or “collapse”.</p>}</div>
<div className="command-footer"><span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span><span><kbd>Enter</kbd> Run</span><span><kbd>Esc</kbd> Close</span></div></dialog>
}
