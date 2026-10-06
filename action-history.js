export const UNDO_LIMIT=5;
export function nativeTextUndo(target){
return !!target?.closest?.('textarea,input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="url"],input[type="tel"],input[type="password"],input[type="number"],[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
}
export function shouldUndoApp(event){
return !event.defaultPrevented&&!event.isComposing&&(event.ctrlKey||event.metaKey)&&!event.shiftKey&&!event.altKey&&event.key.toLowerCase()==='z'&&!nativeTextUndo(event.target);
}
export function createAction(before,after,label='Action',scopeId=null){
const changed=Object.keys(after).filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key]));
return changed.length?{before,after,changed,label,scopeId}:null;
}
export function pushAction(history,action){return action?[...history,action].slice(-UNDO_LIMIT):history}
// Invert only fields changed by the action. Native text edits made since then
// remain intact on surviving notes, including while undoing a reorder.
export function reverseAction(current,action){
const result={...current};
for(const key of action.changed){
if(key!=='tasks'){result[key]=action.before[key];continue}
const before=action.before.tasks,after=new Map(action.after.tasks.map(task=>[task.id,task]));
const live=new Map(current.tasks.map(task=>[task.id,task]));
result.tasks=before.map(task=>{
const existing=live.get(task.id),forward=after.get(task.id);
if(!existing||!forward)return {...task};
const restored={...existing};
for(const field of new Set([...Object.keys(task),...Object.keys(forward)])){
if(JSON.stringify(task[field])===JSON.stringify(forward[field]))continue;
if(field in task)restored[field]=task[field];else delete restored[field];
}
return restored;
});
}
return result;
}
