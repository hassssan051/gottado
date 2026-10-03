// Paste contract: one nonblank physical line per task; indentation alone determines
// nesting. List/checklist prefixes are syntax. Tab-separated columns stay one task.
export function parsePaste(source){
const lines=source.replace(/\r\n?/g,'\n').split('\n');
const entries=[];const indents=[];let headingBase=-1;let limited=false;
for(const line of lines){
if(!line.trim())continue;
if(/^\s*`{3,}/.test(line)||/^\s*~{3,}/.test(line))continue;
const leading=line.match(/^[ \t]*/)[0];const indent=[...leading].reduce((n,c)=>n+(c==='\t'?4:1),0);
let text=line.trim(),done=false,isHeading=false;
const heading=text.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/);
let level;
if(heading){text=heading[2];level=heading[1].length-1;headingBase=level;indents.length=0;isHeading=true}
else{
if(!indents.length||indent<indents[0]){indents.length=0;indents.push(indent)}
else{while(indents.length>1&&indent<indents.at(-1))indents.pop();if(indent>indents.at(-1))indents.push(indent)}
level=indents.length-1+(headingBase>=0?headingBase+1:0);
text=text.replace(/^(?:[-+*•‣▪]|\d+[.)])\s+/,'');
const checkbox=text.match(/^\[([ xX])\]\s*/);if(checkbox){done=checkbox[1].toLowerCase()==='x';text=text.slice(checkbox[0].length)}
if(/^\|?.*\|.*\|?$/.test(text)){
const cells=text.replace(/^\|/,'').replace(/\|$/,'').split(/(?<!\\)\|/).map(c=>c.trim());
if(cells.length>1&&cells.every(c=>/^:?-{3,}:?$/.test(c)))continue;
if(text.startsWith('|')&&text.endsWith('|'))text=cells.filter(Boolean).join(' — ');
}
text=text.split('\t').map(c=>c.trim()).filter(Boolean).join(' — ');
}
if(!text.trim())continue;
const previous=entries.at(-1)?.depth??-1;
level=Math.max(0,Math.min(level,previous+1));

if(isHeading)headingBase=level;
entries.push({text:text.trim(),done,depth:level});
}
return {entries,hierarchy:entries.some(t=>t.depth>0),limited};
}
