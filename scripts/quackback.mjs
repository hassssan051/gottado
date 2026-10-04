import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const envFile=fileURLToPath(new URL('../.env.local',import.meta.url));
if(existsSync(envFile))process.loadEnvFile(envFile);
const key=process.env.QUACKBACK_API_KEY||process.env.QUACK_BACK_API_KEY;
const [endpoint='/boards',method='GET',bodyFile]=process.argv.slice(2);
if(!key){console.error('Set QUACKBACK_API_KEY in .env.local.');process.exit(1)}
if(!endpoint.startsWith('/')||endpoint.startsWith('//')||!['GET','POST','PATCH','DELETE'].includes(method)){
console.error('Usage: node scripts/quackback.mjs /endpoint [GET|POST|PATCH|DELETE] [body.json]');process.exit(1);
}
const base=new URL('https://gottodo.quackback.io/api/v1/');
const url=new URL(base.href.replace(/\/$/,'')+endpoint);
if(url.origin!==base.origin||!url.pathname.startsWith('/api/v1/')){console.error('Invalid API endpoint.');process.exit(1)}
try{
const body=bodyFile?JSON.stringify(JSON.parse(readFileSync(bodyFile,'utf8'))):undefined;
const response=await fetch(url,{method,redirect:'error',headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body,signal:AbortSignal.timeout(20000)});
const result=await response.text();
if(!response.ok){console.error('Quackback returned HTTP '+response.status);process.exit(1)}
try{console.log(JSON.stringify(JSON.parse(result),null,2).replaceAll(key,'[redacted]'))}catch{console.log('HTTP '+response.status+' (non-JSON response)')}
}catch{console.error('Quackback request failed. Check the connection, endpoint, and JSON body file.');process.exit(1)}
