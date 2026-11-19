// Local administrator tool. Never import this file into the website.
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
const email='imeshanadeeshani08@gmail.com'
const raw=execFileSync('cmd.exe',['/d','/s','/c','npx.cmd supabase projects api-keys --remote=wakcnffodcluikuvgqpz --output json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']})
const keys=JSON.parse(raw.replace(/^\uFEFF/,'')),key=keys.find(k=>k.id==='service_role')?.api_key
if(!key||!key.startsWith('ey'))throw Error('Supabase administrator login required. Run npx.cmd supabase login first.')
const db=createClient('https://wakcnffodcluikuvgqpz.supabase.co',key,{auth:{persistSession:false,autoRefreshToken:false}})
let account
for(let page=1;page<=100;page++){
 const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});if(error)throw Error('Unable to read authentication accounts.')
 account=data.users.find(u=>u.email?.toLowerCase()===email)
 if(account||data.users.length<1000)break
}
if(!account)throw Error('The specified account does not exist. No changes made.')
console.log('Account found: '+email)
if(process.argv.includes('--confirm-email')){const {error}=await db.auth.admin.updateUserById(account.id,{email_confirm:true});if(error)throw Error('Email confirmation failed: '+error.message);console.log('Test account email confirmed. Password and role were not changed.')} else if(process.argv.includes('--check')){console.log('Administrator access verified. No password or account details changed.');console.log('Email confirmed:',Boolean(account.email_confirmed_at));console.log('Account last updated:',account.updated_at);console.log('Last successful sign-in:',account.last_sign_in_at||'Never');const {data:profile,error:profileError}=await db.from('portal_profiles').select('role').eq('id',account.id).single();console.log('Portal role:',profileError?'Profile unavailable':profile.role)} else {
if(!process.stdin.isTTY)throw Error('Run this tool directly in your VS Code terminal to enter a hidden password.')
async function hidden(prompt){
 process.stdout.write(prompt)
 return new Promise((resolve,reject)=>{
  let value='';process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8')
  const finish=()=>{process.stdin.off('data',receive);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n')}
  const receive=chunk=>{for(const character of chunk){if(character==='\u0003'){finish();reject(Error('Cancelled.'));return}if(character==='\r'||character==='\n'){finish();resolve(value);return}if(character==='\u007f'||character==='\b'){if(value.length){value=value.slice(0,-1);process.stdout.write('\b \b')}}else if(character>=' '){value+=character;process.stdout.write('*')}}}
  process.stdin.on('data',receive)
 })
}
let password='',confirmation=''
while(true){
 password=await hidden('New password (at least 12 characters; * shows typing): ')
 if(password.length<12){console.log('Not saved: use at least 12 characters. Please try again.');continue}
 confirmation=await hidden('Confirm new password: ')
 if(password!==confirmation){console.log('Not saved: passwords do not match. Please try again.');continue}
 break
}
const {error}=await db.auth.admin.updateUserById(account.id,{password})
if(error)throw Error('Password reset failed: '+error.message)
const anonKey=keys.find(k=>k.id==='anon')?.api_key
if(!anonKey)throw Error('Password saved, but login verification key is unavailable.')
const verifier=createClient('https://wakcnffodcluikuvgqpz.supabase.co',anonKey,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await verifier.auth.signInWithPassword({email,password})
password='';confirmation=''
if(loginError)throw Error('Password saved, but sign-in verification failed: '+loginError.message)
await verifier.auth.signOut({scope:'local'})
if(login.user.id!==account.id)throw Error('Unexpected account; do not continue.')
console.log('SUCCESS: Password updated and Supabase sign-in verified for '+email)
console.log('Open http://localhost:5173/student-portal in an Incognito window.')
console.log('Type the same new password. Avoid the browser saved password/autofill.')
console.log('Roles and existing documents were not changed. No email was sent.')

}
