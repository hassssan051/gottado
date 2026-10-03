export const THEMES=[
{id:'dark',label:'Dark',dark:true,colors:['#1d211d','#e3e6dc','#a8b0a3','#3b4338','#282f26','#b0c69d']},
{id:'light',label:'Light',dark:false,colors:['#faf9f6','#30362f','#6b7166','#dddfd6','#eeeee6','#576c48']},
{id:'midnight',label:'Midnight',dark:true,colors:['#111827','#e5e7eb','#a4b0c4','#334155','#1e293b','#93c5fd']},
{id:'carbon',label:'Carbon',dark:true,colors:['#151515','#eeeeee','#aaaaaa','#393939','#252525','#f0c674']},
{id:'dracula',label:'Dracula',dark:true,colors:['#282a36','#f8f8f2','#b5b7cc','#494b5e','#343746','#bd93f9']},
{id:'nord',label:'Nord',dark:true,colors:['#2e3440','#eceff4','#b1bac9','#4c566a','#3b4252','#88c0d0']},
{id:'rose',label:'Rose',dark:true,colors:['#261b25','#f3e4ef','#c1a9bc','#503649','#352532','#f1a7cf']},
{id:'ocean',label:'Ocean',dark:true,colors:['#0c242b','#def4f4','#97b7bd','#31535c','#17353e','#65d4cc']},
{id:'forest',label:'Forest',dark:true,colors:['#12271c','#e0efdf','#a0b6a2','#34503c','#203828','#9cd29a']},
{id:'paper',label:'Paper',dark:false,colors:['#ffffff','#20242a','#686f78','#dce1e6','#f2f4f6','#405e9c']},
{id:'latte',label:'Latte',dark:false,colors:['#f5eee5','#40362d','#776351','#ded0be','#ebe0d2','#8b5f33']},
{id:'lavender',label:'Lavender',dark:false,colors:['#f2effa','#38304c','#6c627e','#d9d1ea','#e8e1f4','#7656a1']}
];
export function resolveTheme(id,systemDark){return THEMES.find(t=>t.id===(id==='system'?(systemDark?'dark':'light'):id))||THEMES[0]}
export function searchCommands(commands,query){
const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
const matches=commands.filter(c=>words.every(w=>(c.label+' '+c.group+' '+(c.keywords||'')).toLowerCase().includes(w)));
if(!words.length)return matches;
const phrase=words.join(' ');
const score=c=>{const label=c.label.toLowerCase();return (label===phrase?100:label.startsWith(phrase)?60:label.includes(phrase)?40:0)+(c.group==='Notes'?10:0)-(c.disabled?5:0)};
return matches.sort((a,b)=>score(b)-score(a));
}
