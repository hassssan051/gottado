import React, {useState, useEffect, useRef, useId} from 'react';
import {createPortal} from 'react-dom';
import {outsideDialog} from './dialog.js';
import {THEMES,resolveTheme} from './themes.js';
import {CommandPalette} from './command-palette.jsx';
import {createRoot} from 'react-dom/client';
import {motion, AnimatePresence, MotionConfig} from 'framer-motion';
import './style.css';
import {Toaster,toast} from 'sonner';
import {toMarkdown} from './markdown.js';
import {parsePaste} from './paste.js';
import {InsertBetween} from './insert-between.jsx';
import {useOutlineDrag} from './use-outline-drag.jsx';
import {ExperimentalFeatures} from './experimental-features.jsx';
import {resolveExperiments} from './experimental.js';
import {createAction,pushAction,reverseAction,shouldUndoApp,UNDO_LIMIT} from './action-history.js';
import {deletionRecord} from './undo.js';
import {depth,indentBranch,removePreservingChildren,insertTask,endOfBranch,visibleTasks,parentIndex,revealTask,setAllCollapsed,moveBranches,moveBranchesTo,selectedBranches,selectionRange,normalizeCompletion,toggleCompletion} from './outline.js';

// Retain legacy storage keys so renaming Gottado preserves existing notes and preferences.
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
// Measure the caret's visual line using the textarea's exact wrapping styles.
function atTextEdge(el,key){
if(el.selectionStart!==el.selectionEnd)return false;
const style=getComputedStyle(el),mirror=document.createElement('div');
for(const property of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','boxSizing','wordBreak','overflowWrap','tabSize'])mirror.style[property]=style[property];
Object.assign(mirror.style,{position:'fixed',left:'-10000px',top:'0',width:el.clientWidth+'px',whiteSpace:'pre-wrap',border:'0'});
const marker=()=>{const span=document.createElement('span');span.textContent='\u200b';return span};
const first=marker(),caret=marker(),last=marker();
mirror.append(first,document.createTextNode(el.value.slice(0,el.selectionStart)),caret,document.createTextNode(el.value.slice(el.selectionStart)),last);
document.body.append(mirror);const y=caret.getBoundingClientRect().top;
const edge=key==='ArrowUp'?first.getBoundingClientRect().top:last.getBoundingClientRect().top;
mirror.remove();return Math.abs(y-edge)<2;
}
function Icon({name,...props}){const paths={feedback:<><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5Z"/><path d="M7 9h9M7 14h6"/></>,eye:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,edit:<><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z"/><path d="m13 6 5 5"/></>,sublist:<><path d="M14 4h6v16h-6"/><path d="M3 12h12m-5-5 5 5-5 5"/></>,share:<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/></>,search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,command:<><rect x='4' y='4' width='16' height='16' rx='4'/><path d='m8 9 3 3-3 3m5 0h3'/></>,info:<><circle cx='12' cy='12' r='9'/><path d='M12 11v6m0-10v1'/></>,copy:<><rect x='8' y='8' width='12' height='12' rx='2'/><path d='M16 8V4H4v12h4'/></>,trash:<><path d='M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7'/></>,indent:<><path d='M10 5h11M10 12h11M10 19h11M2 9l3 3-3 3'/></>,outdent:<><path d='M10 5h11M10 12h11M10 19h11M5 9l-3 3 3 3'/></>,child:<><path d='M5 4v9h9m0-4v8m-4-4h8'/></>,sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,moon:<path d="M20.5 13.2A8.6 8.6 0 0 1 10.8 3.5a8.7 8.7 0 1 0 9.7 9.7Z"/>,hide:<><path d="M3 8h18M8 14l4-4 4 4"/></>,show:<><path d="M3 8h18M8 12l4 4 4-4"/></>,plus:<path d="M12 5v14M5 12h14"/>,cross:<path d="m6 6 12 12M18 6 6 18"/>,check:<path d="m5 12 4 4L19 6"/>};return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name]}</svg>}
function ToolButton({tip,shortcut,icon,children,ref:forwardedRef,...props}){
const local=useRef(null);const timer=useRef(null);const [position,setPosition]=useState(null);const id=useId();
useEffect(()=>()=>clearTimeout(timer.current),[]);
const show=()=>{const r=local.current?.getBoundingClientRect();if(document.activeElement===local.current)return;if(r)setPosition({left:Math.min(innerWidth-120,Math.max(120,r.left+r.width/2)),top:r.bottom+8})};
return <><button {...props} ref={el=>{local.current=el;if(typeof forwardedRef==='function')forwardedRef(el);else if(forwardedRef)forwardedRef.current=el}} aria-describedby={position?id:undefined} onMouseEnter={()=>{timer.current=setTimeout(show,450)}} onMouseLeave={()=>{clearTimeout(timer.current);setPosition(null)}} onFocus={()=>{}} onBlur={()=>{clearTimeout(timer.current);setPosition(null)}}>{icon?<Icon name={icon}/>:children}</button>{position&&createPortal(<div className="styled-tooltip" role="tooltip" id={id} style={position}><span>{tip}</span>{shortcut&&<kbd>{shortcut}</kbd>}</div>,document.body)}</>;
}
function SelectBox({label,value,options,onChange,onPreview,preview=false}){
const [open,setOpen]=useState(false);const [active,setActive]=useState(0);
const root=useRef(null);const trigger=useRef(null);const id=useId();const search=useRef({text:'',time:0});
const current=options.findIndex(o=>o.value===value);
useEffect(()=>{onPreview?.(open?options[active]?.value??null:null)},[open,active,onPreview]);
const show=()=>{setActive(Math.max(0,current));setOpen(true)};
const close=(focus=false)=>{setOpen(false);if(focus)trigger.current?.focus()};
useEffect(()=>{if(!open)return;const outside=e=>{if(!root.current?.contains(e.target))close()};document.addEventListener('pointerdown',outside);return ()=>document.removeEventListener('pointerdown',outside)},[open]);
useEffect(()=>{if(open)root.current?.querySelector('[data-index="'+active+'"]')?.focus()},[open,active]);
const choose=index=>{onChange(options[index].value);close(true)};
const key=e=>{
if(e.altKey||e.ctrlKey||e.metaKey)return;
if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();close(true);return}
if(e.key==='Tab'){close();return}
if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
e.preventDefault();if(!open){show();return}
setActive(i=>e.key==='Home'?0:e.key==='End'?options.length-1:(i+(e.key==='ArrowDown'?1:-1)+options.length)%options.length);return;
}
if(open&&(e.key==='Enter'||e.key===' ')){e.preventDefault();choose(active);return}
if(open&&e.key.length===1){const now=Date.now();search.current={text:(now-search.current.time<700?search.current.text:'')+e.key.toLowerCase(),time:now};const found=options.findIndex(o=>o.label.toLowerCase().startsWith(search.current.text));if(found>=0){e.preventDefault();setActive(found)}}
};
return <div className="select-box" ref={root} onKeyDown={key} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))close()}}><span className="control-label">{label}</span><button ref={trigger} className="select-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" aria-controls={id} onClick={()=>open?close():show()}><span>{options[current]?.label}</span><svg width="12" height="12" viewBox="0 0 16 16" style={{transform:open?'rotate(180deg)':'none'}}><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></button>
<AnimatePresence>{open&&<motion.div id={id} className="select-menu" role="listbox" aria-label={label} initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}}>{options.map((o,index)=><button key={o.value} role="option" aria-selected={o.value===value} tabIndex={index===active?0:-1} data-index={index} onFocus={()=>setActive(index)} onClick={()=>choose(index)} style={preview?{fontFamily:'"'+o.label+'"'}:undefined}><span>{o.label}</span>{o.value===value&&<Icon name="check"/>}</button>)}</motion.div>}</AnimatePresence></div>
}
function TaskText({value,font,size,inputRef,...props}){
const ref=useRef(null);
useEffect(()=>{
const el=ref.current;
const fit=()=>{el.style.height='0px';el.style.height=el.scrollHeight+'px'};
fit();document.fonts.ready.then(fit);
let width=el.clientWidth;
const observer=new ResizeObserver(()=>{if(el.clientWidth!==width){width=el.clientWidth;fit()}});
observer.observe(el);return ()=>observer.disconnect();
},[value,font,size]);
return <textarea ref={el=>{ref.current=el;if(inputRef)inputRef.current=el}} rows={1} value={value} {...props}/>;
}
function ShortcutGroup({title,rows,note}){
return <section className="shortcut-group"><h3>{title}</h3><dl>{rows.map(([label,keys])=><div className="shortcut-row" key={label}><dt>{label}</dt><dd>{keys.map((key,index)=><React.Fragment key={key+index}>{index>0&&<span className="key-plus">+</span>}<kbd>{key}</kbd></React.Fragment>)}</dd></div>)}</dl>{note&&<p className="shortcut-note">{note}</p>}</section>
}
function App(){
const [sharedSnapshot]=useState(()=>location.hash.startsWith('#share=')||location.hash.startsWith('#/shared'));
const [tasks,storeTasks]=useState(()=>normalizeCompletion((()=>{
if(location.hash.startsWith('#/shared')){try{return JSON.parse(sessionStorage.getItem('just-todo-shared-snapshot'))||[]}catch{return []}}
if(location.hash.startsWith('#share=')){try{const payload=JSON.parse(decodeURIComponent(location.hash.slice(7)));if(!Array.isArray(payload)||payload.length>10000)throw Error();let previous=-1;const imported=payload.map(t=>{if(typeof t.text!=='string'||!Number.isInteger(t.depth)||t.depth<0||t.depth>previous+1)throw Error();previous=t.depth;return {id:crypto.randomUUID(),text:t.text.slice(0,500),depth:t.depth,done:!!t.done,collapsed:!!t.collapsed}});try{sessionStorage.setItem('just-todo-shared-snapshot',JSON.stringify(imported))}catch{}history.replaceState(null,'',location.pathname+location.search+'#/shared');return imported}catch{history.replaceState(null,'',location.pathname+location.search+'#/')}}
return read('just-todo-tasks',[])})()));
const tasksRef=useRef(tasks);tasksRef.current=tasks;
const actionHistory=useRef([]);
const setTasks=(update,label='Notes changed',record=true)=>{const previous=tasksRef.current,next=normalizeCompletion(typeof update==='function'?update(previous):update);if(record)actionHistory.current=pushAction(actionHistory.current,createAction({tasks:previous},{tasks:next},label,scopeRef.current));tasksRef.current=next;storeTasks(next)};
const prefsRef=useRef(null);
const [prefs,storePrefs]=useState(()=>{const {alignment,readingWidth,...saved}=read('just-todo-prefs',{});return {font:'Excalifont',size:'medium',hidden:false,viewOnly:false,...saved,showCompleted:saved.showCompleted!==false,experimental:resolveExperiments(saved.experimental),theme:saved.theme||'dark',hierarchy:true,...(sharedSnapshot?{viewOnly:true}: {})}});
prefsRef.current=prefs;
const setPrefs=(update,label='Settings changed')=>{const previous=prefsRef.current,next=typeof update==='function'?update(previous):update;const keys=Object.keys(next).filter(key=>JSON.stringify(next[key])!==JSON.stringify(previous[key]));const before=Object.fromEntries(keys.map(key=>[key,previous[key]])),after=Object.fromEntries(keys.map(key=>[key,next[key]]));actionHistory.current=pushAction(actionHistory.current,createAction(before,after,label));prefsRef.current=next;storePrefs(next)};
const [previewTheme,setPreviewTheme]=useState(null);
const [systemDark,setSystemDark]=useState(()=>matchMedia('(prefers-color-scheme: dark)').matches);
const [confirmRemove,setConfirmRemove]=useState(false);

const [paletteOpen,setPaletteOpen]=useState(false);const selectedTask=useRef(null);
const [selection,storeSelection]=useState({anchor:null,head:null,ids:[]});const selectionRef=useRef(selection);selectionRef.current=selection;
const selectionFocus=useRef(null);
const setSelection=value=>{selectionRef.current=value;storeSelection(value)};
const clearSelection=()=>setSelection({anchor:null,head:null,ids:[]});
const headerRef=useRef(null),breadcrumbRef=useRef(null);
useEffect(()=>{const header=headerRef.current;const measure=()=>document.documentElement.style.setProperty('--toolbar-height',(header?.getBoundingClientRect().height||0)+'px');measure();if(!header)return;const observer=new ResizeObserver(measure);observer.observe(header);return ()=>observer.disconnect()},[prefs.hidden]);
const [helpOpen,setHelpOpen]=useState(false);const helpDialog=useRef(null);const helpButton=useRef(null);
useEffect(()=>{if(helpOpen)helpDialog.current?.showModal();else helpDialog.current?.close()},[helpOpen]);
const [copyOpen,setCopyOpen]=useState(false);const copyDialog=useRef(null);const copyButton=useRef(null);
const [copied,setCopied]=useState(false);
useEffect(()=>{if(copyOpen)copyDialog.current?.showModal();else copyDialog.current?.close()},[copyOpen]);
const undoAction=expected=>{
const latest=actionHistory.current.at(-1);
if(!latest){toast('Can’t undo further',{description:`Only the last ${UNDO_LIMIT} app actions are kept. Hint: textboxes use native text undo.`});return}
if(expected&&expected!==latest){toast('Undo newer actions first',{description:'Hint: use Find notes and actions to undo the latest app action.'});return}
actionHistory.current.pop();
clearSelection();
const restored=reverseAction({tasks:tasksRef.current,...prefsRef.current,scopeId:scopeRef.current},latest);
if(latest.changed.includes('tasks')){setTasks(restored.tasks,'',false);navigate(latest.scopeId,true,false)}
const prefKeys=latest.changed.filter(key=>key!=='tasks'&&key!=='scopeId');
if(prefKeys.length){const next={...prefsRef.current,...Object.fromEntries(prefKeys.map(key=>[key,restored[key]]))};prefsRef.current=next;storePrefs(next)}
if(latest.changed.includes('scopeId'))navigate(restored.scopeId,true,false);
setDeleteId(null);setConfirmRemove(false);setNotice('');
toast.success('Undone: '+latest.label,{description:'Hint: Ctrl/⌘ + Z outside textboxes undoes up to five app actions.'});
};
const undoRef=useRef(null);undoRef.current=undoAction;
useEffect(()=>{const key=e=>{if(!shouldUndoApp(e))return;e.preventDefault();undoRef.current()};window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key)},[]);
const copyMarkdown=async()=>{
const markdown=toMarkdown(exportTasks,true,scope?scope.text:null);
try{await navigator.clipboard.writeText(markdown);setCopied(true);setTimeout(()=>setCopied(false),1800);toast.success('Markdown copied',{description:'Hint: Ctrl/⌘ + C copies the focused note.'})}
catch{setCopyOpen(true)}
};
const [notice,setNotice]=useState('');
const dialog=useRef(null);const bulkConfirm=useRef(null);const shortcutCommands=useRef({});
const requestBulkDelete=mode=>{if(prefs.viewOnly)return;setConfirmRemove(mode)};
useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)');const change=e=>setSystemDark(e.matches);media.addEventListener('change',change);return ()=>media.removeEventListener('change',change)},[]);
const activeTheme=resolveTheme(previewTheme??prefs.theme,systemDark);const dark=activeTheme.dark;
useEffect(()=>{if(confirmRemove){dialog.current?.showModal();bulkConfirm.current?.focus()}else dialog.current?.close()},[confirmRemove]);
useEffect(()=>{const key=e=>{if(e.defaultPrevented||e.isComposing||!e.altKey||e.ctrlKey||e.metaKey||document.querySelector('dialog[open]'))return;const command=shortcutCommands.current[(e.shiftKey?'shift+':'')+e.key.toLowerCase()];if(!command||command.disabled)return;e.preventDefault();command.run()};window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key)},[]);
const [deleteId,setDeleteId]=useState(null);const [deleteChildren,setDeleteChildren]=useState(false);const deleteDialog=useRef(null);const deleteConfirm=useRef(null);
const [flashId,setFlashId]=useState(null);
const routeId=()=>{try{return location.hash.startsWith('#/shared/list/')?decodeURIComponent(location.hash.slice(14)):location.hash.startsWith('#/list/')?decodeURIComponent(location.hash.slice(7)):null}catch{return null}};
const [scopeId,setScopeId]=useState(routeId);
const scopeRef=useRef(scopeId);scopeRef.current=scopeId;
useEffect(()=>{const nav=breadcrumbRef.current;if(nav)nav.scrollLeft=nav.scrollWidth},[scopeId]);
useEffect(()=>{const change=()=>{const next=routeId();if(next!==scopeRef.current)clearSelection();actionHistory.current=pushAction(actionHistory.current,createAction({scopeId:scopeRef.current},{scopeId:next},'List navigation'));scopeRef.current=next;setScopeId(next)};window.addEventListener('hashchange',change);return ()=>window.removeEventListener('hashchange',change)},[]);
useEffect(()=>{if(deleteId){setDeleteChildren(false);deleteDialog.current?.showModal();deleteConfirm.current?.focus()}else deleteDialog.current?.close()},[deleteId]);
const navigate=(id,replace=false,record=true,revealId=null)=>{
if(record)clearSelection();
const beforeScope=scopeRef.current,previous=tasksRef.current;
if(id){const i=previous.findIndex(t=>t.id===id);if(i<0||endOfBranch(previous,i)<=i+1)id=null}
const next=revealId?revealTask(previous,revealId):previous;
if(record)actionHistory.current=pushAction(actionHistory.current,createAction({scopeId:beforeScope,tasks:previous},{scopeId:id,tasks:next},'List navigation',beforeScope));
if(revealId)setTasks(next,'',false);
const hash=(sharedSnapshot?'/shared':'')+(id?'/list/'+encodeURIComponent(id):'/');if(replace)history.replaceState(null,'',location.pathname+location.search+'#'+hash);else location.hash=hash;scopeRef.current=id;setScopeId(id);
};
const [draft,setDraft]=useState('');const input=useRef(null);
useEffect(()=>{if(sharedSnapshot){try{sessionStorage.setItem('just-todo-shared-snapshot',JSON.stringify(tasks))}catch{}return}try{localStorage.setItem('just-todo-tasks',JSON.stringify(tasks))}catch{}},[tasks,sharedSnapshot]);
useEffect(()=>{if(sharedSnapshot)return;try{localStorage.setItem('just-todo-prefs',JSON.stringify(prefs))}catch{}},[prefs]);
useEffect(()=>{const root=document.documentElement;root.dataset.theme=activeTheme.id;root.dataset.colorScheme=dark?'dark':'light';['bg','ink','muted','line','soft','accent'].forEach((name,i)=>root.style.setProperty('--'+name,activeTheme.colors[i]));root.style.background=activeTheme.colors[0];root.style.color=activeTheme.colors[1];root.style.colorScheme=dark?'dark':'light';document.querySelector('meta[name=theme-color]')?.setAttribute('content',activeTheme.colors[0])},[activeTheme,dark]);
useEffect(()=>{const key=e=>{if(e.isComposing)return;const mod=e.ctrlKey||e.metaKey;if(mod&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();if(!document.querySelector('dialog[open]')||paletteOpen)setPaletteOpen(v=>!v)}if(mod&&!e.shiftKey&&e.key==='/'){e.preventDefault();if(!document.querySelector('dialog[open]')||helpOpen)setHelpOpen(v=>!v)}};window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key)},[paletteOpen,helpOpen]);
useEffect(()=>{const first=visible[0];requestAnimationFrame(()=>{if(first)focusTask(first.id);else input.current?.focus()})},[]);
const update=(k,v)=>setPrefs(p=>({...p,[k]:v}),({font:'Font',size:'Font size',theme:'Theme',viewOnly:'Mode',hidden:'Header visibility',experimental:'Experimental features',showCompleted:'Completed visibility'}[k]||'Settings')+' changed');
const add=e=>{e.preventDefault();if(prefs.viewOnly||!draft.trim())return;const task={id:crypto.randomUUID(),text:draft.trim(),done:false,depth:scope?depth(scope)+1:0};setTasks(t=>{const at=scope?t.findIndex(x=>x.id===scope.id)+1:0;return [...t.slice(0,at),task,...t.slice(at)]},'Note added');setDraft('');input.current?.focus()};
const paste=e=>{
if(prefs.viewOnly)return;
const source=e.clipboardData.getData('text/plain');
if(!source.includes('\n')&&!source.includes('\r'))return;
const parsed=parsePaste(source);if(parsed.entries.length<2)return;
e.preventDefault();
const imported=parsed.entries.map(t=>({...t,id:crypto.randomUUID()}));
setTasks(ts=>{const at=scope?ts.findIndex(t=>t.id===scope.id)+1:0;return [...ts.slice(0,at),...imported.map(t=>({...t,depth:depth(t)+(scope?depth(scope)+1:0)})),...ts.slice(at)]},'Notes pasted');
// Nesting is always enabled; pasting is one reversible action.
toast.success('Added '+imported.length+' tasks',{description:'Hint: Tab nests a note under its previous sibling.'});
};
const deleteTask=(id,includeChildren=false)=>{
if(prefs.viewOnly)return;
const current=tasksRef.current;const record=deletionRecord(current,id,[],includeChildren);if(!record)return;
const currentScope=current.findIndex(t=>t.id===scopeId);
const index=visibleTasks(currentScope>=0?current.slice(currentScope+1,endOfBranch(current,currentScope)):current,prefsRef.current.showCompleted).findIndex(t=>t.id===id);
const next=removePreservingChildren(current,record.branch?record.branch.map(t=>t.id):[id]);setTasks(next,record.branch?'Branch deleted':'Note deleted');const action=actionHistory.current.at(-1);
const scopeAt=next.findIndex(t=>t.id===scopeId);const nextVisible=visibleTasks(scopeAt>=0?next.slice(scopeAt+1,endOfBranch(next,scopeAt)):next,prefsRef.current.showCompleted);
if(nextVisible.length)focusTask(nextVisible[Math.min(Math.max(index,0),nextVisible.length-1)].id);else input.current?.focus();
toast(record.branch?'Note and children removed':'Note removed',{description:'Hint: undo outside textboxes. The last five app actions are kept.',duration:2200,
action:{label:'Undo',onClick:()=>undoAction(action)},
className:'app-toast undo-toast'});
};
const scopeIndex=tasks.findIndex(t=>t.id===scopeId);const scope=tasks[scopeIndex];
const scoped=scope?tasks.slice(scopeIndex+1,endOfBranch(tasks,scopeIndex)):tasks;
const exportTasks=scoped.map(t=>({...t,depth:depth(t)-(scope?depth(scope)+1:0)}));
const remaining=scoped.filter(t=>!t.done).length;
const completedCount=scoped.filter(t=>t.done).length;
const visible=visibleTasks(scoped,prefs.showCompleted);
const visibleIds=new Set(visible.map(t=>t.id));
const selectedIds=new Set(selection.ids.filter(id=>visibleIds.has(id)));
const visibleKey=visible.map(t=>t.id).join(',');
useEffect(()=>{const current=selectionRef.current,ids=current.ids.filter(id=>visibleIds.has(id));if(ids.length!==current.ids.length)setSelection({...current,ids,anchor:ids.includes(current.anchor)?current.anchor:ids[0]||null,head:ids.includes(current.head)?current.head:ids.at(-1)||null})},[visibleKey]);
const selectRangeTo=(id,anchor=selectionRef.current.anchor||selectedTask.current||id)=>{const ids=selectionRange(visible,anchor,id);setSelection({anchor,head:id,ids});selectionFocus.current=id;focusTask(id);setNotice(`${ids.length} notes selected. Alt + Up or Down moves the selection; Escape clears it.`)};
const notePointer=e=>{const row=e.target.closest('[data-task-id]');if(!row)return;const id=row.dataset.taskId;if(e.shiftKey){e.preventDefault();e.stopPropagation();selectRangeTo(id)}else if(!e.target.closest('.drag-handle')&&e.target.matches('textarea')){selectionFocus.current=null;clearSelection()}};
const moveSelection=(ids,direction,focusId)=>{if(prefs.viewOnly)return;applyMove(moveBranches(tasksRef.current,ids,direction,prefs.showCompleted),ids,focusId,ids.length>1?'Selected notes moved':'Note moved')};
const breadcrumbs=[];let ancestor=scopeIndex;while(ancestor>=0){breadcrumbs.unshift(tasks[ancestor]);ancestor=parentIndex(tasks,ancestor)}
const openNote=id=>{const index=tasks.findIndex(t=>t.id===id);if(index<0)return;if(tasks[index].done&&!prefs.showCompleted)update('showCompleted',true);const parent=parentIndex(tasks,index);navigate(parent>=0?tasks[parent].id:null,false,true,prefs.viewOnly?null:id);focusTask(id)};
const shareList=async()=>{const base=scope?depth(scope):0;const list=(scope?tasks.slice(scopeIndex,endOfBranch(tasks,scopeIndex)):tasks).map(t=>({text:t.text,done:t.done,depth:depth(t)-base,collapsed:t.collapsed}));const link=location.origin+location.pathname+location.search+'#share='+encodeURIComponent(JSON.stringify(list));try{await navigator.clipboard.writeText(link);toast.success('Snapshot link copied',{description:'Hint: open a sublist to share just that branch.'})}catch{toast.error('Could not copy link',{description:'Hint: allow clipboard access, then try again.'})}};
const hasChildren=task=>{const i=tasks.findIndex(t=>t.id===task.id);return i>=0&&endOfBranch(tasks,i)>i+1};
const openSublist=id=>{const i=tasks.findIndex(t=>t.id===id);if(i<0||!hasChildren(tasks[i]))return;navigate(id);const first=visibleTasks(tasks.slice(i+1,endOfBranch(tasks,i)),prefs.showCompleted)[0];if(first)focusTask(first.id)};
const goBack=()=>{if(!scope)return;const parent=parentIndex(tasks,scopeIndex);navigate(parent>=0?tasks[parent].id:null,false,true,scope.id);focusTask(scope.id)};
// Old or direct leaf routes return to the nearest containing list.
useEffect(()=>{if(!scopeId)return;if(!scope){navigate(null,true,false);return}if(!hasChildren(scope)){const parent=parentIndex(tasks,scopeIndex);navigate(parent>=0?tasks[parent].id:null,true,false);focusTask(scope.id)}},[tasks,scopeId]);

