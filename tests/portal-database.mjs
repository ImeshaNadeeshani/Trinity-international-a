import { PGlite } from '../tmp/portal-validation/node_modules/@electric-sql/pglite/dist/index.js'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const db=new PGlite()
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
grant usage on schema public,auth,storage to authenticated,service_role;
grant select,insert,update,delete on storage.objects to authenticated;
`)
for(const path of ['student_portal.sql','workflow_extensions.sql','document_automation.sql','student_workflow.sql','payment_workflow.sql']){
 try{await db.exec(await readFile(new URL(`../supabase/${path}`,import.meta.url),'utf8'));console.log(`Migration OK: ${path}`)}catch(error){console.error(`Migration failed: ${path}`,error.message);process.exit(1)}
}
const student='10000000-0000-0000-0000-000000000001',other='10000000-0000-0000-0000-000000000002',admin='10000000-0000-0000-0000-000000000003',signer='10000000-0000-0000-0000-000000000004'
const q=(sql,params=[])=>db.query(sql,params)
const login=async id=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')}
const server=async()=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub','',false)")}
async function fails(fn,pattern){await assert.rejects(fn,pattern);console.log(`Guard OK: ${pattern}`)}
await q('insert into auth.users(id,email) values($1,\'student@example.test\'),($2,\'other@example.test\'),($3,\'admin@example.test\'),($4,\'signer@example.test\')',[student,other,admin,signer])
await q("update portal_profiles set role='admin' where id=$1",[admin]);await q("update portal_profiles set role='signatory' where id=$1",[signer])
await login(student)
await fails(()=>q("update portal_profiles set role='admin' where id=$1",[student]),/Only Trinity administrators/)
await q("update portal_profiles set full_name='Test Student',nic_number='200012345678',passport_number='N1234567',date_of_birth='2000-01-01',residential_address='Test address',phone='+94 700000000' where id=$1",[student])
const app=(await q("insert into student_applications(student_id,destination,course_interest,intake) values($1,'Ireland','Computing','September 2027') returning id",[student])).rows[0].id
await login(admin)
await fails(()=>q("update student_applications set status='application_approved' where id=$1",[app]),/Authorized approval/)
await server()
const docs=[]
for(const category of ['nic_front','nic_back','passport','education']){
 const doc=(await q("insert into student_documents(application_id,student_id,category,file_name,storage_path,mime_type,size_bytes,scan_status,status) values($1,$2,$3,'test.png',$4,'image/png',100,'clean','verified') returning id",[app,student,category,`${student}/${app}/${category}.png`])).rows[0].id;docs.push(doc)
}
await q('insert into document_extractions(document_id,student_id,fields) values($1,$2,$3)',[docs[0],student,JSON.stringify({full_name:'Test OCR',identification_number:'200012345678'})])
await login(student)
await q('select portal_confirm_extracted_details($1,$2)',[docs[0],JSON.stringify({full_name:'Test Student',identification_number:'200012345678',date_of_birth:'2000-01-01'})])
await login(other)
assert.equal((await q('select * from document_extractions')).rows.length,0)
await fails(()=>q('select portal_confirm_extracted_details($1,$2)',[docs[0],JSON.stringify({full_name:'Attacker',identification_number:'x'})]),/no rows/)
await login(admin)
await q("update student_applications set status='documents_uploaded' where id=$1",[app]);await q("update student_applications set status='under_board_review' where id=$1",[app]);await q("update student_applications set status='documents_verified' where id=$1",[app]);await q("update student_applications set status='application_approved' where id=$1",[app]);
const schedule=(await q('insert into student_payment_schedules(application_id,student_id,total_fee,initial_payment,balance,currency,created_by) values($1,$2,100,100,0,\'USD\',$3) returning id',[app,student,admin])).rows[0].id
await server()
// The agreement registration RPC separately validates readiness and approved snapshots.
const agreement=(await q("insert into student_agreements(application_id,student_id,reference_number,status,private_pdf_path,workflow_version,document_sha256) values($1,$2,'TEST-AGREEMENT','awaiting_student_signature','unsigned.pdf',2,'hash0') returning id",[app,student])).rows[0].id
await login(student)
assert.equal((await q('select * from student_payment_schedules')).rows.length,0)
await fails(()=>q('select portal_submit_signature($1,$2,\'drawn\',\'hash0\',\'hash1\',\'student.pdf\',\'{}\')',[agreement,student]),/permission denied/)
await server()
await fails(()=>q('select portal_submit_signature($1,$2,\'drawn\',\'hash0\',\'hash1\',\'head.pdf\',\'{}\')',[agreement,signer]),/cannot sign/)
await fails(()=>q('select portal_begin_payment($1,\'initial\',$2)',[schedule,student]),/Complete the agreement/)
await q('select portal_submit_signature($1,$2,\'drawn\',\'hash0\',\'hash1\',\'student.pdf\',\'{}\')',[agreement,student])
await fails(()=>q('select portal_submit_signature($1,$2,\'drawn\',\'hash0\',\'hash1\',\'student2.pdf\',\'{}\')',[agreement,student]),/changed/)
await fails(()=>q('select portal_begin_payment($1,\'initial\',$2)',[schedule,student]),/Complete the agreement/)
await q('select portal_submit_signature($1,$2,\'uploaded\',\'hash1\',\'hash2\',\'final.pdf\',\'{}\')',[agreement,signer])
await login(student);assert.equal((await q('select * from student_payment_schedules')).rows.length,1)
await login(other);assert.equal((await q('select * from student_payment_schedules')).rows.length,0)
await login(admin);await fails(()=>q('update student_payment_schedules set total_fee=200,initial_payment=200 where id=$1',[schedule]),/Fees are locked/)
await server()
const payment=(await q('select (portal_begin_payment($1,\'initial\',$2)).*',[schedule,student])).rows[0]
await q("update portal_payments set gateway_reference='gateway1' where id=$1",[payment.id])
await fails(()=>q("select portal_record_payment_event($1,'event1','gateway1','successful',1,'USD','receipt.pdf','receipthash')",[payment.id]),/does not match/)
await q("select portal_record_payment_event($1,'event1','gateway1','successful',100,'USD','receipt.pdf','receipthash')",[payment.id])
await q("select portal_record_payment_event($1,'event1','gateway1','successful',100,'USD','receipt.pdf','receipthash')",[payment.id])
assert.equal((await q('select * from payment_receipts')).rows.length,1)
assert.equal((await q('select * from payment_transactions')).rows.length,1)
await fails(()=>q("select portal_record_payment_event($1,'event2','gateway1','failed',100,'USD',null,null)",[payment.id]),/Invalid payment transition/)
await q("select portal_record_payment_event($1,'event3','gateway1','refunded',100,'USD',null,null)",[payment.id])
await login(other);assert.equal((await q('select * from payment_receipts')).rows.length,0)
await login(student);assert.equal((await q('select * from payment_receipts')).rows.length,1)
await server();await fails(()=>q('select portal_begin_payment($1,\'initial\',$2)',[schedule,student]),/already been settled/)
console.log('PASS: migrations, role escalation, ownership, OCR confirmation, signing order, replay protection, payment locks, immutable fees, callback amounts, duplicate callbacks, refunds and receipt privacy.')
await db.close()
