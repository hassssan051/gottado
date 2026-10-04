export const depth=t=>t.depth||0;
// Parent completion is derived from its children, including collapsed branches.
export function normalizeCompletion(tasks){
let result=tasks;const stack=[];
for(let i=tasks.length-1;i>=0;i--){
const level=depth(tasks[i]);let hasChildren=false,done=true;
while(stack.length&&stack.at(-1).level>level){hasChildren=true;done=stack.pop().done&&done}
if(!hasChildren)done=!!tasks[i].done;
if(done!==tasks[i].done){if(result===tasks)result=tasks.slice();result[i]={...tasks[i],done}}
stack.push({level,done});
}
return result;
}
export function toggleCompletion(tasks,id){
const index=tasks.findIndex(t=>t.id===id);if(index<0)return tasks;
const end=endOfBranch(tasks,index),done=!tasks[index].done;
return normalizeCompletion(tasks.map((t,i)=>i>=index&&i<end?{...t,done}:t));
}
export function endOfBranch(tasks,index){let end=index+1;while(end<tasks.length&&depth(tasks[end])>depth(tasks[index]))end++;return end}
export function indentBranch(tasks,id,direction){
const index=tasks.findIndex(t=>t.id===id);if(index<0)return tasks;
const level=depth(tasks[index]),end=endOfBranch(tasks,index),branch=tasks.slice(index,end);
if(direction>0){
let previous=index-1;while(previous>=0&&depth(tasks[previous])>level)previous--;
if(previous<0||depth(tasks[previous])!==level)return tasks;
return tasks.map((t,i)=>i>=index&&i<end?{...t,depth:depth(t)+1}:t);
}
if(level===0)return tasks;
let parent=index-1;while(parent>=0&&depth(tasks[parent])>=level)parent--;
const parentEnd=endOfBranch(tasks,parent);
return [...tasks.slice(0,index),...tasks.slice(end,parentEnd),...branch.map(t=>({...t,depth:depth(t)-1})),...tasks.slice(parentEnd)];
}
export function removePreservingChildren(tasks,ids){
const removed=new Set(ids),ancestors=[];
return tasks.flatMap(t=>{ancestors.length=depth(t);const newDepth=depth(t)-ancestors.filter(Boolean).length;ancestors[depth(t)]=removed.has(t.id);return removed.has(t.id)?[]:[{...t,depth:newDepth}]});
}
export function insertTask(tasks,id,child,newTask){
const i=tasks.findIndex(t=>t.id===id);if(i<0)return tasks;
const at=child?i+1:endOfBranch(tasks,i);
return [...tasks.slice(0,at),{...newTask,depth:depth(tasks[i])+(child?1:0)},...tasks.slice(at)];
}
export function visibleTasks(tasks){
let hiddenBelow=null;
return tasks.filter(t=>{if(hiddenBelow!==null&&depth(t)>hiddenBelow)return false;hiddenBelow=null;if(t.collapsed)hiddenBelow=depth(t);return true});
}
export function parentIndex(tasks,index){const level=depth(tasks[index]);for(let i=index-1;i>=0;i--)if(depth(tasks[i])<level)return i;return -1}
export function revealTask(tasks,id){
let i=tasks.findIndex(t=>t.id===id);const parents=new Set();
while(i>=0){i=parentIndex(tasks,i);if(i>=0)parents.add(tasks[i].id)}
return tasks.map(t=>parents.has(t.id)?{...t,collapsed:false}:t);
}
export function setAllCollapsed(tasks,collapsed){return tasks.map((t,i)=>({...t,collapsed:collapsed&&i+1<tasks.length&&depth(tasks[i+1])>depth(t)}))}

// Move a branch through outline rows, changing its level at sublist boundaries.
export function moveBranch(tasks,id,direction){
const i=tasks.findIndex(t=>t.id===id);if(i<0)return tasks;
const end=endOfBranch(tasks,i),level=depth(tasks[i]);
let at,newLevel;
if(direction<0){
if(i===0)return tasks;
const previous=i-1;
// The first child moves before its parent; otherwise enter the preceding row's level.
at=previous;newLevel=depth(tasks[previous]);
}else{
if(end===tasks.length||depth(tasks[end])<level){
if(level===0)return tasks;
// The last child leaves its parent, one level at a time.
at=end;newLevel=level-1;
}else{
at=end+1;
// Enter a neighboring sublist before its first child.
newLevel=depth(tasks[end])+(endOfBranch(tasks,end)>end+1?1:0);
}
}
const branch=tasks.slice(i,end).map(t=>({...t,depth:depth(t)+newLevel-level}));
const rest=[...tasks.slice(0,i),...tasks.slice(end)];
const insertion=at>i?at-(end-i):at;
return [...rest.slice(0,insertion),...branch,...rest.slice(insertion)];
}
