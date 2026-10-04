import {depth,endOfBranch,parentIndex} from './outline.js';
export function deletionRecord(tasks,id,history=[],includeChildren=false){
const index=tasks.findIndex(t=>t.id===id);if(index<0)return null;
const branchEnd=endOfBranch(tasks,index);
const branch=includeChildren&&branchEnd>index+1?tasks.slice(index,branchEnd).map(t=>({...t})):null;
const ancestors=[];let p=parentIndex(tasks,index);while(p>=0){ancestors.push(tasks[p].id);p=parentIndex(tasks,p)}
const removedParents=history.filter(r=>r.descendants.includes(id)).reverse().flatMap(r=>[r.task.id,...r.ancestors]);
const allAncestors=[...new Set([...ancestors,...removedParents])];
return {branch,task:{...tasks[index]},ancestors:allAncestors,before:tasks.slice(0,index).map(t=>t.id).reverse(),after:tasks.slice(branch?branchEnd:index+1).map(t=>t.id),descendants:tasks.slice(index+1,endOfBranch(tasks,index)).map(t=>t.id)};
}
export function restoreDeleted(tasks,record,hierarchy=true){
if(tasks.some(t=>t.id===record.task.id))return tasks;
const descendantSet=new Set(record.descendants);
const survivingChild=tasks.findIndex(t=>descendantSet.has(t.id));
let at=survivingChild;
if(at<0){const following=record.after.find(id=>tasks.some(t=>t.id===id));at=following?tasks.findIndex(t=>t.id===following):-1}
if(at<0){const previous=record.before.find(id=>tasks.some(t=>t.id===id));at=previous?endOfBranch(tasks,tasks.findIndex(t=>t.id===previous)):tasks.length}
const parent=record.ancestors.map(id=>tasks.find(t=>t.id===id)).find(Boolean);
const level=hierarchy?(parent?(depth(parent)+1):0):0;
if(record.branch){
const delta=level-depth(record.task);
const branch=record.branch.filter(t=>!tasks.some(existing=>existing.id===t.id)).map(t=>({...t,depth:hierarchy?depth(t)+delta:0}));
return [...tasks.slice(0,at),...branch,...tasks.slice(at)];
}
const restored={...record.task,depth:level,collapsed:false};
const result=tasks.map(t=>hierarchy&&descendantSet.has(t.id)?{...t,depth:(depth(t)+1)}:t);
result.splice(at,0,restored);
for(let i=0;i<result.length;i++)result[i]={...result[i],depth:hierarchy?Math.min(depth(result[i]),i?depth(result[i-1])+1:0):0};
return result;
}
