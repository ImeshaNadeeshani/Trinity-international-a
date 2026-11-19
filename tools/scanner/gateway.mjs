import http from 'node:http'
import { timingSafeEqual, createHash, randomUUID } from 'node:crypto'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'
const run=promisify(execFile)
export function classifyDefenderResult(code, output){
  // A successful command alone is insufficient: it may have remediated a threat.
  if(code===0 && /found no threats\./i.test(output))return 'clean'
  return 'pending'
}
export async function scanWithDefender(bytes, executable){
  const dir=path.join(os.tmpdir(),'trinity-scan-'+randomUUID()),file=path.join(dir,'document.bin')
  await mkdir(dir)
  try{
    await writeFile(file,bytes,{flag:'wx'})
    try{const {stdout,stderr}=await run(executable,['-Scan','-ScanType','3','-File',file,'-DisableRemediation'],{timeout:22000,windowsHide:true,maxBuffer:128*1024});return classifyDefenderResult(0,stdout+'\n'+stderr)}
    catch{return 'pending'}
  }finally{await rm(dir,{recursive:true,force:true})}
}
export function createGateway(config,scan=scanWithDefender){
  if(!config.token||config.token.length<40)throw Error('A strong scanner API key is required')
  let running=false
  return http.createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store')
    const send=(status,value)=>{res.writeHead(status);res.end(JSON.stringify(value))}
    const provided=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+config.token)
    if(provided.length!==expected.length||!timingSafeEqual(provided,expected)){req.resume();return send(401,{error:'Unauthorized'})}
    if(req.url==='/health'&&req.method==='GET')return send(200,{status:'ready',engine:'Microsoft Defender'})
    if(req.url!=='/scan'||req.method!=='POST'){req.resume();return send(404,{error:'Not found'})}
    if(running){req.resume();return send(503,{error:'Scanner busy; retry later'})}
    running=true
    try{
      let size=0;const chunks=[]
      for await(const chunk of req){size+=chunk.length;if(size>14*1024*1024){send(413,{error:'File too large'});req.destroy();return}chunks.push(chunk)}
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if(typeof body.base64!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.base64))return send(400,{error:'Invalid file encoding'})
      const bytes=Buffer.from(body.base64,'base64')
      if(!bytes.length||bytes.length>10*1024*1024)return send(400,{error:'Invalid file size'})
      if(createHash('sha256').update(bytes).digest('hex')!==body.sha256)return send(400,{error:'File hash mismatch'})
      const result=await scan(bytes,config.executable)
      if(result!=='clean')return send(503,{error:'Scanner could not confirm a clean result'})
      return send(200,{scan_status:'clean',engine:'Microsoft Defender'})
    }catch{return send(400,{error:'Invalid request or scanner unavailable'})}
    finally{running=false}
  })
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const config=JSON.parse(await readFile(process.argv[2],'utf8'))
  const server=createGateway(config);server.requestTimeout=28000;server.headersTimeout=10000
  server.listen(config.port||8787,'127.0.0.1',()=>console.log('Authenticated scanner listening on loopback'))
}
