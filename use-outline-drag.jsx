import {useRef,useState,useEffect} from 'react';
import {endOfBranch,moveBranchesTo,visibleTasks} from './outline.js';

export function useOutlineDrag({tasksRef,disabled,scopeId,onMove,onFocus,getDraggedIds=id=>[id],showCompleted=true}){
const session=useRef(null),[drag,setDrag]=useState(null);
useEffect(()=>()=>session.current?.cancel(),[]);
useEffect(()=>{session.current?.cancel()},[disabled,scopeId,showCompleted]);
const start=(event,id)=>{
if(disabled||event.button!==0||session.current)return;
event.preventDefault();
const handle=event.currentTarget,pointer=event.pointerId;
const state={id,ids:getDraggedIds(id),active:false,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,target:null,frame:0};
const update=()=>{
const current=tasksRef.current;let target=null;
const element=document.elementFromPoint(state.x,state.y);
const list=element?.closest('[data-drop-parent]');
if(list)target={targetId:list.dataset.dropParent||null,position:'list',markerId:null};
else{
const row=element?.closest('[data-task-id]');
if(row){const r=row.getBoundingClientRect(),fraction=(state.y-r.top)/Math.max(1,r.height);const position=fraction<.25?'before':fraction>.75?'after':'child';const targetId=row.dataset.taskId;let markerId=targetId;
if(position==='after'){const at=current.findIndex(t=>t.id===targetId);markerId=visibleTasks(current.slice(at,endOfBranch(current,at)),showCompleted).at(-1)?.id||targetId}
target={targetId,position,markerId};}
}
if(target&&moveBranchesTo(current,state.ids,target.targetId,target.position)===current)target=null;
if(JSON.stringify(target)!==JSON.stringify(state.target)){state.target=target;setDrag({id,ids:state.ids,target})}
};
const finish=commit=>{
if(session.current!==state)return;
session.current=null;cancelAnimationFrame(state.frame);
document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',cancel);document.removeEventListener('keydown',key,true);window.removeEventListener('blur',cancel);
try{handle.releasePointerCapture(pointer)}catch{}
setDrag(null);
if(state.active&&commit&&state.target)onMove(id,state.target,state.ids);else onFocus(id);
};
const cancel=()=>finish(false);
const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel()}};
const tick=()=>{
if(session.current!==state||!state.active)return;
const top=Math.max(72,document.querySelector('.toolbar')?.getBoundingClientRect().bottom||0)+28;
const speed=state.y<top?-Math.min(16,(top-state.y)/4):state.y>innerHeight-64?Math.min(16,(state.y-(innerHeight-64))/4):0;
if(speed){window.scrollBy(0,speed);update()}
state.frame=requestAnimationFrame(tick);
};
const move=e=>{
if(e.pointerId!==pointer)return;
state.x=e.clientX;state.y=e.clientY;
if(!state.active&&Math.hypot(state.x-state.startX,state.y-state.startY)>=6){state.active=true;setDrag({id,ids:state.ids,target:null});state.frame=requestAnimationFrame(tick)}
if(state.active){e.preventDefault();update()}
};
const up=e=>{if(e.pointerId===pointer)finish(true)};
state.cancel=cancel;session.current=state;
try{handle.setPointerCapture(pointer)}catch{}
document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',up);document.addEventListener('pointercancel',cancel);document.addEventListener('keydown',key,true);window.addEventListener('blur',cancel);
};
return {drag,start};
}