const collapseCurrent=(task,collapsed)=>{
let index=tasks.findIndex(t=>t.id===task.id);
if(!hasChildren(task)){index=parentIndex(tasks,index);if(index<0||index===scopeIndex)return}
const target=tasks[index];setTasks(ts=>ts.map(t=>t.id===target.id&&!!t.collapsed!==collapsed?{...t,collapsed}:t),collapsed?'Branch collapsed':'Branch expanded');focusTask(target.id);
setNotice(collapsed?'Branch collapsed.':'Branch expanded.');
};
const collapseAll=collapsed=>{
const focused=document.activeElement?.closest('[data-task-id]')?.dataset.taskId;
const ids=new Set(scoped.map(t=>t.id));const next=setAllCollapsed(tasks,collapsed).map((t,i)=>ids.has(t.id)&&!!t.collapsed!==!!tasks[i].collapsed?t:tasks[i]);setTasks(next,collapsed?'All branches collapsed':'All branches expanded');
if(focused){let index=tasks.findIndex(t=>t.id===focused);if(collapsed)while(index>=0&&depth(tasks[index])>(scope?depth(scope)+1:0))index=parentIndex(tasks,index);if(index>=0)focusTask(tasks[index].id)}
setNotice(collapsed?'All branches collapsed.':'All branches expanded.');
};
const outlineKey=e=>{
if(e.defaultPrevented||paletteOpen||helpOpen||copyOpen||deleteId||confirmRemove||e.nativeEvent.isComposing)return;
if(!prefs.viewOnly&&e.altKey&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&['ArrowUp','ArrowDown'].includes(e.key)){const id=e.target.closest('[data-task-id]')?.dataset.taskId||selectionRef.current.head;if(id){e.preventDefault();moveSelection(selectedIds.has(id)?[...selectedIds]:[id],e.key==='ArrowUp'?-1:1,id);return}}
if(e.shiftKey&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&['ArrowUp','ArrowDown'].includes(e.key)&&!e.target.matches('textarea,input')){const id=e.target.closest('[data-task-id]')?.dataset.taskId,index=visible.findIndex(t=>t.id===id);if(index>=0){e.preventDefault();const next=visible[Math.max(0,Math.min(visible.length-1,index+(e.key==='ArrowUp'?-1:1)))];selectRangeTo(next.id,selectionRef.current.anchor||id);return}}
if(!prefs.hierarchy||confirmRemove||e.nativeEvent.isComposing)return;
if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){
if(!e.shiftKey){const id=e.target.closest('[data-task-id]')?.dataset.taskId;const task=tasks.find(t=>t.id===id);if(task){e.preventDefault();collapseCurrent(task,e.key==='ArrowLeft')}}
}
};

