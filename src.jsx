import React, {useState, useEffect, useRef, useId} from 'react';
import {createPortal} from 'react-dom';
import {THEMES,resolveTheme} from './themes.js';
import {CommandPalette} from './command-palette.jsx';
import {createRoot} from 'react-dom/client';
import {motion, AnimatePresence, MotionConfig} from 'framer-motion';
import './style.css';
import {Toaster,toast} from 'sonner';
import {toMarkdown} from './markdown.js';
import {parsePaste} from './paste.js';
import {deletionRecord,restoreDeleted} from './undo.js';
import {depth,indentBranch,removePreservingChildren,insertTask,endOfBranch,visibleTasks,parentIndex,revealTask,setAllCollapsed,moveBranch} from './outline.js';

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
function Icon({name,...props}){const paths={eye:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,edit:<><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z"/><path d="m13 6 5 5"/></>,sublist:<><path d="M14 4h6v16h-6"/><path d="M3 12h12m-5-5 5 5-5 5"/></>,share:<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/></>,search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,command:<><rect x='4' y='4' width='16' height='16' rx='4'/><path d='m8 9 3 3-3 3m5 0h3'/></>,info:<><circle cx='12' cy='12' r='9'/><path d='M12 11v6m0-10v1'/></>,copy:<><rect x='8' y='8' width='12' height='12' rx='2'/><path d='M16 8V4H4v12h4'/></>,trash:<><path d='M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7'/></>,indent:<><path d='M10 5h11M10 12h11M10 19h11M2 9l3 3-3 3'/></>,outdent:<><path d='M10 5h11M10 12h11M10 19h11M5 9l-3 3 3 3'/></>,child:<><path d='M5 4v9h9m0-4v8m-4-4h8'/></>,sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,moon:<path d="M20.5 13.2A8.6 8.6 0 0 1 10.8 3.5a8.7 8.7 0 1 0 9.7 9.7Z"/>,hide:<><path d="M3 8h18M8 14l4-4 4 4"/></>,show:<><path d="M3 8h18M8 12l4 4 4-4"/></>,plus:<path d="M12 5v14M5 12h14"/>,cross:<path d="m6 6 12 12M18 6 6 18"/>,check:<path d="m5 12 4 4L19 6"/>};return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name]}</svg>}
function ToolButton({tip,shortcut,icon,children,ref:forwardedRef,...props}){
const local=useRef(null);const timer=useRef(null);const [position,setPosition]=useState(null);const id=useId();
useEffect(()=>()=>clearTimeout(timer.current),[]);
const show=()=>{const r=local.current?.getBoundingClientRect();if(document.activeElement===local.current)return;if(r)setPosition({left:Math.min(innerWidth-120,Math.max(120,r.left+r.width/2)),top:r.bottom+8})};
return <><button {...props} ref={el=>{local.current=el;if(typeof forwardedRef==='function')forwardedRef(el);else if(forwardedRef)forwardedRef.current=el}} aria-describedby={position?id:undefined} onMouseEnter={()=>{timer.current=setTimeout(show,450)}} onMouseLeave={()=>{clearTimeout(timer.current);setPosition(null)}} onFocus={()=>{}} onBlur={()=>{clearTimeout(timer.current);setPosition(null)}}>{icon?<Icon name={icon}/>:children}</button>{position&&createPortal(<div className="styled-tooltip" role="tooltip" id={id} style={position}><span>{tip}</span>{shortcut&&<kbd>{shortcut}</kbd>}</div>,document.body)}</>;
}
function SelectBox({label,value,options,onChange,preview=false}){
const [open,setOpen]=useState(false);const [active,setActive]=useState(0);
const root=useRef(null);const trigger=useRef(null);const id=useId();const search=useRef({text:'',time:0});
const current=options.findIndex(o=>o.value===value);
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
return <section className="shortcut-group"><h3>{title}</h3><dl>{rows.map(([label,keys])=><div className="shortcut-row" key={label}><dt>{label}</dt><dd>{keys.map((key,index)=><React.Fragment key={key}>{index>0&&<span className="key-plus">+</span>}<kbd>{key}</kbd></React.Fragment>)}</dd></div>)}</dl>{note&&<p className="shortcut-note">{note}</p>}</section>
}
function App(){
const [sharedSnapshot]=useState(()=>location.hash.startsWith('#share=')||location.hash.startsWith('#/shared'));
const [tasks,setTasks]=useState(()=>{
if(location.hash.startsWith('#/shared')){try{return JSON.parse(sessionStorage.getItem('just-todo-shared-snapshot'))||[]}catch{return []}}
if(location.hash.startsWith('#share=')){try{const payload=JSON.parse(decodeURIComponent(location.hash.slice(7)));if(!Array.isArray(payload)||payload.length>10000)throw Error();let previous=-1;const imported=payload.map(t=>{if(typeof t.text!=='string'||!Number.isInteger(t.depth)||t.depth<0||t.depth>previous+1)throw Error();previous=t.depth;return {id:crypto.randomUUID(),text:t.text.slice(0,500),depth:t.depth,done:!!t.done,collapsed:!!t.collapsed}});try{sessionStorage.setItem('just-todo-shared-snapshot',JSON.stringify(imported))}catch{}history.replaceState(null,'',location.pathname+location.search+'#/shared');return imported}catch{history.replaceState(null,'',location.pathname+location.search+'#/')}}
return read('just-todo-tasks',[])});
const tasksRef=useRef(tasks);tasksRef.current=tasks;
const prefsRef=useRef(null);const deletedRecords=useRef([]);
const [prefs,setPrefs]=useState(()=>{const {alignment,readingWidth,...saved}=read('just-todo-prefs',{});return {font:'Excalifont',size:'medium',hidden:false,viewOnly:false,...saved,theme:saved.theme||'dark',hierarchy:true,...(sharedSnapshot?{viewOnly:true}: {})}});
prefsRef.current=prefs;
const [systemDark,setSystemDark]=useState(()=>matchMedia('(prefers-color-scheme: dark)').matches);
const [confirmRemove,setConfirmRemove]=useState(false);

const [paletteOpen,setPaletteOpen]=useState(false);const selectedTask=useRef(null);
const [helpOpen,setHelpOpen]=useState(false);const helpDialog=useRef(null);const helpButton=useRef(null);
useEffect(()=>{if(helpOpen)helpDialog.current?.showModal();else helpDialog.current?.close()},[helpOpen]);
const [copyOpen,setCopyOpen]=useState(false);const copyDialog=useRef(null);const copyButton=useRef(null);
const [copied,setCopied]=useState(false);
useEffect(()=>{if(copyOpen)copyDialog.current?.showModal();else copyDialog.current?.close()},[copyOpen]);
const undoRecord=record=>{
if(prefsRef.current.viewOnly)return;
if(!deletedRecords.current.includes(record))return;
deletedRecords.current=deletedRecords.current.filter(r=>r!==record);
setTasks(ts=>revealTask(restoreDeleted(ts,record,!!prefsRef.current.hierarchy),record.task.id));
toast.dismiss(record.toastId);focusTask(record.task.id);
};
const copyMarkdown=async()=>{
const markdown=toMarkdown(exportTasks,true);
try{await navigator.clipboard.writeText(markdown);setCopied(true);setTimeout(()=>setCopied(false),1800);toast.success('Markdown copied',{description:'Hint: Ctrl/⌘ + C copies the focused note.'})}
catch{setCopyOpen(true)}
};
const [notice,setNotice]=useState('');
const dialog=useRef(null);const bulkConfirm=useRef(null);const bulkPrevious=useRef(null);const shortcutCommands=useRef({});
const requestBulkDelete=mode=>{if(prefs.viewOnly)return;bulkPrevious.current=document.activeElement;setConfirmRemove(mode)};
useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)');const change=e=>setSystemDark(e.matches);media.addEventListener('change',change);return ()=>media.removeEventListener('change',change)},[]);
const activeTheme=resolveTheme(prefs.theme,systemDark);const dark=activeTheme.dark;
useEffect(()=>{if(confirmRemove){dialog.current?.showModal();bulkConfirm.current?.focus()}else dialog.current?.close()},[confirmRemove]);
useEffect(()=>{const key=e=>{if(e.defaultPrevented||e.isComposing||!e.altKey||e.ctrlKey||e.metaKey||document.querySelector('dialog[open]'))return;const command=shortcutCommands.current[(e.shiftKey?'shift+':'')+e.key.toLowerCase()];if(!command||command.disabled)return;e.preventDefault();command.run()};window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key)},[]);
const [deleteId,setDeleteId]=useState(null);const deleteDialog=useRef(null);const deleteConfirm=useRef(null);
const [flashId,setFlashId]=useState(null);
const routeId=()=>{try{return location.hash.startsWith('#/shared/list/')?decodeURIComponent(location.hash.slice(14)):location.hash.startsWith('#/list/')?decodeURIComponent(location.hash.slice(7)):null}catch{return null}};
const [scopeId,setScopeId]=useState(routeId);
useEffect(()=>{const change=()=>setScopeId(routeId());window.addEventListener('hashchange',change);return ()=>window.removeEventListener('hashchange',change)},[]);
useEffect(()=>{if(deleteId){deleteDialog.current?.showModal();deleteConfirm.current?.focus()}else deleteDialog.current?.close()},[deleteId]);
const navigate=(id,replace=false)=>{if(id){const i=tasksRef.current.findIndex(t=>t.id===id);if(i<0||endOfBranch(tasksRef.current,i)<=i+1)return}const hash=(sharedSnapshot?'/shared':'')+(id?'/list/'+encodeURIComponent(id):'/');if(replace)history.replaceState(null,'',location.pathname+location.search+'#'+hash);else location.hash=hash;setScopeId(id)};
const [draft,setDraft]=useState('');const input=useRef(null);
useEffect(()=>{if(sharedSnapshot){try{sessionStorage.setItem('just-todo-shared-snapshot',JSON.stringify(tasks))}catch{}return}try{localStorage.setItem('just-todo-tasks',JSON.stringify(tasks))}catch{}},[tasks,sharedSnapshot]);
useEffect(()=>{if(sharedSnapshot)return;try{localStorage.setItem('just-todo-prefs',JSON.stringify(prefs))}catch{}},[prefs]);
useEffect(()=>{const root=document.documentElement;root.dataset.theme=activeTheme.id;root.dataset.colorScheme=dark?'dark':'light';['bg','ink','muted','line','soft','accent'].forEach((name,i)=>root.style.setProperty('--'+name,activeTheme.colors[i]));root.style.background=activeTheme.colors[0];root.style.color=activeTheme.colors[1];root.style.colorScheme=dark?'dark':'light';document.querySelector('meta[name=theme-color]')?.setAttribute('content',activeTheme.colors[0])},[activeTheme,dark]);
useEffect(()=>{const key=e=>{if(e.isComposing)return;const mod=e.ctrlKey||e.metaKey;if(mod&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();if(!document.querySelector('dialog[open]')||paletteOpen)setPaletteOpen(v=>!v)}if(mod&&!e.shiftKey&&e.key==='/'){e.preventDefault();if(!document.querySelector('dialog[open]')||helpOpen)setHelpOpen(v=>!v)}};window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key)},[paletteOpen,helpOpen]);
useEffect(()=>{const first=visible[0];requestAnimationFrame(()=>{if(first)document.getElementById('task-'+first.id)?.focus();else input.current?.focus()})},[]);
const update=(k,v)=>setPrefs(p=>({...p,[k]:v}));
const add=e=>{e.preventDefault();if(prefs.viewOnly||!draft.trim())return;const task={id:crypto.randomUUID(),text:draft.trim(),done:false,depth:scope?depth(scope)+1:0};setTasks(t=>{const at=scope?t.findIndex(x=>x.id===scope.id)+1:0;return [...t.slice(0,at),task,...t.slice(at)]});setDraft('');input.current?.focus()};
const paste=e=>{
if(prefs.viewOnly)return;
const source=e.clipboardData.getData('text/plain');
if(!source.includes('\n')&&!source.includes('\r'))return;
const parsed=parsePaste(source);if(parsed.entries.length<2)return;
e.preventDefault();
const imported=parsed.entries.map(t=>({...t,id:crypto.randomUUID()}));
setTasks(ts=>{const at=scope?ts.findIndex(t=>t.id===scope.id)+1:0;return [...ts.slice(0,at),...imported.map(t=>({...t,depth:depth(t)+(scope?depth(scope)+1:0)})),...ts.slice(at)]});
if(parsed.hierarchy)update('hierarchy',true);
toast.success('Added '+imported.length+' tasks',{description:'Hint: Tab nests a note under its previous sibling.'});
};
const deleteTask=id=>{
if(prefs.viewOnly)return;
const current=tasksRef.current;const record=deletionRecord(current,id,deletedRecords.current);if(!record)return;deletedRecords.current.push(record);
const index=visibleTasks(current).findIndex(t=>t.id===id);
const next=removePreservingChildren(current,[id]);tasksRef.current=next;setTasks(next);
const scopeAt=next.findIndex(t=>t.id===scopeId);const nextVisible=visibleTasks(scopeAt>=0?next.slice(scopeAt+1,endOfBranch(next,scopeAt)):next);
if(nextVisible.length)focusTask(nextVisible[Math.min(Math.max(index,0),nextVisible.length-1)].id);else input.current?.focus();
record.toastId=toast('Task removed',{description:'Hint: Ctrl/⌘ + Z restores the note.',duration:2200,
action:{label:'Undo',onClick:()=>undoRecord(record)},
className:'app-toast undo-toast'});
};
const scopeIndex=tasks.findIndex(t=>t.id===scopeId);const scope=tasks[scopeIndex];
const scoped=scope?tasks.slice(scopeIndex+1,endOfBranch(tasks,scopeIndex)):tasks;
const exportTasks=scoped.map(t=>({...t,depth:depth(t)-(scope?depth(scope)+1:0)}));
const remaining=scoped.filter(t=>!t.done).length;
const visible=visibleTasks(scoped);
const breadcrumbs=[];let ancestor=scopeIndex;while(ancestor>=0){breadcrumbs.unshift(tasks[ancestor]);ancestor=parentIndex(tasks,ancestor)}
const openNote=id=>{const index=tasks.findIndex(t=>t.id===id);const parent=parentIndex(tasks,index);navigate(parent>=0?tasks[parent].id:null);if(!prefs.viewOnly)setTasks(ts=>revealTask(ts,id));focusTask(id)};
const shareList=async()=>{const base=scope?depth(scope):0;const list=(scope?tasks.slice(scopeIndex,endOfBranch(tasks,scopeIndex)):tasks).map(t=>({text:t.text,done:t.done,depth:depth(t)-base,collapsed:t.collapsed}));const link=location.origin+location.pathname+location.search+'#share='+encodeURIComponent(JSON.stringify(list));try{await navigator.clipboard.writeText(link);toast.success('Snapshot link copied',{description:'Hint: open a sublist to share just that branch.'})}catch{toast.error('Could not copy link',{description:'Hint: allow clipboard access, then try again.'})}};
const hasChildren=task=>{const i=tasks.findIndex(t=>t.id===task.id);return i>=0&&endOfBranch(tasks,i)>i+1};
const openSublist=id=>{const i=tasks.findIndex(t=>t.id===id);if(i<0||!hasChildren(tasks[i]))return;navigate(id);const first=visibleTasks(tasks.slice(i+1,endOfBranch(tasks,i)))[0];if(first)focusTask(first.id)};
const goBack=()=>{if(!scope)return;const parent=parentIndex(tasks,scopeIndex);navigate(parent>=0?tasks[parent].id:null);setTasks(ts=>revealTask(ts,scope.id));focusTask(scope.id)};
// Old or direct leaf routes return to the nearest containing list.
useEffect(()=>{if(!scopeId)return;if(!scope){navigate(null,true);return}if(!hasChildren(scope)){const parent=parentIndex(tasks,scopeIndex);navigate(parent>=0?tasks[parent].id:null,true);focusTask(scope.id)}},[tasks,scopeId]);

