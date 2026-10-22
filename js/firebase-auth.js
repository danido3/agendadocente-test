// Agenda IPIA TEST 4.9.37: accesso Google, senza sincronizzazione dei dati
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
const app=initializeApp({
  apiKey:'AIzaSyBhGhWO4S1kwkncXXSb6k-hfgM99V7lQ9w',
  authDomain:'agenda-ipia.firebaseapp.com',
  projectId:'agenda-ipia',
  storageBucket:'agenda-ipia.firebasestorage.app',
  messagingSenderId:'505492164166',
  appId:'1:505492164166:web:513e9e96d49d77dabd4447'
});
import {getFirestore,doc,getDoc,setDoc,serverTimestamp,runTransaction,onSnapshot,getDocFromServer} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const db=getFirestore(app);
const auth=getAuth(app),provider=new GoogleAuthProvider();
const status=document.getElementById('firebaseAuthStatus');
const login=document.getElementById('firebaseLogin');
const logout=document.getElementById('firebaseLogout');
const cloudUpload=document.getElementById('cloudUpload'),cloudDownload=document.getElementById('cloudDownload'),cloudStatus=document.getElementById('cloudStatus');
const autoButton=document.getElementById('autoSyncToggle'),autoStatus=document.getElementById('autoSyncStatus');
let autoEnabled=false,autoStop=null,autoUser=null,autoRevision=0,autoHash=null,autoDirty=false,autoBusy=false,autoTimer=null,autoConflict=false;
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v}
function fingerprint(s){return JSON.stringify(canonical([s.entries,s.personalization,s.closures]))}
function autoMessage(s){autoStatus.textContent=s}
function autoUI(){autoButton.hidden=!currentUser;resolveButton.hidden=!currentUser||autoEnabled;autoButton.textContent=autoEnabled?'Disattiva sincronizzazione automatica':'Attiva sincronizzazione automatica';cloudUpload.disabled=autoEnabled;cloudDownload.disabled=autoEnabled}
function stopAuto(reason){if(autoStop){autoStop();autoStop=null}if(autoTimer)clearTimeout(autoTimer);autoTimer=null;autoEnabled=false;autoBusy=false;autoDirty=false;autoConflict=false;autoUser=null;autoHash=null;autoUI();if(reason)autoMessage(reason)}
let currentUser=null;const cloudPath=()=>doc(db,'users',currentUser.uid,'data','agenda');
function cloudMessage(t){cloudStatus.textContent=t}

function message(s){status.textContent=s}
onAuthStateChanged(auth,user=>{
  if(autoUser&&autoUser!==user?.uid)stopAuto('Sincronizzazione disattivata: account cambiato.');
  currentUser=user;login.hidden=!!user;logout.hidden=!user;cloudUpload.hidden=!user;cloudDownload.hidden=!user;
  cloudMessage(user?'Cloud pronto per trasferimenti manuali. Nessuna sincronizzazione automatica.':'Accedi per trasferire i dati.');
  message(user?'Connesso come '+(user.email||user.displayName||'utente Google')+'.':'Non connesso. I dati continuano a essere salvati soltanto su questo dispositivo.');
  autoUI();
  if(user&&localStorage.getItem('agenda-ipia-autosync-uid')===user.uid&&!autoEnabled)startAuto(false);
},err=>message('Impossibile verificare l’accesso: '+err.message));
login.addEventListener('click',async()=>{
  login.disabled=true;message('Apertura accesso Google…');
  try{await signInWithPopup(auth,provider)}
  catch(e){message(e.code==='auth/popup-blocked'?'Popup bloccato: consenti i popup e riprova.':'Accesso non riuscito: '+(e.code||e.message))}
  finally{login.disabled=false}
});
logout.addEventListener('click',async()=>{
  logout.disabled=true;
  try{await signOut(auth)}catch(e){message('Disconnessione non riuscita: '+e.message)}
  finally{logout.disabled=false}
});