const focusTask=id=>requestAnimationFrame(()=>{const el=document.getElementById('task-'+id);if(!el)return;el.focus();el.setSelectionRange(el.value.length,el.value.length)});
const modalAnchor=useRef(null);
const anyModalOpen=paletteOpen||helpOpen||copyOpen||!!deleteId||!!confirmRemove;
useEffect(()=>{
if(anyModalOpen){
if(!modalAnchor.current)modalAnchor.current={id:selectedTask.current,index:Math.max(0,visible.findIndex(t=>t.id===selectedTask.current))};
return;
}
const anchor=modalAnchor.current;if(!anchor)return;modalAnchor.current=null;
// Wait for native dialog focus restoration and any palette action to finish first.
const frame=requestAnimationFrame(()=>requestAnimationFrame(()=>{
if(document.querySelector('dialog[open]'))return;
const current=tasksRef.current;
const at=current.findIndex(t=>t.id===routeId());
const available=visibleTasks(at>=0?current.slice(at+1,endOfBranch(current,at)):current,prefsRef.current.showCompleted);
const target=available.find(t=>t.id===selectedTask.current)||available.find(t=>t.id===anchor.id)||available[Math.min(anchor.index,available.length-1)];
if(target)focusTask(target.id);else input.current?.focus();
}));
return ()=>cancelAnimationFrame(frame);
},[anyModalOpen]);