const collapseCurrent=(task,collapsed)=>{
let index=tasks.findIndex(t=>t.id===task.id);
if(!hasChildren(task)){index=parentIndex(tasks,index);if(index<0||index===scopeIndex)return}
const target=tasks[index];setTasks(ts=>ts.map(t=>t.id===target.id?{...t,collapsed}:t));focusTask(target.id);
setNotice(collapsed?'Branch collapsed.':'Branch expanded.');
};
const collapseAll=collapsed=>{
const focused=document.activeElement?.closest('[data-task-id]')?.dataset.taskId;
const ids=new Set(scoped.map(t=>t.id));const next=setAllCollapsed(tasks,collapsed).map((t,i)=>ids.has(t.id)?t:tasks[i]);setTasks(next);
if(focused){let index=tasks.findIndex(t=>t.id===focused);if(collapsed)while(index>=0&&depth(tasks[index])>(scope?depth(scope)+1:0))index=parentIndex(tasks,index);if(index>=0)focusTask(tasks[index].id)}
setNotice(collapsed?'All branches collapsed.':'All branches expanded.');
};
const outlineKey=e=>{
if(paletteOpen||helpOpen||copyOpen||deleteId||confirmRemove||e.nativeEvent.isComposing)return;
if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==='z'&&deletedRecords.current.length&&!prefs.viewOnly){e.preventDefault();undoRecord(deletedRecords.current.at(-1));return}
if(!prefs.hierarchy||confirmRemove||e.nativeEvent.isComposing)return;
if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){
if(!e.shiftKey){const id=e.target.closest('[data-task-id]')?.dataset.taskId;const task=tasks.find(t=>t.id===id);if(task){e.preventDefault();collapseCurrent(task,e.key==='ArrowLeft')}}
}
};

