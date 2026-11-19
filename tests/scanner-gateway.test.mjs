import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createGateway,classifyDefenderResult} from '../tools/scanner/gateway.mjs'
test('Defender requires explicit clean output and zero exit code',()=>{
 assert.equal(classifyDefenderResult(0,'Scanning document found no threats.'),'clean')
 for(const [code,output] of [[0,'Scan finished.'],[2,'found no threats.'],[0,'Threat was remediated'],[1,'Error']])assert.equal(classifyDefenderResult(code,output),'pending')
})
test('Gateway enforces bearer authentication and file hash before scanning',async()=>{
 let scans=0;const config={token:'x'.repeat(64)},server=createGateway(config,async()=>{scans++;return 'clean'})
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/scan'
 const bytes=Buffer.from('%PDF-1.4 sample'),body={base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')}
 try{
  assert.equal((await fetch(url,{method:'POST',body:JSON.stringify(body)})).status,401)
  const headers={Authorization:'Bearer '+config.token}
  assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify({...body,sha256:'wrong'})})).status,400)
  assert.equal(scans,0)
  const result=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)});assert.equal(result.status,200);assert.equal((await result.json()).scan_status,'clean');assert.equal(scans,1)
 }finally{await new Promise(r=>server.close(r))}
})
test('Unavailable scanner never returns clean',async()=>{
 const config={token:'y'.repeat(64)},server=createGateway(config,async()=> 'pending')
 await new Promise(r=>server.listen(0,'127.0.0.1',r))
 try{const bytes=Buffer.from('sample');const response=await fetch('http://127.0.0.1:'+server.address().port+'/scan',{method:'POST',headers:{Authorization:'Bearer '+config.token},body:JSON.stringify({base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')})});assert.equal(response.status,503)}finally{await new Promise(r=>server.close(r))}
})