const insert=(id,child)=>{if(prefs.viewOnly)return;const task={id:crypto.randomUUID(),text:'',done:false};const next=insertTask(tasks,id,child,task);if(next===tasks){setNotice('Could not insert note.');return}setTasks(revealTask(next,task.id),child?'Child note added':'Note added');focusTask(task.id)};
const changeLevel=(id,direction)=>{if(prefs.viewOnly)return;const next=indentBranch(tasks,id,direction);if(next===tasks){setNotice(direction>0?'Indent needs a previous sibling.':'Already at the top level.');return}setNotice('');setTasks(revealTask(next,id),'Note nesting changed');focusTask(id)};
const emptyBackspace=useRef(null);
const applyMove=(moved,ids,id,label)=>{
if(moved===tasksRef.current){setNotice('Already at the edge of the list.');return}
const branches=selectedBranches(moved,ids),focusId=id||ids.at(-1),routeAnchor=branches[0]?.task.id||focusId;
let next=moved;for(const branch of branches)next=revealTask(next,branch.task.id);
next=normalizeCompletion(next);setTasks(next,label);
if(scopeId){const at=next.findIndex(t=>t.id===routeAnchor),scopeAt=next.findIndex(t=>t.id===scopeId);if(scopeAt<0||at<=scopeAt||at>=endOfBranch(next,scopeAt)){const parent=parentIndex(next,at);navigate(parent>=0?next[parent].id:null,false,false)}}
selectionFocus.current=focusId;focusTask(focusId);setNotice(ids.length>1?'Selected notes moved with their children.':'Note moved with its children.');
};
const commitDrop=(id,target,ids=[id])=>{if(prefsRef.current.viewOnly||!prefsRef.current.experimental.dragging)return;applyMove(moveBranchesTo(tasksRef.current,ids,target.targetId,target.position),ids,id,ids.length>1?'Selected notes moved':'Note moved')};
const {drag,start:startDrag}=useOutlineDrag({tasksRef,disabled:!prefs.experimental.dragging||prefs.viewOnly||anyModalOpen,scopeId,showCompleted:prefs.showCompleted,getDraggedIds:id=>{if(selectionRef.current.ids.includes(id))return selectionRef.current.ids;clearSelection();return [id]},onMove:commitDrop,onFocus:id=>{selectionFocus.current=id;focusTask(id)}});
const draggedIds=new Set(drag?selectedBranches(tasks,drag.ids).flatMap(b=>tasks.slice(b.index,b.end).map(t=>t.id)):[]);
const isListDrop=id=>drag?.target?.position==='list'&&drag.target.targetId===id;
const dropHint=drag?.target?drag.target.position==='child'?'Release to make this a child note':drag.target.position==='list'?'Release to move into this list':`Release to move ${drag.target.position} this note`:'Drag above, below, or onto a note. Escape cancels.';
const taskKey=(e,task)=>{
if(e.nativeEvent.isComposing)return;
const mod=e.ctrlKey||e.metaKey;
if(!prefs.viewOnly&&!mod&&!e.altKey&&!e.shiftKey&&e.key==='Backspace'&&!task.text.trim()){
e.preventDefault();if(e.repeat)return;
const now=performance.now(),previous=emptyBackspace.current;
if(previous?.id===task.id&&now-previous.time<=800){emptyBackspace.current=null;setNotice('');deleteTask(task.id)}
else{emptyBackspace.current={id:task.id,time:now};setNotice('Press Backspace again to remove this empty note. You can undo.');}
return;
}
emptyBackspace.current=null;
if(e.altKey&&!e.shiftKey&&!mod&&e.key==='Enter'){e.preventDefault();openSublist(task.id);return}
if(!prefs.viewOnly&&!mod&&!e.altKey&&!e.shiftKey&&e.key==='Delete'){e.preventDefault();setDeleteId(task.id);return}
if(!prefs.viewOnly&&e.altKey&&!e.shiftKey&&!mod&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const ids=selectedIds.has(task.id)?[...selectedIds]:[task.id];moveSelection(ids,e.key==='ArrowUp'?-1:1,task.id);return}
const index=visible.findIndex(t=>t.id===task.id);
if(e.shiftKey&&!mod&&!e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const next=visible[Math.max(0,Math.min(visible.length-1,index+(e.key==='ArrowUp'?-1:1)))];if(next)selectRangeTo(next.id,selectionRef.current.anchor||task.id);return}
if(e.key==='Escape'){e.preventDefault();if(selectionRef.current.ids.length){clearSelection();setNotice('Selection cleared.');return}e.target.blur();input.current?.focus();return}
if(!prefs.viewOnly&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(prefs.hierarchy)insert(task.id,e.ctrlKey||e.metaKey);else e.target.blur();return}
if(!prefs.hierarchy)return;
if(!prefs.viewOnly&&e.key==='Tab'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();changeLevel(task.id,e.shiftKey?-1:1);return}
if(['ArrowUp','ArrowDown'].includes(e.key)&&!mod&&!e.shiftKey&&!e.altKey&&atTextEdge(e.target,e.key)){const next=visible[index+(e.key==='ArrowUp'?-1:1)];e.preventDefault();if(next)focusTask(next.id);else input.current?.focus()}
if(!prefs.viewOnly&&mod&&!e.altKey&&!e.shiftKey&&e.key===' '){e.preventDefault();setTasks(ts=>toggleCompletion(ts,task.id),'Completion changed')}
};
const currentTask=visible.find(t=>t.id===selectedTask.current);
const commands=[
{id:'view',group:'Interface',label:prefs.viewOnly?'Edit list':'View only',run:()=>update('viewOnly',!prefs.viewOnly)},
{id:'show-completed',group:'Interface',label:prefs.showCompleted?'Hide completed notes':'Show completed notes',keywords:'show hide completed finished tasks toggle visibility',shortcut:'Alt + Shift + H',run:()=>update('showCompleted',!prefs.showCompleted)},
{id:'move-selection-up',group:'Selection',label:'Move selected notes up',shortcut:'Alt + ↑',disabled:prefs.viewOnly||!selectedIds.size,run:()=>moveSelection([...selectedIds],-1,selection.head)},
{id:'move-selection-down',group:'Selection',label:'Move selected notes down',shortcut:'Alt + ↓',disabled:prefs.viewOnly||!selectedIds.size,run:()=>moveSelection([...selectedIds],1,selection.head)},
{id:'clear-selection',group:'Selection',label:'Clear note selection',shortcut:'Escape',disabled:!selectedIds.size,run:clearSelection},
{id:'share',group:'Tasks',label:'Share snapshot link',run:shareList},
{id:'new',group:'Tasks',label:'Focus new task input',keywords:'add create paste list',run:()=>input.current?.focus()},
{id:'open-sublist',group:'Navigation',label:'Open selected note’s sublist',shortcut:'Alt + Enter',disabled:!currentTask||!hasChildren(currentTask),run:()=>openSublist(currentTask.id)},
{id:'back',group:'Navigation',label:'Back to containing list',shortcut:'Alt + Backspace',disabled:!scope,run:goBack},
{id:'first',group:'Tasks',label:'Focus first visible task',disabled:!visible.length,run:()=>focusTask(visible[0].id)},
{id:'copy',group:'Tasks',label:'Copy current list as Markdown',disabled:!tasks.length,run:copyMarkdown},
{id:'undo',group:'Interface',label:'Undo latest app action',shortcut:'Ctrl/⌘ + Z',keywords:'reverse last five actions history',run:()=>undoAction()},
{id:'clear',group:'Tasks',label:'Clear completed tasks…',shortcut:'Alt + Shift + C',disabled:!tasks.some(t=>t.done),run:()=>requestBulkDelete('completed')},
{id:'remove',group:'Tasks',label:'Remove all tasks…',shortcut:'Alt + Shift + D',disabled:!tasks.length,run:()=>requestBulkDelete('all')},
{id:'delete-note',group:'Current task',label:'Delete selected note…',keywords:'remove task',shortcut:'Delete',disabled:!currentTask,run:()=>setDeleteId(currentTask.id)},
{id:'collapse',group:'Hierarchy',label:'Collapse all branches',shortcut:'Alt + Shift + ←',disabled:!prefs.hierarchy,run:()=>collapseAll(true)},
{id:'expand',group:'Hierarchy',label:'Expand all branches',shortcut:'Alt + Shift + →',disabled:!prefs.hierarchy,run:()=>collapseAll(false)},
{id:'child',group:'Current task',label:'Add child to selected task',disabled:!prefs.hierarchy||!currentTask,run:()=>insert(currentTask.id,true)},
{id:'indent',group:'Current task',label:'Indent selected task',disabled:!prefs.hierarchy||!currentTask||indentBranch(tasks,currentTask.id,1)===tasks,run:()=>changeLevel(currentTask.id,1)},
{id:'outdent',group:'Current task',label:'Outdent selected task',disabled:!prefs.hierarchy||!currentTask||!depth(currentTask),run:()=>changeLevel(currentTask.id,-1)},
{id:'fold',group:'Current task',label:'Collapse selected branch',disabled:!prefs.hierarchy||!currentTask,run:()=>collapseCurrent(currentTask,true)},
{id:'unfold',group:'Current task',label:'Expand selected branch',disabled:!prefs.hierarchy||!currentTask,run:()=>collapseCurrent(currentTask,false)},
{id:'complete',group:'Current task',label:'Toggle selected task completion',shortcut:'Ctrl/⌘ + Space',disabled:!currentTask,run:()=>setTasks(ts=>toggleCompletion(ts,currentTask.id),'Completion changed')},
...['Excalifont','Space Mono','Poppins'].map(font=>({id:'font-'+font,group:'Fonts',keywords:'select selection choose typography',label:'Font: '+font,selected:prefs.font===font,run:()=>update('font',font)})),
...['small','medium','large'].map(size=>({id:'size-'+size,group:'Font size',keywords:'select selection choose text',label:'Font size: '+size,selected:prefs.size===size,run:()=>update('size',size)})),
...[{id:'system',label:'System'},...THEMES].map(t=>({id:'theme-'+t.id,group:'Themes',keywords:'select selection choose color appearance',label:'Theme: '+t.label,selected:prefs.theme===t.id,run:()=>update('theme',t.id)})),
{id:'feedback',group:'Interface',label:'Send feedback · opens a new tab',keywords:'bug report suggestion roadmap feature request',run:()=>window.open('https://gottodo.quackback.io/','_blank','noopener,noreferrer')},
{id:'help',group:'Interface',label:'Open keyboard shortcuts',keywords:'help information guide modal',shortcut:'Ctrl/⌘ + /',run:()=>setHelpOpen(true)},
{id:'bar',group:'Interface',label:prefs.hidden?'Show settings bar':'Hide settings bar',run:()=>update('hidden',!prefs.hidden)}
].map(c=>({...c,disabled:c.disabled||(prefs.viewOnly&&['clear','remove','delete-note','child','indent','outdent','complete'].includes(c.id))})).concat(tasks.map(t=>({id:'note-'+t.id,group:'Notes',label:t.text||'Untitled note',keywords:'find note',run:()=>openNote(t.id)})));
shortcutCommands.current={'shift+h':commands.find(c=>c.id==='show-completed'),'shift+c':commands.find(c=>c.id==='clear'),'shift+d':commands.find(c=>c.id==='remove'),'shift+arrowleft':commands.find(c=>c.id==='collapse'),'shift+arrowright':commands.find(c=>c.id==='expand'),enter:{run:()=>openSublist(selectedTask.current)},backspace:commands.find(c=>c.id==='back')};
return <MotionConfig reducedMotion="user" transition={{duration:.16,ease:'easeOut'}}><div className={"app"+(prefs.viewOnly?" view-only":"")+(drag?" is-dragging":"")} onPointerDownCapture={notePointer} onClickCapture={e=>{if(e.shiftKey&&e.target.closest('[data-task-id]')){e.preventDefault();e.stopPropagation()}}} onKeyDown={e=>{if(e.key==='Escape'&&selectionRef.current.ids.length&&!e.target.matches('textarea,input')){e.preventDefault();clearSelection();return}outlineKey(e)}} onFocusCapture={e=>{const id=e.target.closest('[data-task-id]')?.dataset.taskId;if(id)selectedTask.current=id}} style={{'--list-font':`"${prefs.font}"`,'--list-size':{small:'18px',medium:'22px',large:'28px'}[prefs.size]}}>
{!prefs.hidden&&<header ref={headerRef} className="toolbar"><div className="bar">
<a className="brand" href={sharedSnapshot?'#/shared':'#/'} onClick={e=>{e.preventDefault();navigate(null)}} aria-label="Gottado home"><span className="brand-icon"><Icon name="check"/></span><span>gottado</span></a>
<div className="settings"><div className="header-preferences"><SelectBox label="Font" value={prefs.font} onChange={v=>update('font',v)} preview options={['Excalifont','Space Mono','Poppins'].map(v=>({value:v,label:v}))}/><span className="divider"/><SelectBox label="Size" value={prefs.size} onChange={v=>update('size',v)} options={[{value:'small',label:'Small'},{value:'medium',label:'Medium'},{value:'large',label:'Large'}]}/><span className="divider"/><SelectBox label="Theme" onPreview={setPreviewTheme} value={prefs.theme} onChange={v=>update('theme',v)} options={[{value:'system',label:'System'},...THEMES.map(t=>({value:t.id,label:t.label}))]}/><span className="divider"/><ExperimentalFeatures enabled={prefs.experimental} onChange={(id,value)=>setPrefs(p=>({...p,experimental:{...p.experimental,[id]:value}}),'Experimental features changed')}/></div><div className="toolbar-actions"><ToolButton className="icon-button" aria-label={prefs.viewOnly?'Edit list':'View only'} aria-pressed={prefs.viewOnly} tip={prefs.viewOnly?'Edit list':'View only'} icon={prefs.viewOnly?'edit':'eye'} onClick={()=>update('viewOnly',!prefs.viewOnly)}/><ToolButton className="icon-button" aria-label="Search notes and actions" tip="Find notes & actions" shortcut="Ctrl/⌘ + Shift + P" icon="search" onClick={()=>setPaletteOpen(true)}/><ToolButton ref={copyButton} className="icon-button" aria-label="Copy Markdown" tip={copied?'Copied':'Copy Markdown'} icon={copied?'check':'copy'} disabled={!tasks.length} onClick={copyMarkdown}/><a className="icon-button" href="https://gottodo.quackback.io/" target="_blank" rel="noopener noreferrer" aria-label="Send feedback (opens a new tab)" title="Send feedback (opens a new tab)"><Icon name="feedback"/></a><ToolButton ref={helpButton} className="icon-button" aria-label="Keyboard shortcuts" tip="Keyboard shortcuts" shortcut="Ctrl/⌘ + /" icon="info" onClick={()=>setHelpOpen(true)}/><ToolButton className="icon-button" aria-label="Hide settings bar" tip="Hide settings bar" icon="hide" onClick={()=>update('hidden',true)}/></div></div>
</div></header>}
{prefs.hidden&&<ToolButton className="show-bar icon-button" aria-label="Show settings bar" tip="Show settings bar" icon="show" onClick={()=>update('hidden',false)}/>}
<main>{sharedSnapshot&&<p className="snapshot-notice">Shared snapshot · your saved list is kept separately. Edits to this snapshot stay in this tab’s session.</p>}<nav ref={breadcrumbRef} className="breadcrumbs" aria-label="List breadcrumbs"><button data-drop-parent="" className={isListDrop(null)?"drop-list-active":undefined} onClick={()=>navigate(null)}>Home</button>{breadcrumbs.map(t=><React.Fragment key={t.id}><span>/</span><button data-drop-parent={t.id} className={isListDrop(t.id)?"drop-list-active":undefined} aria-current={t.id===scopeId?'page':undefined} onClick={()=>navigate(t.id)}>{t.text||'Untitled note'}</button></React.Fragment>)}</nav>{scope&&<ToolButton className="back-button" tip="Back" shortcut="Alt + Backspace" onClick={goBack}>← Back</ToolButton>}<div className="heading"><div className="title-row"><h1>{scope?scope.text:'Gotta do.'}</h1><ToolButton className="share-button icon-button" icon="share" aria-label={scope?'Share sublist':'Share list'} tip={scope?'Share sublist':'Share list'} disabled={!tasks.length} onClick={shareList}/></div><span className="count">{tasks.length? `${remaining} left`:'Fight procrastination by listing your troubles away.'}</span></div>
<div className="list-visibility"><span className="count" role="status">{completedCount} completed{!prefs.showCompleted?' (hidden)':''}</span><label className="completed-toggle"><span>Show completed</span><button type="button" role="switch" aria-label="Show completed notes" aria-checked={prefs.showCompleted} title="Show completed notes · Alt + Shift + H" className="experimental-toggle" onClick={()=>update('showCompleted',!prefs.showCompleted)}><span/></button></label></div>
{!prefs.viewOnly&&<form onSubmit={add} className="add-form"><span className="add-symbol"><Icon name="plus"/></span><TaskText inputRef={input} onFocus={clearSelection} aria-label="New task" onPaste={paste} placeholder="What needs doing?" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Enter'&&!e.shiftKey){add(e);return}if(['ArrowUp','ArrowDown'].includes(e.key)&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&atTextEdge(e.target,e.key)&&visible.length){e.preventDefault();focusTask(e.key==='ArrowDown'?visible[0].id:visible.at(-1).id)}}} maxLength={500}/><button type="submit" className="add-button" disabled={!draft.trim()} aria-label="Add task">Add <span>↵</span></button></form>}
<p className="sr-only" role="status">{notice}</p>
{selectedIds.size>0&&<div className="selection-toolbar" role="toolbar" aria-label="Selected notes"><span role="status">{selectedIds.size} {selectedIds.size===1?'note':'notes'} selected</span><button disabled={prefs.viewOnly} title="Move selection up · Alt + ↑" aria-label="Move selected notes up" onClick={()=>moveSelection([...selectedIds],-1,selection.head)}>↑ Move</button><button disabled={prefs.viewOnly} title="Move selection down · Alt + ↓" aria-label="Move selected notes down" onClick={()=>moveSelection([...selectedIds],1,selection.head)}>↓ Move</button><button onClick={clearSelection} title="Clear selection · Escape">Clear</button></div>}
<ul key={scopeId||'home'} className="task-list"><AnimatePresence initial={false}>{visible.map(task=><motion.li layout={!drag} data-task-id={task.id} key={task.id} initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-12,height:0,margin:0}} style={{marginLeft:Math.min(12,depth(task)-(scope?depth(scope)+1:0))*28}} className={'task'+(selectedIds.has(task.id)?' selected-note':'')+(task.done?' done':'')+(draggedIds.has(task.id)?' dragging-note':'')+(drag?.target?.markerId===task.id?' drop-'+drag.target.position:'')}>{prefs.experimental.dragging&&!prefs.viewOnly&&<button className="drag-handle" aria-label={`Drag note: ${task.text||'Untitled note'}`} title="Drag to move; Alt + ↑ / ↓ also moves" onPointerDown={e=>startDrag(e,task.id)} onKeyDown={e=>{if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key))taskKey(e,task)}}><svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor">{[5,10,15].map(y=><React.Fragment key={y}><circle cx="5" cy={y} r="1.4"/><circle cx="11" cy={y} r="1.4"/></React.Fragment>)}</svg></button>}{prefs.hierarchy&&(hasChildren(task)?<ToolButton className="branch-toggle" aria-expanded={!task.collapsed} aria-label={`${task.collapsed?'Expand':'Collapse'}: ${task.text}`} tip={task.collapsed?'Expand branch':'Collapse branch'} shortcut={task.collapsed?'Alt + →':'Alt + ←'} onClick={()=>collapseCurrent(task,!task.collapsed)}><svg width="12" height="12" viewBox="0 0 16 16" style={{transform:task.collapsed?'rotate(-90deg)':'rotate(0deg)'}}><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></ToolButton>:<span className="branch-spacer"/>)}{!prefs.viewOnly&&<button className="checkbox" aria-label={`${task.done?'Mark incomplete':'Complete'}: ${task.text}`} aria-pressed={task.done} onClick={()=>setTasks(ts=>toggleCompletion(ts,task.id),'Completion changed')}>{task.done&&<motion.span initial={{scale:.5}} animate={{scale:1}}><Icon name="check"/></motion.span>}</button>}<TaskText id={"task-"+task.id} font={prefs.font} size={prefs.size} readOnly={prefs.viewOnly} className={'task-text'+(flashId===task.id?' copy-flash':'')} aria-label={prefs.hierarchy? `Edit task, level ${depth(task)+1}`:"Edit task"} value={task.text} placeholder="Untitled note" aria-describedby={selectedIds.has(task.id)?'selection-help':undefined} onFocus={e=>{if(selectionFocus.current!==task.id)clearSelection();selectionFocus.current=null;emptyBackspace.current=null;const el=e.currentTarget;el.setSelectionRange(el.value.length,el.value.length)}} onChange={e=>{clearSelection();emptyBackspace.current=null;setTasks(ts=>ts.map(t=>t.id===task.id?{...t,text:e.target.value}:t),'',false)}} onBlur={()=>{emptyBackspace.current=null}} onCopy={e=>{if(e.target.selectionStart!==e.target.selectionEnd)return;e.preventDefault();const grouped=selectedIds.has(task.id)&&selectedIds.size>1;const content=grouped?toMarkdown(selectedBranches(tasks,[...selectedIds]).flatMap(b=>tasks.slice(b.index,b.end).map(t=>({...t,depth:depth(t)-depth(b.task)})))):task.text;e.clipboardData.setData('text/plain',content);setFlashId(task.id);setTimeout(()=>setFlashId(null),600);toast.success(grouped?'Selected notes copied':'Note copied',{description:'Hint: use Copy Markdown for the whole list.'})}} onKeyDown={e=>taskKey(e,task)} maxLength={500}/>{prefs.hierarchy&&task.collapsed&&hasChildren(task)&&<button className="hidden-count" data-tooltip="Expand branch" onClick={()=>collapseCurrent(task,false)}>{endOfBranch(tasks,tasks.findIndex(t=>t.id===task.id))-tasks.findIndex(t=>t.id===task.id)-1} hidden</button>}<div className="row-tools">{hasChildren(task)&&<ToolButton tip="Open sublist" shortcut="Alt + Enter" aria-label={`Open sublist: ${task.text}`} icon="sublist" onClick={()=>openSublist(task.id)}/>}{!prefs.viewOnly&&prefs.hierarchy&&<div className="outline-actions"><ToolButton icon="outdent" tip="Outdent task" shortcut="Shift + Tab" aria-label="Outdent task" disabled={depth(task)===0} onClick={()=>changeLevel(task.id,-1)}/><ToolButton icon="indent" tip="Indent task" shortcut="Tab" aria-label="Indent task" disabled={indentBranch(tasks,task.id,1)===tasks} onClick={()=>changeLevel(task.id,1)}/></div>}{!prefs.viewOnly&&<ToolButton className="delete" icon="trash" tip="Delete note" shortcut="Delete" aria-label={`Delete note: ${task.text}`} onClick={()=>setDeleteId(task.id)}/>}</div>{!prefs.viewOnly&&<InsertBetween task={task} onInsert={insert}/>}</motion.li>)}</AnimatePresence></ul>
{drag&&<div className={'list-drop-zone'+(isListDrop(scopeId)?' drop-list-active':'')} data-drop-parent={scopeId||''}>Move to this list</div>}
{drag&&<p className="drag-hint" role="status">{dropHint}</p>}
{scoped.length===0&&<motion.div className="empty" initial={{opacity:0}} animate={{opacity:1}}><div className="empty-check"><Icon name="check" width="24" height="24"/></div><p>Nothing on your list. Yet.</p></motion.div>}
{scoped.length>0&&visible.length===0&&<div className="empty"><p>All notes are completed.</p><button className="action-button" onClick={()=>update('showCompleted',true)}>Show completed ({completedCount})</button></div>}
<p id="selection-help" className="sr-only">Selected note. Shift and Up or Down extends the selection. Alt and Up or Down moves selected notes. Escape clears selection.</p>
</main>
<dialog ref={deleteDialog} className="confirm-dialog" onCancel={()=>setDeleteId(null)} onClick={e=>{if(outsideDialog(e))setDeleteId(null)}} onClose={()=>setDeleteId(null)} aria-labelledby="delete-note-title"><h2 id="delete-note-title">Delete this note?</h2><p>Undo with Ctrl/⌘ + Z outside textboxes, within your last five app actions.</p>{tasks.some(t=>t.id===deleteId&&hasChildren(t))&&<label className="delete-children-option"><input type="checkbox" checked={deleteChildren} onChange={e=>setDeleteChildren(e.target.checked)}/>Delete all children too</label>}<div className="modal-actions"><button onClick={()=>setDeleteId(null)}>Cancel</button><button ref={deleteConfirm} className="confirm-remove" onClick={()=>{deleteTask(deleteId,deleteChildren);setDeleteId(null)}}>Delete note</button></div></dialog>
<dialog ref={dialog} className="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-description" onCancel={()=>setConfirmRemove(false)} onClose={()=>setConfirmRemove(false)} onClick={e=>{if(outsideDialog(e))setConfirmRemove(false)}}>
{confirmRemove&&<><h2 id="confirm-title">{confirmRemove==='completed'?'Clear completed tasks?':'Remove all tasks?'}</h2><p id="confirm-description">{confirmRemove==='completed'?`${tasks.filter(t=>t.done).length} completed tasks will be removed. Their unfinished children will be kept.`:`All ${tasks.length} tasks will be removed from this browser.`} You can undo this within your last five app actions.</p><div className="modal-actions"><button onClick={()=>setConfirmRemove(false)}>Cancel</button><button ref={bulkConfirm} className="confirm-remove" onClick={()=>{if(prefs.viewOnly)return;if(confirmRemove==='completed')setTasks(ts=>removePreservingChildren(ts,ts.filter(t=>t.done).map(t=>t.id)),'Completed notes cleared');else{toast.dismiss();setTasks([],'All notes removed')}setConfirmRemove(false)}}>{confirmRemove==='completed'?'Clear completed':'Remove all tasks'}</button></div></>}