const focusTask=id=>requestAnimationFrame(()=>document.getElementById('task-'+id)?.focus());
const insert=(id,child)=>{if(prefs.viewOnly)return;const task={id:crypto.randomUUID(),text:'',done:false};const next=insertTask(tasks,id,child,task);if(next===tasks){setNotice('Could not insert note.');return}setTasks(revealTask(next,task.id));focusTask(task.id)};
const changeLevel=(id,direction)=>{if(prefs.viewOnly)return;const next=indentBranch(tasks,id,direction);if(next===tasks){setNotice(direction>0?'Indent needs a previous sibling.':'Already at the top level.');return}setNotice('');setTasks(revealTask(next,id));focusTask(id)};
const taskKey=(e,task)=>{
if(e.nativeEvent.isComposing)return;
const mod=e.ctrlKey||e.metaKey;
if(e.altKey&&!e.shiftKey&&!mod&&e.key==='Enter'){e.preventDefault();openSublist(task.id);return}
if(!prefs.viewOnly&&!mod&&!e.altKey&&!e.shiftKey&&e.key==='Delete'){e.preventDefault();setDeleteId(task.id);return}
if(!prefs.viewOnly&&e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const moved=moveBranch(tasks,task.id,e.key==='ArrowUp'?-1:1);if(moved===tasks){setNotice('Already at the edge of the list.');return}const next=revealTask(moved,task.id);tasksRef.current=next;setTasks(next);setNotice('');if(scopeId){const at=next.findIndex(t=>t.id===task.id),scopeAt=next.findIndex(t=>t.id===scopeId);if(scopeAt<0||at<=scopeAt||at>=endOfBranch(next,scopeAt)){const parent=parentIndex(next,at);navigate(parent>=0?next[parent].id:null)}}focusTask(task.id);return}
const index=visible.findIndex(t=>t.id===task.id);
if(e.key==='Escape'){e.preventDefault();e.target.blur();input.current?.focus();return}
if(!prefs.viewOnly&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(prefs.hierarchy)insert(task.id,e.ctrlKey||e.metaKey);else e.target.blur();return}
if(!prefs.hierarchy)return;
if(!prefs.viewOnly&&e.key==='Tab'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();changeLevel(task.id,e.shiftKey?-1:1);return}
if(['ArrowUp','ArrowDown'].includes(e.key)&&!mod&&!e.shiftKey&&!e.altKey&&atTextEdge(e.target,e.key)){const next=visible[index+(e.key==='ArrowUp'?-1:1)];e.preventDefault();if(next)focusTask(next.id);else input.current?.focus()}
if(!prefs.viewOnly&&(e.ctrlKey||e.metaKey)&&e.key===' '){e.preventDefault();setTasks(ts=>ts.map(t=>t.id===task.id?{...t,done:!t.done}:t))}
};
const currentTask=visible.find(t=>t.id===selectedTask.current);
const commands=[
{id:'view',group:'Interface',label:prefs.viewOnly?'Edit list':'View only',run:()=>update('viewOnly',!prefs.viewOnly)},
{id:'share',group:'Tasks',label:'Share snapshot link',run:shareList},
{id:'new',group:'Tasks',label:'Focus new task input',keywords:'add create paste list',run:()=>input.current?.focus()},
{id:'open-sublist',group:'Navigation',label:'Open selected note’s sublist',shortcut:'Alt + Enter',disabled:!currentTask||!hasChildren(currentTask),run:()=>openSublist(currentTask.id)},
{id:'back',group:'Navigation',label:'Back to containing list',shortcut:'Alt + Backspace',disabled:!scope,run:goBack},
{id:'first',group:'Tasks',label:'Focus first visible task',disabled:!visible.length,run:()=>focusTask(visible[0].id)},
{id:'copy',group:'Tasks',label:'Copy current list as Markdown',disabled:!tasks.length,run:copyMarkdown},
{id:'undo',group:'Tasks',label:'Undo latest deletion',shortcut:'Ctrl/⌘ + Z',run:()=>{const r=deletedRecords.current.at(-1);if(r)undoRecord(r);else toast('No deletion available to undo',{description:'Hint: Delete opens note deletion confirmation.'})}},
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
{id:'complete',group:'Current task',label:'Toggle selected task completion',disabled:!currentTask,run:()=>setTasks(ts=>ts.map(t=>t.id===currentTask.id?{...t,done:!t.done}:t))},
...['Excalifont','Space Mono','Poppins'].map(font=>({id:'font-'+font,group:'Fonts',keywords:'select selection choose typography',label:'Font: '+font,selected:prefs.font===font,run:()=>update('font',font)})),
...['small','medium','large'].map(size=>({id:'size-'+size,group:'Font size',keywords:'select selection choose text',label:'Font size: '+size,selected:prefs.size===size,run:()=>update('size',size)})),
...[{id:'system',label:'System'},...THEMES].map(t=>({id:'theme-'+t.id,group:'Themes',keywords:'select selection choose color appearance',label:'Theme: '+t.label,selected:prefs.theme===t.id,run:()=>update('theme',t.id)})),
{id:'help',group:'Interface',label:'Open keyboard shortcuts',keywords:'help information guide modal',shortcut:'Ctrl/⌘ + /',run:()=>setHelpOpen(true)},
{id:'bar',group:'Interface',label:prefs.hidden?'Show settings bar':'Hide settings bar',run:()=>update('hidden',!prefs.hidden)}
].map(c=>({...c,disabled:c.disabled||(prefs.viewOnly&&['undo','clear','remove','delete-note','child','indent','outdent','complete'].includes(c.id))})).concat(tasks.map(t=>({id:'note-'+t.id,group:'Notes',label:t.text||'Untitled note',keywords:'find note',run:()=>openNote(t.id)})));
shortcutCommands.current={'shift+c':commands.find(c=>c.id==='clear'),'shift+d':commands.find(c=>c.id==='remove'),'shift+arrowleft':commands.find(c=>c.id==='collapse'),'shift+arrowright':commands.find(c=>c.id==='expand'),enter:{run:()=>openSublist(selectedTask.current)},backspace:commands.find(c=>c.id==='back')};
return <MotionConfig reducedMotion="user" transition={{duration:.16,ease:'easeOut'}}><div className={"app"+(prefs.viewOnly?" view-only":"")} onKeyDown={outlineKey} onFocusCapture={e=>{const id=e.target.closest('[data-task-id]')?.dataset.taskId;if(id)selectedTask.current=id}} style={{'--list-font':`"${prefs.font}"`,'--list-size':{small:'18px',medium:'22px',large:'28px'}[prefs.size]}}>
{!prefs.hidden&&<header className="toolbar"><div className="bar">
<a className="brand" href={sharedSnapshot?'#/shared':'#/'} onClick={e=>{e.preventDefault();navigate(null)}} aria-label="Gottado home"><span className="brand-icon"><Icon name="check"/></span><span>gottado</span></a>
<div className="settings"><div className="header-preferences"><SelectBox label="Font" value={prefs.font} onChange={v=>update('font',v)} preview options={['Excalifont','Space Mono','Poppins'].map(v=>({value:v,label:v}))}/><span className="divider"/><SelectBox label="Size" value={prefs.size} onChange={v=>update('size',v)} options={[{value:'small',label:'Small'},{value:'medium',label:'Medium'},{value:'large',label:'Large'}]}/><span className="divider"/><SelectBox label="Theme" value={prefs.theme} onChange={v=>update('theme',v)} options={[{value:'system',label:'System'},...THEMES.map(t=>({value:t.id,label:t.label}))]}/></div><div className="toolbar-actions"><ToolButton className="icon-button" aria-label={prefs.viewOnly?'Edit list':'View only'} aria-pressed={prefs.viewOnly} tip={prefs.viewOnly?'Edit list':'View only'} icon={prefs.viewOnly?'edit':'eye'} onClick={()=>update('viewOnly',!prefs.viewOnly)}/><ToolButton className="icon-button" aria-label="Search notes and actions" tip="Find notes & actions" shortcut="Ctrl/⌘ + Shift + P" icon="search" onClick={()=>setPaletteOpen(true)}/><ToolButton ref={copyButton} className="icon-button" aria-label="Copy Markdown" tip={copied?'Copied':'Copy Markdown'} icon={copied?'check':'copy'} disabled={!tasks.length} onClick={copyMarkdown}/><ToolButton ref={helpButton} className="icon-button" aria-label="Keyboard shortcuts" tip="Keyboard shortcuts" shortcut="Ctrl/⌘ + /" icon="info" onClick={()=>setHelpOpen(true)}/><ToolButton className="icon-button" aria-label="Hide settings bar" tip="Hide settings bar" icon="hide" onClick={()=>update('hidden',true)}/></div></div>
</div></header>}
{prefs.hidden&&<ToolButton className="show-bar icon-button" aria-label="Show settings bar" tip="Show settings bar" icon="show" onClick={()=>update('hidden',false)}/>}
<main>{sharedSnapshot&&<p className="snapshot-notice">Shared snapshot · your saved list is kept separately. Edits to this snapshot stay in this tab’s session.</p>}<nav className="breadcrumbs" aria-label="List breadcrumbs"><button onClick={()=>navigate(null)}>Home</button>{breadcrumbs.map(t=><React.Fragment key={t.id}><span>/</span><button aria-current={t.id===scopeId?'page':undefined} onClick={()=>navigate(t.id)}>{t.text||'Untitled note'}</button></React.Fragment>)}</nav>{scope&&<ToolButton className="back-button" tip="Back" shortcut="Alt + Backspace" onClick={goBack}>← Back</ToolButton>}<div className="heading"><div className="title-row"><h1>{scope?scope.text:'Gotta do.'}</h1><ToolButton className="share-button icon-button" icon="share" aria-label={scope?'Share sublist':'Share list'} tip={scope?'Share sublist':'Share list'} disabled={!tasks.length} onClick={shareList}/></div><span className="count">{tasks.length? `${remaining} left`:'A little space to get things done.'}</span></div>
{!prefs.viewOnly&&<form onSubmit={add} className="add-form"><span className="add-symbol"><Icon name="plus"/></span><TaskText inputRef={input} aria-label="New task" onPaste={paste} placeholder="What needs doing?" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Enter'&&!e.shiftKey){add(e);return}if(['ArrowUp','ArrowDown'].includes(e.key)&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&atTextEdge(e.target,e.key)&&visible.length){e.preventDefault();focusTask(e.key==='ArrowDown'?visible[0].id:visible.at(-1).id)}}} maxLength={500}/><button type="submit" className="add-button" disabled={!draft.trim()} aria-label="Add task">Add <span>↵</span></button></form>}
<p className="sr-only" role="status">{notice}</p>
<ul key={scopeId||'home'} className="task-list"><AnimatePresence initial={false}>{visible.map(task=><motion.li layout data-task-id={task.id} key={task.id} initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-12,height:0,margin:0}} style={{marginLeft:Math.min(12,depth(task)-(scope?depth(scope)+1:0))*28}} className={'task'+(task.done?' done':'')}>{prefs.hierarchy&&(hasChildren(task)?<ToolButton className="branch-toggle" aria-expanded={!task.collapsed} aria-label={`${task.collapsed?'Expand':'Collapse'}: ${task.text}`} tip={task.collapsed?'Expand branch':'Collapse branch'} shortcut={task.collapsed?'Alt + →':'Alt + ←'} onClick={()=>collapseCurrent(task,!task.collapsed)}><svg width="12" height="12" viewBox="0 0 16 16" style={{transform:task.collapsed?'rotate(-90deg)':'rotate(0deg)'}}><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></ToolButton>:<span className="branch-spacer"/>)}{!prefs.viewOnly&&<button className="checkbox" aria-label={`${task.done?'Mark incomplete':'Complete'}: ${task.text}`} aria-pressed={task.done} onClick={()=>setTasks(ts=>ts.map(t=>t.id===task.id?{...t,done:!t.done}:t))}>{task.done&&<motion.span initial={{scale:.5}} animate={{scale:1}}><Icon name="check"/></motion.span>}</button>}<TaskText id={"task-"+task.id} font={prefs.font} size={prefs.size} readOnly={prefs.viewOnly} className={'task-text'+(flashId===task.id?' copy-flash':'')} aria-label={prefs.hierarchy? `Edit task, level ${depth(task)+1}`:"Edit task"} value={task.text} onChange={e=>setTasks(ts=>ts.map(t=>t.id===task.id?{...t,text:e.target.value}:t))} onBlur={()=>{if(!prefs.viewOnly)setTasks(ts=>ts.map(t=>t.id===task.id?{...t,text:t.text.trim()||'Untitled task'}:t))}} onCopy={e=>{if(e.target.selectionStart!==e.target.selectionEnd)return;e.preventDefault();e.clipboardData.setData('text/plain',task.text);setFlashId(task.id);setTimeout(()=>setFlashId(null),600);toast.success('Note copied',{description:'Hint: use Copy Markdown for the whole list.'})}} onKeyDown={e=>taskKey(e,task)} maxLength={500}/>{prefs.hierarchy&&task.collapsed&&hasChildren(task)&&<button className="hidden-count" data-tooltip="Expand branch" onClick={()=>collapseCurrent(task,false)}>{endOfBranch(tasks,tasks.findIndex(t=>t.id===task.id))-tasks.findIndex(t=>t.id===task.id)-1} hidden</button>}<div className="row-tools">{hasChildren(task)&&<ToolButton tip="Open sublist" shortcut="Alt + Enter" aria-label={`Open sublist: ${task.text}`} icon="sublist" onClick={()=>openSublist(task.id)}/>}{!prefs.viewOnly&&prefs.hierarchy&&<div className="outline-actions"><ToolButton icon="outdent" tip="Outdent task" shortcut="Shift + Tab" aria-label="Outdent task" disabled={depth(task)===0} onClick={()=>changeLevel(task.id,-1)}/><ToolButton icon="indent" tip="Indent task" shortcut="Tab" aria-label="Indent task" disabled={indentBranch(tasks,task.id,1)===tasks} onClick={()=>changeLevel(task.id,1)}/><ToolButton icon="child" tip="Add child task" shortcut="Ctrl/⌘ + Enter" aria-label="Add child task"  onClick={()=>insert(task.id,true)}/></div>}</div>{!prefs.viewOnly&&<button className="insert-between" aria-label={`Insert note after: ${task.text}`} onClick={()=>insert(task.id,hasChildren(task)&&!task.collapsed)}><Icon name="plus" width="28" height="28"/></button>}</motion.li>)}</AnimatePresence></ul>
{scoped.length===0&&<motion.div className="empty" initial={{opacity:0}} animate={{opacity:1}}><div className="empty-check"><Icon name="check" width="24" height="24"/></div><p>Nothing on your list. Yet.</p><span>Add a task above, then take it one at a time.</span></motion.div>}
</main>
<dialog ref={deleteDialog} className="confirm-dialog" onCancel={()=>setDeleteId(null)} onClose={()=>{if(deleteId)focusTask(deleteId);setDeleteId(null)}} aria-labelledby="delete-note-title"><h2 id="delete-note-title">Delete this note?</h2><p>Its children will be kept. You can undo with Ctrl/⌘ + Z.</p><div className="modal-actions"><button onClick={()=>{focusTask(deleteId);setDeleteId(null)}}>Cancel</button><button ref={deleteConfirm} className="confirm-remove" onClick={()=>{deleteTask(deleteId);setDeleteId(null)}}>Delete note</button></div></dialog>
<dialog ref={dialog} className="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-description" onCancel={()=>setConfirmRemove(false)} onClose={()=>{setConfirmRemove(false);bulkPrevious.current?.focus()}} onClick={e=>{if(e.target===dialog.current)setConfirmRemove(false)}}>
{confirmRemove&&<><h2 id="confirm-title">{confirmRemove==='completed'?'Clear completed tasks?':'Remove all tasks?'}</h2><p id="confirm-description">{confirmRemove==='completed'?`${tasks.filter(t=>t.done).length} completed tasks will be removed. Their unfinished children will be kept.`:`All ${tasks.length} tasks will be removed from this browser.`} This cannot be undone.</p><div className="modal-actions"><button onClick={()=>setConfirmRemove(false)}>Cancel</button><button ref={bulkConfirm} className="confirm-remove" onClick={()=>{if(prefs.viewOnly)return;if(confirmRemove==='completed')setTasks(ts=>removePreservingChildren(ts,ts.filter(t=>t.done).map(t=>t.id)));else{toast.dismiss();deletedRecords.current=[];setTasks([])}setConfirmRemove(false)}}>{confirmRemove==='completed'?'Clear completed':'Remove all tasks'}</button></div></>}

