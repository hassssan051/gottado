export const depth=t=>t.depth||0;
// Completion is explicit; unfinished descendants can only reopen ancestors.
export function normalizeCompletion(tasks){
let result=tasks;const stack=[];
for(let i=tasks.length-1;i>=0;i--){
const level=depth(tasks[i]);let done=!!tasks[i].done;
while(stack.length&&stack.at(-1).level>level){done=stack.pop().done&&done}
if(done!==tasks[i].done){if(result===tasks)result=tasks.slice();result[i]={...tasks[i],done}}
stack.push({level,done});
}
return result;
}
export function subtaskProgress(tasks){
const result=new Map(),stack=[];
for(const task of tasks){
while(stack.length&&depth(stack.at(-1))>=depth(task))stack.pop();
if(stack.length){const id=stack.at(-1).id,progress=result.get(id)||{completed:0,total:0};progress.total++;if(task.done)progress.completed++;result.set(id,progress)}
stack.push(task);
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
export function visibleTasks(tasks,showCompleted=true){
let hiddenBelow=null;
return tasks.filter(t=>{if(hiddenBelow!==null&&depth(t)>hiddenBelow)return false;hiddenBelow=null;if(t.collapsed||(!showCompleted&&t.done))hiddenBelow=depth(t);return showCompleted||!t.done});
}

export function selectionRange(visible,anchor,head){
const a=visible.findIndex(t=>t.id===anchor),b=visible.findIndex(t=>t.id===head);
return b<0?[]:a<0?[head]:visible.slice(Math.min(a,b),Math.max(a,b)+1).map(t=>t.id);
}
export function selectedBranches(tasks,ids){
const selected=new Set(ids),branches=[];
for(let i=0;i<tasks.length;i++){if(!selected.has(tasks[i].id))continue;const end=endOfBranch(tasks,i);branches.push({index:i,end,task:tasks[i]});i=end-1}
return branches;
}
function repositionBranches(tasks,branches,at,level){
const moved=new Set(),content=[];
for(const branch of branches){const delta=level-depth(branch.task);for(let i=branch.index;i<branch.end;i++){moved.add(i);content.push(delta?{...tasks[i],depth:depth(tasks[i])+delta}:tasks[i])}}
const remaining=tasks.filter((_,i)=>!moved.has(i));
const insertion=tasks.slice(0,at).filter((_,i)=>!moved.has(i)).length;
const result=[...remaining.slice(0,insertion),...content,...remaining.slice(insertion)];
return result.every((t,i)=>t.id===tasks[i].id&&depth(t)===depth(tasks[i]))?tasks:result;
}
export function moveBranchesTo(tasks,ids,targetId,position){
const branches=selectedBranches(tasks,ids);if(!branches.length)return tasks;
if(branches.length===1)return moveBranchTo(tasks,branches[0].task.id,targetId,position);
const target=tasks.findIndex(t=>t.id===targetId);
if(!['before','after','child','list'].includes(position)||branches.some(b=>target>=b.index&&target<b.end))return tasks;
if(target<0&&(position!=='list'||targetId!==null))return tasks;
const at=target<0?tasks.length:position==='before'?target:endOfBranch(tasks,target);
const level=target<0?0:depth(tasks[target])+(['child','list'].includes(position)?1:0);
return repositionBranches(tasks,branches,at,level);
}
export function moveBranches(tasks,ids,direction,showCompleted=true){
const branches=selectedBranches(tasks,ids);if(!branches.length)return tasks;
if(branches.length===1&&showCompleted)return moveBranch(tasks,branches[0].task.id,direction);
const first=branches[0].index,end=branches.at(-1).end,level=Math.min(...branches.map(b=>depth(b.task)));
if(direction<0){let previous=first-1;while(previous>=0&&!showCompleted&&tasks[previous].done)previous--;if(previous<0)return tasks;return repositionBranches(tasks,branches,previous,depth(tasks[previous]))}
let following=end;while(following<tasks.length&&!showCompleted&&tasks[following].done)following++;
if(following===tasks.length||depth(tasks[following])<level){if(!level)return tasks;return repositionBranches(tasks,branches,following,level-1)}
return repositionBranches(tasks,branches,following+1,depth(tasks[following])+(endOfBranch(tasks,following)>following+1?1:0));
}
export function parentIndex(tasks,index){const level=depth(tasks[index]);for(let i=index-1;i>=0;i--)if(depth(tasks[i])<level)return i;return -1}
export function revealTask(tasks,id){
let i=tasks.findIndex(t=>t.id===id);const parents=new Set();
while(i>=0){i=parentIndex(tasks,i);if(i>=0)parents.add(tasks[i].id)}
return tasks.map(t=>parents.has(t.id)?{...t,collapsed:false}:t);
}
export function setAllCollapsed(tasks,collapsed){return tasks.map((t,i)=>({...t,collapsed:collapsed&&i+1<tasks.length&&depth(tasks[i+1])>depth(t)}))}

// Move an intact branch to an explicit drop target. Never accept a descendant.
export function moveBranchTo(tasks,id,targetId,position){
const index=tasks.findIndex(t=>t.id===id);if(index<0)return tasks;
const end=endOfBranch(tasks,index),target=tasks.findIndex(t=>t.id===targetId);
if(!['before','after','child','list'].includes(position))return tasks;
if(target>=index&&target<end)return tasks;
if(target<0&&(position!=='list'||targetId!==null))return tasks;
const at=target<0?tasks.length:position==='before'?target:endOfBranch(tasks,target);
const level=target<0?0:depth(tasks[target])+(['child','list'].includes(position)?1:0);
const delta=level-depth(tasks[index]);
const branch=tasks.slice(index,end).map(t=>delta?{...t,depth:depth(t)+delta}:t);
const rest=[...tasks.slice(0,index),...tasks.slice(end)];
const insertion=at>index?at-(end-index):at;
const result=[...rest.slice(0,insertion),...branch,...rest.slice(insertion)];
return result.every((t,i)=>t.id===tasks[i].id&&depth(t)===depth(tasks[i]))?tasks:result;
}

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
