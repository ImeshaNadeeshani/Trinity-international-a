import { readFile, readdir } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import assert from 'node:assert/strict'
import vm from 'node:vm'
const root=new URL('../supabase/functions/',import.meta.url)
let count=0
for(const dir of await readdir(root,{withFileTypes:true})){
 if(!dir.isDirectory())continue
 for(const file of await readdir(new URL(`${dir.name}/`,root))){if(!file.endsWith('.ts'))continue
 const source=await readFile(new URL(`${dir.name}/${file}`,root),'utf8')
 const js=stripTypeScriptTypes(source,{mode:'strip'}).replace(/^import .*$/gm,'').replace(/^export /gm,'')
 new vm.Script(js);count++
 }
}
const source=stripTypeScriptTypes(await readFile(new URL('_shared/portal.ts',root),'utf8'),{mode:'strip'}).replace(/^import .*$/gm,'')
const context=vm.createContext({Deno:{env:{get:()=>undefined}},crypto,TextEncoder,Uint8Array,DataView,atob,Response})
new vm.Script(source.replace(/^export /gm,'')+'\nglobalThis.checks={decodePng,verifyWebhook};').runInContext(context)
const {decodePng,verifyWebhook}=context.checks
assert.throws(()=>decodePng('data:image/svg+xml;base64,PHN2Zz4='),/PNG/)
assert.throws(()=>decodePng('data:image/png;base64,'+btoa('not a png')),/Invalid PNG/)
const forged=new Uint8Array(24);forged.set([137,80,78,71,13,10,26,10]);new DataView(forged.buffer).setUint32(16,50000);new DataView(forged.buffer).setUint32(20,50000)
assert.throws(()=>decodePng('data:image/png;base64,'+Buffer.from(forged).toString('base64')),/dimensions/)
const raw='{"event_id":"sample"}',secret='local-test-secret'
const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw))).toString('hex')
assert.equal(await verifyWebhook(raw,signature,secret),true)
assert.equal(await verifyWebhook(raw+' ',signature,secret),false)
assert.equal(await verifyWebhook(raw,'bad',secret),false)
console.log(`PASS: ${count} Edge Function modules parse; signature type/size guards and webhook authenticity/tampering checks.`)