</dialog>
<dialog ref={helpDialog} className="help-dialog confirm-dialog" aria-labelledby="help-title" onCancel={()=>setHelpOpen(false)} onClose={()=>{setHelpOpen(false);helpButton.current?.focus()}}>
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
['Move note through all sublists',['Alt','↑ / ↓']],
['Toggle completion',['Ctrl / ⌘','Space']],
['Finish editing / leave the list',['Esc']],
]} note="Only notes with children can be opened. Alt + Enter focuses the first child; Alt + Backspace returns and focuses the note you came from. Both work in view-only mode."/>
<ShortcutGroup title="Organize the hierarchy" rows={[
['Add a child',['Ctrl / ⌘','Enter']],
['Indent under the previous sibling',['Tab']],
['Outdent one level',['Shift','Tab']],
] } note="Nesting is always available. Use the child, indent, or outdent icons beside a task to do the same with a mouse. Tab changes indentation while editing; Esc leaves the list."/>
<ShortcutGroup title="Collapse & expand" rows={[
['Collapse current branch',['Alt','←']],
['Expand current branch',['Alt','→']],
['Collapse all branches',['Alt','Shift','←']],
['Expand all branches',['Alt','Shift','→']],
]} note="Use the chevron beside a parent to toggle it. Hidden children stay saved; navigation skips them."/>
<ShortcutGroup title="Delete & undo" rows={[
['Open note deletion confirmation',['Delete']],
['Clear completed tasks',['Alt','Shift','C']],
['Remove all tasks',['Alt','Shift','D']],
['Confirm deletion',['Enter']],
['Undo the latest available deletion',['Ctrl / ⌘','Z']],
]} note="Press Delete while a note is focused, or find “Delete selected note” in Find notes and actions, then Enter to confirm. Clear completed and Remove all also ask for confirmation and cannot be undone. Individual note deletions can be undone during this session. Multiple deletions undo newest first. If none is available, Ctrl/⌘ + Z keeps its normal text-editing behavior. Deleting a parent preserves its children."/>
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
]} note="Use Copy Markdown in the top bar to copy the current list. Single-line paste stays in the input; multiline lists become tasks immediately."/>
</div>
<div className="help-footer"><section><h3>Paste a list</h3><p>Paste two or more lines into “What needs doing?” to add tasks immediately. Bullets, numbering, checkboxes, and indentation are recognized. Table columns stay together per row.</p></section><section><h3>Copy & settings</h3><p>Copy Markdown includes every task, including collapsed children, indentation, and completion checkboxes. Use arrow keys in settings menus, Enter to select, and Esc to close.</p></section></div>
</dialog>
<dialog ref={copyDialog} className="confirm-dialog copy-dialog" aria-labelledby="copy-title" onCancel={()=>setCopyOpen(false)} onClose={()=>{setCopyOpen(false);copyButton.current?.focus()}}>
<h2 id="copy-title">Copy your Markdown</h2><p>Your browser could not copy automatically. Select this text and use Ctrl/⌘ + C.</p><textarea aria-label="Markdown list" readOnly value={toMarkdown(exportTasks,true)} onFocus={e=>e.target.select()}/><button autoFocus className="action-button" onClick={()=>setCopyOpen(false)}>Done</button>
</dialog><CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} commands={commands}/><Toaster theme={dark?'dark':'light'} position="bottom-right" duration={1800} visibleToasts={6} closeButton toastOptions={{className:'app-toast'}}/></div></MotionConfig>}
createRoot(document.getElementById('root')).render(<App/>);