async function cloudAction(kind){
 if(autoEnabled){cloudMessage('Disattiva prima la sincronizzazione automatica per usare i pulsanti manuali.');return}
 if(!currentUser){cloudMessage('Accedi con Google prima di continuare.');return}
 const user=currentUser,buttons=[cloudUpload,cloudDownload];buttons.forEach(b=>b.disabled=true);
 try{
  const ref=cloudPath(),remote=await getDoc(ref);
  if(auth.currentUser?.uid!==user.uid)throw Error('Account cambiato: riprova');
  if(kind==='upload'){
   const msg=remote.exists()?'Nel cloud esiste già un’agenda. SOSTITUIRLA con i dati locali di questo dispositivo?':'Caricare nel cloud una copia completa dei dati di questo dispositivo?';
   if(!confirm(msg)){cloudMessage('Caricamento annullato.');return}
   const snapshot=window.agendaCloudExport();
   await setDoc(ref,{snapshot,updatedAt:serverTimestamp(),schema:1});
   cloudMessage('Caricamento completato. I dati locali non sono stati modificati.');
  }else{
   if(!remote.exists()){cloudMessage('Nel cloud non ci sono ancora dati. Caricali prima dal dispositivo principale.');return}
   const payload=remote.data();
   if(!payload||payload.schema!==1||!payload.snapshot)throw Error('Archivio cloud non riconosciuto');
   const snap=payload.snapshot,n=(snap.entries||[]).length;
   if(!confirm('Scaricare '+n+' voci dal cloud? I dati LOCALI di questo browser saranno SOSTITUITI. Prima verrà creata una copia locale di sicurezza.')){cloudMessage('Download annullato.');return}
   window.agendaCloudImport(snap);
   cloudMessage('Download completato: '+n+' voci caricate. Copia di sicurezza locale creata.');
  }
 }catch(e){cloudMessage('Operazione non riuscita: '+(e.code||e.message))}
 finally{buttons.forEach(b=>b.disabled=false)}
}
cloudUpload.addEventListener('click',()=>cloudAction('upload'));
cloudDownload.addEventListener('click',()=>cloudAction('download'));

