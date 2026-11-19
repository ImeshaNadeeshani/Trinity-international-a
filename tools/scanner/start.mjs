import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync,openSync} from 'node:fs'
import {spawn,execFileSync} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'../..');process.chdir(root)
const work=path.join(root,'tmp/scanner');mkdirSync(work,{recursive:true})
const binary=path.join(work,'cloudflared.exe')
if(!existsSync(binary)){
 const response=await fetch('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe');if(!response.ok)throw Error('Unable to download cloudflared');writeFileSync(binary,Buffer.from(await response.arrayBuffer()))
}
const platform='C:/ProgramData/Microsoft/Windows Defender/Platform'
const executable=readdirSync(platform).sort().reverse().map(v=>path.join(platform,v,'MpCmdRun.exe')).find(existsSync)
if(!executable)throw Error('Microsoft Defender command-line scanner not found')
const configPath=path.join(work,'config.json')
const config=existsSync(configPath)?JSON.parse(readFileSync(configPath,'utf8')):{token:randomBytes(48).toString('hex'),port:8787}
config.executable=executable;writeFileSync(configPath,JSON.stringify(config))
const auth={Authorization:'Bearer '+config.token}
const ready=await fetch('http://127.0.0.1:8787/health',{headers:auth}).then(r=>r.ok).catch(()=>false)
if(!ready){const gateway=spawn(process.execPath,['tools/scanner/gateway.mjs',configPath],{cwd:root,windowsHide:true,detached:true,stdio:['ignore',openSync(path.join(work,'gateway.out.log'),'a'),openSync(path.join(work,'gateway.err.log'),'a')]});gateway.unref();writeFileSync(path.join(work,'gateway.pid'),String(gateway.pid))}
let url=existsSync(path.join(work,'endpoint.txt'))?readFileSync(path.join(work,'endpoint.txt'),'utf8'):''
const tunnelReady=url&&await fetch(url+'/health',{headers:auth,signal:AbortSignal.timeout(5000)}).then(r=>r.ok).catch(()=>false)
if(!tunnelReady){
 const log=path.join(work,'tunnel.err.log');writeFileSync(log,'')
 const tunnel=spawn(binary,['tunnel','--url','http://127.0.0.1:8787','--no-autoupdate'],{cwd:root,windowsHide:true,detached:true,stdio:['ignore',openSync(path.join(work,'tunnel.out.log'),'a'),openSync(log,'a')]});tunnel.unref();writeFileSync(path.join(work,'tunnel.pid'),String(tunnel.pid))
 for(let i=0;i<45;i++){await new Promise(r=>setTimeout(r,1000));url=readFileSync(log,'utf8').match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];if(url)break}
 if(!url)throw Error('HTTPS tunnel did not start. See tmp/scanner/tunnel.err.log')
 writeFileSync(path.join(work,'endpoint.txt'),url)
}
writeFileSync(path.join(work,'supabase-secrets.env'),`MALWARE_SCAN_GATEWAY_URL=${url}\nMALWARE_SCAN_GATEWAY_API_KEY=${config.token}\n`)
// Secret values are read from the ignored file, never interpolated into a shell command.
execFileSync('cmd.exe',['/d','/s','/c','npx.cmd supabase secrets set --env-file tmp/scanner/supabase-secrets.env --remote=wakcnffodcluikuvgqpz --yes'],{cwd:root,windowsHide:true,stdio:'inherit'})
console.log('Testing scanner connected. Keep this computer awake. The temporary HTTPS endpoint is not production hosting.')