</dialog>
<dialog ref={helpDialog} className="help-dialog confirm-dialog" aria-labelledby="help-title" onCancel={()=>setHelpOpen(false)} onClose={()=>setHelpOpen(false)} onClick={e=>{if(outsideDialog(e))setHelpOpen(false)}}>
<div className="help-header"><div><span className="help-eyebrow">GOTTADO GUIDE</span><h2 id="help-title">Keyboard shortcuts</h2></div><button autoFocus className="action-button" onClick={()=>setHelpOpen(false)}>Close</button></div>
<p className="help-intro">Use Ctrl on Windows/Linux or ⌘ on Mac. Note shortcuts work while editing a note. List shortcuts work anywhere outside a dialog. Lists can be nested to any depth.</p>
<div className="shortcut-grid">
<ShortcutGroup title="Commands & help" rows={[
['Open command palette',['Ctrl / ⌘','Shift','P']],
['Open keyboard shortcuts',['Ctrl / ⌘','/']],
['Navigate palette results',['↑ / ↓']],
['Run the selected action',['Enter']],
['Close palette or help',['Esc']],
]}/>
<ShortcutGroup title="Write & navigate" rows={[
['Add task from the input',['Enter']],
['Next sibling',['Enter']],
['Add a line within a task',['Shift','Enter']],
['Previous / next task at visual text edges',['↑ / ↓']],
['Open focused note’s sublist',['Alt','Enter']],
['Back to containing list',['Alt','Backspace']],
['Move note or selected notes through sublists',['Alt','↑ / ↓']],
['Toggle completion',['Ctrl / ⌘','Space']],
['Finish editing / leave the list',['Esc']],
]} note="Checking a parent checks every descendant; unchecking it unchecks them all. Parents complete when all children are complete. Unchecking a child unchecks its ancestors. Alt + Enter opens a sublist; Alt + Backspace returns. Sublist navigation works in view-only mode."/>
<ShortcutGroup title="Select & move notes" rows={[
['Extend note selection',['Shift','↑ / ↓']],
['Select a range with the mouse',['Shift','Click']],
['Move selected notes together',['Alt','↑ / ↓']],
['Clear note selection',['Esc']],
]} note="Shift + Up/Down selects notes rather than text lines. Shift + Click extends from the focused note or selection anchor. Shift + Left/Right and mouse text selection still select text. Selected parents carry their descendants once; selected branches become siblings at the destination. Use the selection toolbar or enable experimental dragging to move them together. A group move is one undo action. Ctrl/⌘ + C copies selected branches when no text is selected. View-only permits selection and copy, but blocks movement."/>
<ShortcutGroup title="Organize the hierarchy" rows={[
['Add a child',['Ctrl / ⌘','Enter']],
['Indent under the previous sibling',['Tab']],
['Outdent one level',['Shift','Tab']],
] } note="Nesting is always available. Use the between-note plus for new notes or children, and the indent or outdent icons for nesting. Enable Dragging notes in the header’s Experimental dropdown, then drag a handle above, below, or onto a note to move it with its children. Escape cancels a drag. Tab changes indentation while editing; Esc leaves the list."/>
<ShortcutGroup title="Collapse & expand" rows={[
['Collapse current branch',['Alt','←']],
['Expand current branch',['Alt','→']],
['Collapse all branches',['Alt','Shift','←']],
['Expand all branches',['Alt','Shift','→']],
['Show / hide completed notes',['Alt','Shift','H']],
]} note="Use the chevron beside a parent to toggle it. Hidden children stay saved; navigation skips them. Show completed is a saved visibility switch, on by default. Completed counts include folded descendants whether shown or hidden. Hiding notes does not delete them; keyboard movement skips hidden completed branches."/>
<ShortcutGroup title="Delete & undo" rows={[
['Open note deletion confirmation',['Delete']],
['Delete an empty note (press twice)',['Backspace','Backspace']],
['Clear completed tasks',['Alt','Shift','C']],
['Remove all tasks',['Alt','Shift','D']],
['Confirm deletion',['Enter']],
['Undo latest app action (outside textboxes)',['Ctrl / ⌘','Z']],
]} note="Click a note’s trash icon, press Delete while a note is focused, or find “Delete selected note” in Find notes and actions, then Enter to confirm. Clear completed and Remove all also ask for confirmation. Outside textboxes, Ctrl/⌘ + Z reverses the last five app actions, newest first, including completion, insertion, moving, deletion, folding, navigation, and settings. Inside textboxes it always uses native text undo. Find notes and actions also offers Undo latest app action. Older actions are discarded, and empty history shows a message. Parent deletion keeps children by default. Check “Delete all children too” to delete the whole branch. Undo restores the deleted note or whole branch without discarding later text edits to surviving notes."/>
<ShortcutGroup title="Settings menus" rows={[
['Move between options',['↑ / ↓']],
['First / last option',['Home / End']],
['Select the highlighted option',['Enter / Space']],
['Jump to an option by name',['Type letters']],
['Close the menu',['Esc']],
['Move to the next control',['Tab']],
]}/>
<ShortcutGroup title="Clipboard" rows={[
['Paste a list into the new-task input',['Ctrl / ⌘','V']],
['Copy focused note or selected text',['Ctrl / ⌘','C']],
['Copy selected Markdown in the fallback dialog',['Ctrl / ⌘','C']],
]} note="Use Copy Markdown in the top bar to copy the entire current list, including folded and hidden completed notes. Sublist copies begin with their title; Home copies have no title. Single-line paste stays in the input; multiline lists become tasks immediately."/>
</div>
<div className="help-footer"><section><h3>Paste a list</h3><p>Paste two or more lines into “What needs doing?” to add tasks immediately. Bullets, numbering, checkboxes, and indentation are recognized. Table columns stay together per row.</p></section><section><h3>Copy & settings</h3><p>Copy Markdown includes every task, including collapsed and hidden completed children, and indentation as plain bullets without checkbox markers. Sublist titles are included; Home has no title. Use arrow keys in settings menus, Enter to select, and Esc to close.</p></section></div>
</dialog>
<dialog ref={copyDialog} className="confirm-dialog copy-dialog" aria-labelledby="copy-title" onCancel={()=>setCopyOpen(false)} onClose={()=>setCopyOpen(false)} onClick={e=>{if(outsideDialog(e))setCopyOpen(false)}}>
<h2 id="copy-title">Copy your Markdown</h2><p>Your browser could not copy automatically. Select this text and use Ctrl/⌘ + C.</p><textarea aria-label="Markdown list" readOnly value={toMarkdown(exportTasks,true,scope?scope.text:null)} onFocus={e=>e.target.select()}/><button autoFocus className="action-button" onClick={()=>setCopyOpen(false)}>Done</button>
</dialog><CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} commands={commands} onPreviewTheme={setPreviewTheme}/><Toaster theme={dark?'dark':'light'} position="bottom-right" duration={1800} visibleToasts={6} closeButton toastOptions={{className:'app-toast'}}/></div></MotionConfig>}
createRoot(document.getElementById('root')).render(<App/>);