function conflict(){
 resolveButton.hidden=false;
 autoConflict=true;autoEnabled=false;
 if(autoStop){autoStop();autoStop=null}
 if(autoTimer)clearTimeout(autoTimer);
 autoTimer=null;localStorage.removeItem('agenda-ipia-autosync-uid');
 autoUI();autoMessage('⚠️ Modifiche diverse su due dispositivi. Nessun dato è stato sovrascritto. Esporta un backup locale, poi scegli manualmente quale versione conservare.');
}
async function startAuto(interactive){
 if(!currentUser||autoEnabled)return;
 if(!navigator.onLine){autoMessage('Serve Internet per attivare la sincronizzazione.');return}
 const user=currentUser,uid=user.uid;
 autoMessage('Controllo dati cloud e locali…');
 try{
  const remote=await getDocFromServer(doc(db,'users',uid,'data','agenda'));
  if(auth.currentUser?.uid!==uid)return;
  const local=window.agendaCloudExport(),localHash=fingerprint(local);
  let payload=remote.exists()?remote.data():null;
  if(!payload){
   if(!interactive){autoMessage('Cloud vuoto: attivazione sospesa.');localStorage.removeItem('agenda-ipia-autosync-uid');return}
   if(!confirm('Il cloud è vuoto. Caricare la copia locale e attivare la sincronizzazione automatica?')){autoMessage('Attivazione annullata.');return}
   await setDoc(doc(db,'users',uid,'data','agenda'),{snapshot:local,revision:1,updatedAt:serverTimestamp(),schema:1});
   payload={snapshot:local,revision:1,schema:1};
  }
  if(payload.schema!==1||!payload.snapshot)throw Error('Archivio cloud non valido');
  const remoteHash=fingerprint(payload.snapshot);
  if(localHash!==remoteHash){
   // La prima attivazione può scegliere il cloud. Nei successivi avvii, non sovrascrivere modifiche locali impreviste.
   if(!interactive){localStorage.removeItem('agenda-ipia-autosync-uid');autoMessage('Dati locali diversi dal cloud: sincronizzazione sospesa per sicurezza. Controlla i dati e riattiva manualmente.');return}
   if(!confirm('I dati locali sono diversi da quelli cloud. Per attivare la sincronizzazione bisogna SCARICARE la versione cloud, sostituendo i dati locali. Verrà creata una copia di sicurezza. Continuare?')){autoMessage('Attivazione annullata: nessun dato cambiato.');return}
   window.agendaCloudImport(payload.snapshot);
  }
  autoUser=uid;autoRevision=Number(payload.revision)||0;autoHash=remoteHash;
  autoDirty=false;autoConflict=false;autoEnabled=true;resolveButton.hidden=true;resolvePanel.replaceChildren();localStorage.setItem('agenda-ipia-autosync-uid',uid);autoUI();
  autoMessage('Sincronizzazione automatica attiva · dati aggiornati.');
  autoStop=onSnapshot(doc(db,'users',uid,'data','agenda'),{includeMetadataChanges:true},snap=>{
   if(!autoEnabled||autoUser!==uid||!snap.exists()||snap.metadata.fromCache||snap.metadata.hasPendingWrites)return;
   const v=snap.data();if(v.schema!==1||!v.snapshot){conflict();return}
   const nextHash=fingerprint(v.snapshot),nextRev=Number(v.revision)||0;
   if(autoBusy)return;
   const currentHash=fingerprint(window.agendaCloudExport());
   if(autoDirty||currentHash!==autoHash){
    if(nextHash!==autoHash)conflict();
    return;
   }
   if(nextHash!==autoHash){
    try{window.agendaCloudImport(v.snapshot);autoHash=nextHash;autoRevision=nextRev;autoMessage('Agenda aggiornata automaticamente dal cloud.')}
    catch(e){conflict()}
   }else autoRevision=nextRev;
  },e=>{autoMessage('Ascolto cloud interrotto: '+e.message)});
 }catch(e){autoMessage('Attivazione non riuscita: '+(e.code||e.message))}
}
async function uploadAuto(){
 if(!autoEnabled||autoBusy||!autoDirty||!navigator.onLine||!currentUser||currentUser.uid!==autoUser)return;
 autoBusy=true;const uid=autoUser;
 try{
  const local=window.agendaCloudExport(),hash=fingerprint(local);
  const ref=doc(db,'users',uid,'data','agenda');
  const rev=await runTransaction(db,async tx=>{
   const existing=await tx.get(ref);
   const v=existing.exists()?existing.data():null;
   if(!v||fingerprint(v.snapshot)!==autoHash||Number(v.revision||0)!==autoRevision)throw Error('CONFLICT');
   const next=autoRevision+1;
   tx.set(ref,{snapshot:local,revision:next,schema:1,updatedAt:serverTimestamp()});
   return next;
  });
  if(!autoEnabled||autoUser!==uid)return;
  autoRevision=rev;autoHash=hash;
  const nowHash=fingerprint(window.agendaCloudExport());
  autoDirty=nowHash!==hash;
  autoMessage(autoDirty?'Altre modifiche in attesa di invio…':'Modifiche sincronizzate nel cloud.');
 }catch(e){
  if(String(e.message).includes('CONFLICT'))conflict();
  else autoMessage('Modifiche conservate localmente. Invio in attesa della connessione: '+(e.code||e.message));
 }finally{
  autoBusy=false;
  if(autoEnabled&&autoDirty&&navigator.onLine){if(autoTimer)clearTimeout(autoTimer);autoTimer=setTimeout(uploadAuto,4000)}
 }
}
window.addEventListener('agenda-local-changed',()=>{
 if(!autoEnabled||autoConflict)return;
 autoDirty=true;autoMessage(navigator.onLine?'Modifiche locali: sincronizzazione in corso…':'Offline: modifiche conservate localmente, in attesa di connessione.');
 if(autoTimer)clearTimeout(autoTimer);
 autoTimer=setTimeout(uploadAuto,900);
});
window.addEventListener('online',()=>{if(autoEnabled&&autoDirty)uploadAuto()});
document.addEventListener('visibilitychange',()=>{
 if(autoEnabled&&!document.hidden){
  if(!autoDirty&&fingerprint(window.agendaCloudExport())!==autoHash){conflict();return}
  if(autoDirty)uploadAuto();
 }
});
autoButton.addEventListener('click',()=>{
 if(autoEnabled){localStorage.removeItem('agenda-ipia-autosync-uid');stopAuto('Sincronizzazione automatica disattivata.');}
 else startAuto(true);
});

