import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPortalSnapshot } from '../src/lib/portalData.mjs'
function client(role='student', failures={}) {
 const calls=[]
 return {calls,from(table){const filters=[];calls.push({table,filters});const query={select(){return this},eq(...args){filters.push(args);return this},order(){return this},limit(){return this},single(){return this},then(resolve,reject){if(failures[table] instanceof Error)return Promise.reject(failures[table]).then(resolve,reject);return Promise.resolve(failures[table]?{error:failures[table]}:{data:table==='portal_profiles'?{id:'user-1',role,phone:'+94771234567'}:table==='student_agreements'?[{id:'agreement-1'}]:[]}).then(resolve,reject)}};return query}}
}
test('missing payments do not prevent agreement loading or alter phone',async()=>{const db=client('student',{portal_payments:{code:'PGRST205'}});const data=await loadPortalSnapshot(db,{id:'user-1'},false);assert.equal(data.profile.phone,'+94771234567');assert.equal(data.agreements[0].id,'agreement-1');assert.match(data.errors.payments,/database setup is incomplete/);assert.equal(data.errors.agreements,undefined)})
test('student agreement and document reads are scoped to account',async()=>{const db=client();await loadPortalSnapshot(db,{id:'user-1'},false);for(const table of ['student_agreements','student_documents','student_payment_schedules'])assert.deepEqual(db.calls.find(c=>c.table===table).filters,[['student_id','user-1']])})
test('wrong portal does not query protected features',async()=>{const db=client();await loadPortalSnapshot(db,{id:'user-1'},true);assert.equal(db.calls.length,1)})
test('legal reviewer does not query student casework',async()=>{const db=client('legal_reviewer');await loadPortalSnapshot(db,{id:'user-1'},true);assert.ok(!db.calls.some(c=>c.table==='student_documents'));assert.ok(db.calls.some(c=>c.table==='agreement_templates'))})
test('network failures are isolated and visible',async()=>{const db=client('student',{student_documents:new Error('Offline')});const data=await loadPortalSnapshot(db,{id:'user-1'},false);assert.match(data.errors.documents,/Offline/);assert.equal(data.agreements.length,1)})
test('missing account profile fails clearly',async()=>{await assert.rejects(loadPortalSnapshot(client('student',{portal_profiles:{code:'PGRST205'}}),{id:'user-1'},false),/account profile.*setup is incomplete/)})
