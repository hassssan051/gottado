// Two-space indentation round-trips through structured paste. Copy all tasks,
// including collapsed descendants, as plain nested lists.
export function toMarkdown(tasks,hierarchy=true){
return tasks.map(task=>{
const indent='  '.repeat(hierarchy?(task.depth||0):0);
const text=(task.text||'Untitled task').trim();
const lines=text.split(/\r?\n/);
return indent+'- '+lines.map((line,index)=>index?indent+'  '+line:line).join('\n');
}).join('\n');
}