const resolveButton=document.getElementById('resolveCloudConflicts');
const resolvePanel=document.getElementById('cloudConflictPanel');
let proposedMerge=null;
function stable(x){return JSON.stringify(canonical(x))}
function rowChoice(title,localValue,cloudValue){
 const wrap=document.createElement('div');wrap.className='setting-group';
 const name=document.createElement('strong');name.textContent=title;wrap.append(name);
 const select=document.createElement('select');
 for(const [value,label] of [['local','Conserva versione di questo dispositivo'],['cloud','Conserva versione cloud']]){
  const opt=document.createElement('option');opt.value=value;opt.textContent=label;select.append(opt);
 }
 select.setAttribute('aria-label','Versione da conservare per '+title);
 wrap.append(select);
 const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Confronta i contenuti';
 const pre=document.createElement('pre');pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';pre.textContent='DISPOSITIVO:\n'+JSON.stringify(localValue,null,2)+'\nCLOUD:\n'+JSON.stringify(cloudValue,null,2);
 details.append(summary,pre);wrap.append(details);resolvePanel.append(wrap);
 return ()=>select.value==='local'?localValue:cloudValue;
}
async function inspectConflict(){
 if(!currentUser||autoEnabled)return;
 resolvePanel.replaceChildren();resolveButton.disabled=true;
 try{
  const uid=currentUser.uid,remote=await getDocFromServer(doc(db,'users',uid,'data','agenda'));
  if(!remote.exists())throw Error('Non ci sono dati cloud da confrontare');
  const payload=remote.data(),cloud=payload.snapshot,local=window.agendaCloudExport();
  if(!cloud||cloud.schema!==1||!Array.isArray(cloud.entries)||!Array.isArray(local.entries))throw Error('Archivio non valido');
  const localMap=new Map(local.entries.map(x=>[x.id,x])),cloudMap=new Map(cloud.entries.map(x=>[x.id,x]));
  const ids=new Set([...localMap.keys(),...cloudMap.keys()]),choices=new Map();
  for(const id of ids){
   const a=localMap.get(id),b=cloudMap.get(id);
   if(a&&b&&stable(a)===stable(b)){choices.set(id,()=>a);continue}
   if(!a||!b){choices.set(id,()=>a||b);continue}
   choices.set(id,rowChoice('Voce: '+(a.subject||b.subject||id),a,b));
  }
  const cfg=stable(local.personalization)===stable(cloud.personalization)?()=>local.personalization:rowChoice('Personalizzazioni',local.personalization,cloud.personalization);
  const cls=stable(local.closures)===stable(cloud.closures)?()=>local.closures:rowChoice('Sospensioni scolastiche',local.closures,cloud.closures);
  const info=document.createElement('p');info.className='hint';info.textContent='Le voci presenti su un solo dispositivo vengono conservate entrambe. Per le voci con lo stesso ID ma contenuti diversi scegli quale mantenere. Le eliminazioni non vengono applicate automaticamente.';
  resolvePanel.prepend(info);
  const commit=document.createElement('button');commit.type='button';commit.textContent='Conferma unione e salva nel cloud';
  commit.addEventListener('click',async()=>{
   if(!confirm('Unire le voci selezionate e aggiornare sia il cloud sia questo dispositivo? Prima verrà creato un backup locale.'))return;
   commit.disabled=true;
   try{
    const merged={...local,entries:[...choices.values()].map(fn=>fn()),personalization:cfg(),closures:cls()};
    // Verifica il risultato prima di qualsiasi scrittura.
    if(new Blob([JSON.stringify(merged)]).size>800000)throw Error('Archivio troppo grande per Firestore');
    const ref=doc(db,'users',uid,'data','agenda');
    await runTransaction(db,async tx=>{
     const latest=await tx.get(ref),v=latest.exists()?latest.data():null;
     if(!v||stable(v.snapshot)!==stable(cloud)||Number(v.revision||0)!==Number(payload.revision||0))throw Error('Il cloud è cambiato durante il confronto. Ripeti il confronto prima di salvare.');
     tx.set(ref,{snapshot:merged,schema:1,revision:Number(v.revision||0)+1,updatedAt:serverTimestamp()});
    });
    window.agendaCloudImport(merged);
    resolvePanel.replaceChildren();autoMessage('Unione completata. Controlla i dati, poi attiva la sincronizzazione su questo dispositivo.');
   }catch(e){autoMessage('Unione non completata: '+e.message)}
   finally{commit.disabled=false}
  });
  resolvePanel.append(commit);
  autoMessage('Confronto pronto: scegli la versione da conservare per ogni voce differente.');
 }catch(e){autoMessage('Confronto non disponibile: '+(e.code||e.message))}
 finally{resolveButton.disabled=false}
}
resolveButton.addEventListener('click',inspectConflict);
